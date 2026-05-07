import { geminiExtractSection, type GeminiSectionDebug } from "@/lib/gemini";
import { normalizeShift, normalizeHours, normalizeDays, normalizeBool } from "@/lib/job-sheet/normalize";
import type { JobSheetWorkingHours, JobSheetShift } from "@/lib/job-sheet/types";

const SCHEMA = `{
  "shifts": [
    {
      "label": "勤務時間1 / 勤務時間2 / ...",
      "timeRange": "9:00〜18:00 のような文字列",
      "breakMinutes": "休憩分 (整数, 不明なら null)"
    }
  ],
  "overtimeAvailable": "残業有無 (true/false/null)",
  "averageMonthlyOvertimeHours": "月平均残業時間 (例: 2.5)",
  "fixedOvertimeHours": "固定残業時間",
  "annualHolidays": "年間休日数",
  "annualWorkingHours": "年間労働時間"
}

注意:
- shifts は最大 4 枠。空の枠は配列に含めないこと。
- 数値はできる限り number。'2.5h' → 2.5、'110日' → 110。`;

export async function extractWorkingHoursSection(
  text: string
): Promise<{ data: JobSheetWorkingHours; debug: GeminiSectionDebug }> {
  const fallback: JobSheetWorkingHours = {
    shifts: [],
    overtimeAvailable: null,
    averageMonthlyOvertimeHours: null,
    fixedOvertimeHours: null,
    annualHolidays: null,
    annualWorkingHours: null,
  };
  const { data, debug } = await geminiExtractSection<{
    shifts?: { label?: string; timeRange?: string; breakMinutes?: string | number | null }[];
    overtimeAvailable?: boolean | string | null;
    averageMonthlyOvertimeHours?: string | number | null;
    fixedOvertimeHours?: string | number | null;
    annualHolidays?: string | number | null;
    annualWorkingHours?: string | number | null;
  }>({
    sectionName: "workingHours",
    text,
    schemaDescription: SCHEMA,
  });
  if (!data) return { data: fallback, debug };

  const shifts: JobSheetShift[] =
    (data.shifts ?? []).map((s, i) => {
      const norm = normalizeShift(s.timeRange ?? "");
      return {
        label: s.label ?? `勤務時間${i + 1}`,
        timeRange: norm.timeRange,
        breakMinutes:
          typeof s.breakMinutes === "number"
            ? s.breakMinutes
            : norm.breakMinutes ?? (typeof s.breakMinutes === "string" ? Number(s.breakMinutes) || null : null),
      };
    }) ?? [];

  const numOrNull = (v: string | number | null | undefined, fn: typeof normalizeHours) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") return fn(v);
    return null;
  };

  return {
    data: {
      shifts,
      overtimeAvailable:
        typeof data.overtimeAvailable === "boolean"
          ? data.overtimeAvailable
          : normalizeBool(typeof data.overtimeAvailable === "string" ? data.overtimeAvailable : null),
      averageMonthlyOvertimeHours: numOrNull(data.averageMonthlyOvertimeHours, normalizeHours),
      fixedOvertimeHours: numOrNull(data.fixedOvertimeHours, normalizeHours),
      annualHolidays: numOrNull(data.annualHolidays, normalizeDays),
      annualWorkingHours: numOrNull(data.annualWorkingHours, normalizeHours),
    },
    debug,
  };
}
