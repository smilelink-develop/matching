import { prisma } from "@/lib/prisma";
import { createSession, writeSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const nextPath = typeof body?.nextPath === "string" ? body.nextPath : "/";

    // 最初の管理者アカウントを取得(運用上 tsuchida を先頭で作成済み想定)
    const admin = await prisma.staffAccount.findFirst({
      where: { role: "admin" },
      orderBy: { id: "asc" },
    });

    if (!admin) {
      return Response.json(
        { ok: false, error: "管理者アカウントが存在しません" },
        { status: 404 }
      );
    }

    const { token, expiresAt } = await createSession(admin.id);
    await writeSessionCookie(token, expiresAt);

    return Response.json({
      ok: true,
      nextPath: nextPath.startsWith("/") ? nextPath : "/",
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: 500 }
    );
  }
}
