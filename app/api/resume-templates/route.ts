import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const account = await requireApiAccount();
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const templateUrl = String(body.templateUrl ?? "").trim();
    const driveFolderUrl = String(body.driveFolderUrl ?? "").trim();

    if (!name || !templateUrl || !driveFolderUrl) {
      return Response.json(
        { ok: false, error: "テンプレート名、Docs URL、Drive URL を入力してください" },
        { status: 400 }
      );
    }

    const template = await prisma.resumeTemplate.create({
      data: {
        accountId: account.id,
        name,
        templateUrl,
        driveFolderUrl,
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
