import { prisma } from "@/lib/prisma";
import { createSession, verifyPasscode, writeSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const loginId = String(body.loginId ?? "").trim();
    const passcode = String(body.passcode ?? "").trim();
    const nextPath = String(body.nextPath ?? "/").trim() || "/";

    if (!loginId || !passcode) {
      return Response.json(
        { ok: false, error: "ログインIDとパスコードを入力してください" },
        { status: 400 }
      );
    }

    const account = await prisma.staffAccount.findUnique({ where: { loginId } });
    if (!account || !verifyPasscode(passcode, account.passcodeHash)) {
      return Response.json(
        { ok: false, error: "ログインIDまたはパスコードが違います" },
        { status: 401 }
      );
    }

    const { token, expiresAt } = await createSession(account.id);
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
