import { prisma } from "@/lib/prisma";

type QuestionInput = {
  fixedKey?: string | null;
  label?: string;
  type?: string;
  required?: boolean;
};

export async function GET() {
  const templates = await prisma.onboardingFormTemplate.findMany({
    include: {
      questions: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ ok: true, templates });
}

export async function POST(req: Request) {
  try {
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

    const template = await prisma.onboardingFormTemplate.create({
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
