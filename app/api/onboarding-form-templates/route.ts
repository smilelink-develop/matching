import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

type QuestionInput = {
  fixedKey?: string | null;
  label?: string;
  type?: string;
  required?: boolean;
};

export async function GET() {
  try {
    const account = await requireApiAccount();
    const templates = await prisma.onboardingFormTemplate.findMany({
      where: { accountId: account.id },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ ok: true, templates });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const account = await requireApiAccount();
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
        accountId: account.id,
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
      { status: e instanceof AuthError ? e.status : 500 }
    );
  }
}
