import { geminiExtractSection, type GeminiSectionDebug } from "@/lib/gemini";
import { normalizeYen, normalizeBool } from "@/lib/job-sheet/normalize";
import type { JobSheetHousing } from "@/lib/job-sheet/types";

const SCHEMA = `{
  "dormitoryAvailable": "寮の有無 true/false/null",
  "dormitoryCost": "月額寮費 (整数 円, 不明なら null)",
  "maxPeoplePerRoom": "1 部屋あたり最大人数 (整数)",
  "sharedRoomsAvailable": "相部屋の有無 true/false/null",
  "equipment": "提供される設備の配列 (例: ['エアコン','洗濯機','冷蔵庫','寝具'])",
  "commuteMethod": "通勤方法 (例: '徒歩', '自転車', '車')",
  "commuteMinutesFromHome": "自宅から職場までの分数 (整数)"
}

注意:
- 住宅費 / 食費 / 光熱費 等は deductions セクションでも扱うが、寮全体の費用や設備はここに集約。`;

export async function extractHousingSection(
  text: string
): Promise<{ data: JobSheetHousing; debug: GeminiSectionDebug }> {
  const fallback: JobSheetHousing = {
    dormitoryAvailable: null,
    dormitoryCost: null,
    maxPeoplePerRoom: null,
    sharedRoomsAvailable: null,
    equipment: [],
    commuteMethod: "",
    commuteMinutesFromHome: null,
  };
  const { data, debug } = await geminiExtractSection<{
    dormitoryAvailable?: boolean | string | null;
    dormitoryCost?: string | number | null;
    maxPeoplePerRoom?: string | number | null;
    sharedRoomsAvailable?: boolean | string | null;
    equipment?: string[];
    commuteMethod?: string;
    commuteMinutesFromHome?: string | number | null;
  }>({
    sectionName: "housing",
    text,
    schemaDescription: SCHEMA,
  });
  if (!data) return { data: fallback, debug };

  const num = (v: string | number | null | undefined): number | null => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const m = v.match(/-?\d+(\.\d+)?/);
      return m ? Number(m[0]) : null;
    }
    return null;
  };
  const bool = (v: boolean | string | null | undefined): boolean | null => {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return normalizeBool(v);
    return null;
  };

  return {
    data: {
      dormitoryAvailable: bool(data.dormitoryAvailable),
      dormitoryCost:
        typeof data.dormitoryCost === "number"
          ? data.dormitoryCost
          : normalizeYen(typeof data.dormitoryCost === "string" ? data.dormitoryCost : null),
      maxPeoplePerRoom: num(data.maxPeoplePerRoom),
      sharedRoomsAvailable: bool(data.sharedRoomsAvailable),
      equipment: Array.isArray(data.equipment) ? data.equipment.filter((v) => typeof v === "string") : [],
      commuteMethod: data.commuteMethod ?? "",
      commuteMinutesFromHome: num(data.commuteMinutesFromHome),
    },
    debug,
  };
}
