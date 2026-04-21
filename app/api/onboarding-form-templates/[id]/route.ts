import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

type QuestionInput = {
  label?: string;
  type?: string;
  required?: boolean;
};

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const account = await requireApiAccount();
    const { id } = await params;
    const templateId = Number(id);
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const questions = Array.isArray(body.questions) ? body.questions : [];

    if (!name) {
      return Response.json({ ok: false, error: "フォーム名を入力してください" }, { status: 400 });
    }

    const sanitizedQuestions = questions
      .map((question: QuestionInput, index: number) => ({
        fixedKey: null,
        label: String(question.label ?? "").trim(),
        type: question.type === "file" ? "file" : "text",
        required: Boolean(question.required),
        sortOrder: index,
      }))
      .filter((question: { label: string }) => question.label);

    // テンプレートは全アカウントで共有
    const existing = await prisma.onboardingFormTemplate.findFirst({
      where: { id: templateId },
      select: { id: true },
    });

    if (!existing) {
      return Response.json({ ok: false, error: "フォームが見つかりません" }, { status: 404 });
    }

    await prisma.onboardingFormQuestion.deleteMany({
      where: { templateId: existing.id },
    });

    const template = await prisma.onboardingFormTemplate.update({
      where: { id: existing.id },
      data: {
        name,
        description: description || null,
        questions: {
          create: sanitizedQuestions,
        },
      },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return Response.json({ ok: true, template });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: e instanceof AuthError ? e.status : 500 }
    );
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApiAccount();
    const { id } = await params;
    await prisma.onboardingFormTemplate.delete({
      where: { id: Number(id) },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: e instanceof AuthError ? e.status : 500 }
    );
  }
}
