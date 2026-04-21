import { requireCurrentAccount } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OnboardingFormsClient from "./OnboardingFormsClient";

export const dynamic = "force-dynamic";

function normalizeQuestionType(type: string): "text" | "file" {
  return type === "file" ? "file" : "text";
}

export default async function OnboardingFormsPage() {
  await requireCurrentAccount();
  // 初期登録フォームテンプレートは全アカウント共通
  const templates = await prisma.onboardingFormTemplate.findMany({
    include: {
      questions: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">初期登録フォーム</h1>
        <p className="mt-1 text-sm text-gray-500">
          候補者への入力依頼フォームは全アカウントで共有します。
        </p>
      </div>
      <OnboardingFormsClient
        templates={templates.map((template) => ({
          id: template.id,
          name: template.name,
          description: template.description,
          questions: template.questions.map((question) => ({
            id: question.id,
            fixedKey: question.fixedKey,
            label: question.label,
            type: normalizeQuestionType(question.type),
            required: question.required,
          })),
        }))}
      />
    </div>
  );
}
