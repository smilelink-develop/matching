import { geminiExtractSection, type GeminiSectionDebug } from "@/lib/gemini";
import type { JobSheetBenefits } from "@/lib/job-sheet/types";

const SCHEMA = `{
  "socialInsurance": "社会保険の説明 (例: '完備')",
  "payRaise": "昇給の説明 (例: '年1回 4月')",
  "holidays": "休日の説明 (例: '週休2日')",
  "paidLeave": "有給休暇の説明",
  "mealSupport": "食事支援の説明",
  "otherWelfare": "その他福利厚生"
}`;

export async function extractBenefitsSection(
  text: string
): Promise<{ data: JobSheetBenefits; debug: GeminiSectionDebug }> {
  const fallback: JobSheetBenefits = {
    socialInsurance: "",
    payRaise: "",
    holidays: "",
    paidLeave: "",
    mealSupport: "",
    otherWelfare: "",
  };
  const { data, debug } = await geminiExtractSection<Partial<JobSheetBenefits>>({
    sectionName: "benefits",
    text,
    schemaDescription: SCHEMA,
  });
  return { data: { ...fallback, ...(data ?? {}) }, debug };
}
