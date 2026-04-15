import { prisma } from "@/lib/prisma";
import { AuthError, hashPasscode, requireApiAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireApiAdmin();
    const body = await req.json();
    const accountId = Number(body.accountId);
    const nextPasscode = String(body.passcode ?? "").trim();

    if (!Number.isFinite(accountId) || nextPasscode.length < 6) {
      return Response.json(
        { ok: false, error: "対象アカウントと6文字以上のパスコードを入力してください" },
        { status: 400 }
      );
    }

    await prisma.staffAccount.update({
      where: { id: accountId },
      data: {
        passcodeHash: hashPasscode(nextPasscode),
        sessions: {
          deleteMany: {},
        },
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
