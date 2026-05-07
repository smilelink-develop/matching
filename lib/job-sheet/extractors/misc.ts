import { geminiExtractSection, type GeminiSectionDebug } from "@/lib/gemini";
import { normalizeBool, normalizeDate } from "@/lib/job-sheet/normalize";
import type { JobSheetMisc } from "@/lib/job-sheet/types";

const SCHEMA = `{
  "trialPeriodExists": "試用期間の有無 (true/false/null)",
  "trialPeriodDetail": "試用期間の詳細 (例: '3か月、給与同条件')",
  "specialNotes": "特記事項 / 備考 (賞与・昇給・住宅費など他セクションに収まらない補足)",
  "selectionFlow": "選考フロー (例: '書類→面接→内定')",
  "salaryClosingDate": "給与締め日 (例: '末日')",
  "salaryPaymentDate": "給与支払日 (例: '翌25日')",
  "joiningDate": "入社予定日 (YYYY-MM-DD or 空)",
  "interviewDate": "面接日 (YYYY-MM-DD or 空)"
}

注意:
- 賞与・昇給・住宅費の表記が備考にしかない場合、それらは specialNotes にも入れて構わないが
  その場合 raw_candidates を含める形で残してよい。`;

export async function extractMiscSection(
  text: string
): Promise<{ data: JobSheetMisc; debug: GeminiSectionDebug }> {
  const fallback: JobSheetMisc = {
    trialPeriodExists: null,
    trialPeriodDetail: "",
    specialNotes: "",
    selectionFlow: "",
    salaryClosingDate: "",
    salaryPaymentDate: "",
    joiningDate: "",
    interviewDate: "",
  };
  const { data, debug } = await geminiExtractSection<{
    trialPeriodExists?: boolean | string | null;
    trialPeriodDetail?: string;
    specialNotes?: string;
    selectionFlow?: string;
    salaryClosingDate?: string;
    salaryPaymentDate?: string;
    joiningDate?: string;
    interviewDate?: string;
  }>({
    sectionName: "misc",
    text,
    schemaDescription: SCHEMA,
  });
  if (!data) return { data: fallback, debug };
  return {
    data: {
      trialPeriodExists:
        typeof data.trialPeriodExists === "boolean"
          ? data.trialPeriodExists
          : normalizeBool(typeof data.trialPeriodExists === "string" ? data.trialPeriodExists : null),
      trialPeriodDetail: data.trialPeriodDetail ?? "",
      specialNotes: data.specialNotes ?? "",
      selectionFlow: data.selectionFlow ?? "",
      salaryClosingDate: data.salaryClosingDate ?? "",
      salaryPaymentDate: data.salaryPaymentDate ?? "",
      joiningDate: normalizeDate(data.joiningDate),
      interviewDate: normalizeDate(data.interviewDate),
    },
    debug,
  };
}
