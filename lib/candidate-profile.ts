export const NATIONALITIES = ["ベトナム", "インドネシア", "ミャンマー", "フィリピン", "タイ", "その他"];

export const RESIDENCE_STATUSES = ["技能実習", "特定技能1号", "特定技能2号", "技術・人文知識・国際業務"];

export const CHANNELS = [
  { value: "LINE", label: "LINE" },
  { value: "Messenger", label: "Messenger" },
  { value: "mail", label: "メール" },
  { value: "WhatsApp", label: "WhatsApp" },
];

export const GENDERS = ["男性", "女性", "その他"];

export const BASIC_DOCUMENTS = [
  { kind: "residence-card", label: "在留カード" },
] as const;

export const TOKUTEI_DOCUMENTS = [
  { kind: "designation-letter", label: "指定書の写真" },
  { kind: "skill-test-certificate", label: "技能検定の合格証" },
] as const;

export function getDocumentDefinitions(residenceStatus: string) {
  if (residenceStatus === "特定技能1号") {
    return [...BASIC_DOCUMENTS, ...TOKUTEI_DOCUMENTS];
  }
  return [...BASIC_DOCUMENTS];
}

export function calculateAge(birthDate?: string | null) {
  if (!birthDate) return "";
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthPassed =
    now.getMonth() > date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate());
  if (!monthPassed) age -= 1;
  return String(age);
}

export type WorkHistoryEntry = {
  companyName: string;
  startDate: string;
  endDate: string;
  reason: string;
};

export function normalizeWorkHistories(value: unknown): WorkHistoryEntry[] {
  if (!Array.isArray(value)) return [];

  return value.map((entry) => {
    const current = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
    return {
      companyName: String(current.companyName ?? current.label ?? ""),
      startDate: String(current.startDate ?? current.date ?? ""),
      endDate: String(current.endDate ?? ""),
      reason: String(current.reason ?? current.result ?? ""),
    };
  });
}
