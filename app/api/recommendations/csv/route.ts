import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";
import { calculateAge } from "@/lib/candidate-profile";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function calcYearsSince(startDate: string | null | undefined): string {
  if (!startDate) return "";
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return "";
  const diffMs = Date.now() - start.getTime();
  const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  if (years < 0) return "";
  return years.toFixed(1);
}

export async function GET(req: Request) {
  try {
    await requireApiAccount();
    const { searchParams } = new URL(req.url);
    const dealId = Number(searchParams.get("dealId"));
    const stage = searchParams.get("stage") ?? "接続済み";
    if (!Number.isFinite(dealId)) {
      return new Response("dealId is required", { status: 400 });
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
      const sswYears = p.residenceStatus?.includes("特定技能")
        ? calcYearsSince(resume?.visaType ? resume?.visaExpiryDate : null) || ""
        : "";
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
        sswYears,
        resume?.traineeExperience ?? "",
        resume?.japaneseLevel ?? "",
        resume?.preferenceNote ?? "",
        latestResume?.documentUrl ?? "",
        p.driveFolderUrl ?? "",
      ].map(csvEscape).join(",");
    });

    // BOM を付けて Excel の文字化け回避
    const csv = "\uFEFF" + [header.map(csvEscape).join(","), ...rows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="recommendations-${dealId}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return new Response(error.message, { status: error.status });
    }
    return new Response(error instanceof Error ? error.message : "error", { status: 500 });
  }
}
