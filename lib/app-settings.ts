import { prisma } from "@/lib/prisma";

export type FixedQuestionSetting = {
  fixedKey: string;
  label: string;
  type: "text" | "file";
  required: boolean;
};

export const DEFAULT_FIXED_QUESTIONS: FixedQuestionSetting[] = [
  { fixedKey: "name", label: "カタカナ名", type: "text", required: true },
  { fixedKey: "englishName", label: "英語名", type: "text", required: false },
  { fixedKey: "birthDate", label: "生年月日", type: "text", required: true },
  { fixedKey: "phoneNumber", label: "電話番号", type: "text", required: false },
  { fixedKey: "postalCode", label: "郵便番号", type: "text", required: false },
  { fixedKey: "address", label: "住所", type: "text", required: true },
  { fixedKey: "photoUrl", label: "顔写真", type: "file", required: false },
  { fixedKey: "residence-card", label: "在留カード", type: "file", required: true },
  { fixedKey: "certificate", label: "合格書", type: "file", required: true },
];

export function normalizeFixedQuestions(value: unknown): FixedQuestionSetting[] {
  if (!Array.isArray(value)) return DEFAULT_FIXED_QUESTIONS;

  const normalized = value
    .map((question) => {
      if (!question || typeof question !== "object") return null;
      const entry = question as Record<string, unknown>;
      const fixedKey = String(entry.fixedKey ?? "").trim();
      const label = String(entry.label ?? "").trim();
      if (!fixedKey || !label) return null;

      return {
        fixedKey,
        label,
        type: entry.type === "file" ? "file" : "text",
        required: Boolean(entry.required),
      } satisfies FixedQuestionSetting;
    })
    .filter((question): question is FixedQuestionSetting => Boolean(question));

  return normalized.length > 0 ? normalized : DEFAULT_FIXED_QUESTIONS;
}

export async function getAccountSettings(accountId: number) {
  const settings = await prisma.appSettings.findUnique({
    where: { accountId },
  });

  return {
    calendarEmbedUrl: settings?.calendarEmbedUrl ?? "",
    calendarLabel: settings?.calendarLabel ?? "",
  };
}

export async function getCoreSettings() {
  const settings = await prisma.coreSettings.findUnique({
    where: { id: 1 },
  });

  // 動的 import で循環参照を避ける (lib/recommendation-columns には Prisma 依存なし)
  const { sanitizeRecommendationColumns } = await import("@/lib/recommendation-columns");

  return {
    fixedQuestions: normalizeFixedQuestions(settings?.fixedQuestions),
    recommendationColumns: sanitizeRecommendationColumns(settings?.recommendationColumns),
    monthlyOfferTarget: settings?.monthlyOfferTarget ?? null,
    monthlyRevenueTarget: settings?.monthlyRevenueTarget ?? null,
  };
}
