import { getAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import OnboardingFormsClient from "./OnboardingFormsClient";

export const dynamic = "force-dynamic";

function normalizeQuestionType(type: string): "text" | "file" {
  return type === "file" ? "file" : "text";
}

export default async function OnboardingFormsPage() {
  const [templates, settings] = await Promise.all([
    prisma.onboardingFormTemplate.findMany({
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    getAppSettings(),
  ]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">初期登録フォーム</h1>
        <p className="mt-1 text-sm text-gray-500">
          最初に必ず聞く質問は固定にして、追加質問だけテンプレート化できます。
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
