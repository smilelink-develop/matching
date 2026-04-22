import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

export async function GET() {
  try {
    await requireApiAccount();
    const templates = await prisma.resumeTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ ok: true, templates });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const account = await requireApiAccount();
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const templateUrl = String(body.templateUrl ?? "").trim();
    const driveFolderUrl = String(body.driveFolderUrl ?? "").trim();

    if (!name || !templateUrl) {
      return Response.json(
        { ok: false, error: "テンプレート名、Docs URL を入力してください" },
        { status: 400 }
      );
    }

    // 作成者を記録するが、データは全アカウント共有
    // driveFolderUrl は任意 (保存先は候補者フォルダを自動選択)
    const template = await prisma.resumeTemplate.create({
      data: {
        accountId: account.id,
        name,
        templateUrl,
        driveFolderUrl: driveFolderUrl || null,
      },
    });

    return Response.json({ ok: true, template });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
