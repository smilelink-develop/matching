import { getCoreSettings } from "@/lib/app-settings";
import { requireCurrentAccount } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OnboardingFormsClient from "./OnboardingFormsClient";

export const dynamic = "force-dynamic";

function normalizeQuestionType(type: string): "text" | "file" {
  return type === "file" ? "file" : "text";
}

export default async function OnboardingFormsPage() {
  const account = await requireCurrentAccount();
  const [templates, settings] = await Promise.all([
    prisma.onboardingFormTemplate.findMany({
      where: { accountId: account.id },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    getCoreSettings(),
  ]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">初期登録フォーム</h1>
        <p className="mt-1 text-sm text-gray-500">
          {account.name}さん用の依頼フォームを作成します。固定質問は共通、追加質問はアカウント単位で管理できます。
        </p>
      </div>
      <OnboardingFormsClient
        fixedQuestionDefaults={settings.fixedQuestions}
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
