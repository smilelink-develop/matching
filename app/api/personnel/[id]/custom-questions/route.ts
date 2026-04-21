import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    const questions = await prisma.personCustomQuestion.findMany({
      where: { personId: Number(id) },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });
    return Response.json({ ok: true, questions });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    const body = await req.json();
    const label = String(body?.label ?? "").trim();
    if (!label) {
      return Response.json({ ok: false, error: "質問を入力してください" }, { status: 400 });
    }
    const personId = Number(id);
    const last = await prisma.personCustomQuestion.findFirst({
      where: { personId },
      orderBy: { sortOrder: "desc" },
    });
    const question = await prisma.personCustomQuestion.create({
      data: {
        personId,
        label,
        required: Boolean(body?.required ?? false),
        answer: body?.answer ? String(body.answer) : null,
        sortOrder: (last?.sortOrder ?? 0) + 1,
      },
    });
    return Response.json({ ok: true, question });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
