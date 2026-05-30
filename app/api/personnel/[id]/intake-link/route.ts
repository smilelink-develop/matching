import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";
import { randomBytes } from "node:crypto";

function generateToken(): string {
  // 32 文字の URL-safe トークン
  return randomBytes(24).toString("base64url");
}

/** POST: 候補者の intake トークンを発行 (既存があれば再利用、?regenerate=1 で再発行) */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAccount();
    const { id } = await ctx.params;
    const personId = Number(id);
    if (!Number.isFinite(personId)) {
      return Response.json({ ok: false, error: "personId が不正です" }, { status: 400 });
    }
    const url = new URL(req.url);
    const regenerate = url.searchParams.get("regenerate") === "1";

    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: { id: true, intakeToken: true },
    });
    if (!person) {
      return Response.json({ ok: false, error: "候補者が見つかりません" }, { status: 404 });
    }

    let token = person.intakeToken;
    if (!token || regenerate) {
      token = generateToken();
      await prisma.person.update({ where: { id: personId }, data: { intakeToken: token } });
    }
    return Response.json({ ok: true, token, path: `/intake/${token}` });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
