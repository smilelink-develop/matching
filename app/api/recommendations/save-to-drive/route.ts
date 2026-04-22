import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";
import { calculateAge } from "@/lib/candidate-profile";
import { ensureCompanyDriveFolder } from "@/lib/google-docs";
import { google } from "googleapis";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function POST(req: Request) {
  try {
    await requireApiAccount();
    const body = await req.json();
    const dealId = Number(body?.dealId);
    const stage = String(body?.stage ?? "接続済み");
    if (!Number.isFinite(dealId)) {
      return Response.json({ ok: false, error: "dealId が必要です" }, { status: 400 });
    }

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { company: true },
    });
    if (!deal) {
      return Response.json({ ok: false, error: "案件が見つかりません" }, { status: 404 });
    }

    const candidates = await prisma.dealCandidate.findMany({
      where: {
        dealId,
        ...(stage === "all" ? {} : { stage }),
      },
      include: {
        person: {
          include: {
            onboarding: true,
            resumeProfile: true,
            resumeDocuments: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const header = [
      "ID",
      "追加日付",
      "候補者名",
      "カタカナ名",
      "状況",
      "性別",
      "年齢",
      "国籍",
      "在留資格",
      "現住所",
      "生年月日",
      "ビザ期限",
      "特定技能経過年数",
      "実習経験有無",
      "日本語レベル",
      "現職の手取り額",
      "履歴書",
      "書類フォルダ",
    ];
    const rows = candidates.map((candidate) => {
      const p = candidate.person;
      const onboarding = p.onboarding;
      const resume = p.resumeProfile;
      const latestResume = p.resumeDocuments[0] ?? null;
      return [
        p.id,
        candidate.createdAt.toISOString().slice(0, 10),
        onboarding?.englishName ?? "",
        p.name,
        candidate.stage,
        resume?.gender ?? "",
        calculateAge(onboarding?.birthDate ?? null) || "",
        p.nationality,
        p.residenceStatus,
        onboarding?.address ?? "",
        onboarding?.birthDate ?? "",
        resume?.visaExpiryDate ?? "",
        "",
        resume?.traineeExperience ?? "",
        resume?.japaneseLevel ?? "",
        resume?.preferenceNote ?? "",
        latestResume?.documentUrl ?? "",
        p.driveFolderUrl ?? "",
      ].map(csvEscape).join(",");
    });
    const csv = "\uFEFF" + [header.map(csvEscape).join(","), ...rows].join("\n");

    // 企業フォルダを確保
    const folder = await ensureCompanyDriveFolder({
      existingFolderUrl: deal.company.driveFolderUrl,
      externalId: deal.company.externalId,
      companyName: deal.company.name,
    });

    // 企業に driveFolderUrl が未設定だったら今回見つけたものを保存
    if (!deal.company.driveFolderUrl) {
      await prisma.company.update({
        where: { id: deal.company.id },
        data: { driveFolderUrl: folder.folderUrl },
      });
    }

    // CSV をアップロード
    const authKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
    const authEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
    if (!authKey || !authEmail) {
      return Response.json({ ok: false, error: "GOOGLE_SERVICE_ACCOUNT_* が未設定です" }, { status: 500 });
    }
    const auth = new google.auth.JWT({
      email: authEmail,
      key: authKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    await auth.authorize();
    const drive = google.drive({ version: "v3", auth });

    const date = new Date().toISOString().slice(0, 10);
    const safeTitle = deal.title.replace(/[\\/:*?"<>|]/g, "");
    const fileName = `${date}_${safeTitle}_推薦リスト.csv`;

    const buffer = Buffer.from(csv, "utf-8");
    // googleapis expects a Readable or a string, pass Buffer via a simple stream
    const { Readable } = await import("node:stream");
    const created = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: fileName,
        parents: [folder.folderId!],
        mimeType: "text/csv",
      },
      media: {
        mimeType: "text/csv",
        body: Readable.from(buffer),
      },
      fields: "id,webViewLink,name",
    });

    return Response.json({
      ok: true,
      fileName: created.data.name,
      fileUrl: created.data.webViewLink,
      folderUrl: folder.folderUrl,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
