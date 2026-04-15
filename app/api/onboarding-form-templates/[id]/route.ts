import { prisma } from "@/lib/prisma";

type QuestionInput = {
  fixedKey?: string | null;
  label?: string;
  type?: string;
  required?: boolean;
};

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const templateId = Number(id);
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const fixedQuestions = Array.isArray(body.fixedQuestions) ? body.fixedQuestions : [];
    const questions = Array.isArray(body.questions) ? body.questions : [];

    if (!name) {
      return Response.json({ ok: false, error: "フォーム名を入力してください" }, { status: 400 });
    }

    const sanitizedFixedQuestions = fixedQuestions
      .map((question: QuestionInput, index: number) => ({
        fixedKey: String(question.fixedKey ?? "").trim(),
        label: String(question.label ?? "").trim(),
        type: question.type === "file" ? "file" : "text",
        required: Boolean(question.required),
        sortOrder: index,
      }))
      .filter((question: { fixedKey: string; label: string }) => question.fixedKey && question.label);

    const sanitizedQuestions = questions
      .map((question: QuestionInput, index: number) => ({
        fixedKey: null,
        label: String(question.label ?? "").trim(),
        type: question.type === "file" ? "file" : "text",
        required: Boolean(question.required),
        sortOrder: sanitizedFixedQuestions.length + index,
      }))
      .filter((question: { label: string }) => question.label);

    await prisma.onboardingFormQuestion.deleteMany({
      where: { templateId },
    });

    const template = await prisma.onboardingFormTemplate.update({
      where: { id: templateId },
      data: {
        name,
        description: description || null,
        questions: {
          create: [...sanitizedFixedQuestions, ...sanitizedQuestions],
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
      { status: 500 }
    );
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.onboardingFormTemplate.delete({
      where: { id: Number(id) },
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
