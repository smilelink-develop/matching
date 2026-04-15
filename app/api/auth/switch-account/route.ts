import { prisma } from "@/lib/prisma";
import {
  AuthError,
  createSession,
  destroyCurrentSession,
  requireApiAdmin,
  writeSessionCookie,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const admin = await requireApiAdmin();
    const body = await req.json();
    const accountId = Number(body.accountId);

    if (!Number.isFinite(accountId)) {
      return Response.json({ ok: false, error: "対象アカウントが不正です" }, { status: 400 });
    }

    const target = await prisma.staffAccount.findUnique({ where: { id: accountId } });
    if (!target) {
      return Response.json({ ok: false, error: "対象アカウントが見つかりません" }, { status: 404 });
    }

    await destroyCurrentSession();
    const { token, expiresAt } = await createSession(target.id, admin.id);
    await writeSessionCookie(token, expiresAt);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
