export const SSW_INDUSTRIES = [
  "介護",
  "ビルクリーニング",
  "素形材・産業機械・電気電子情報関連製造業",
  "建設",
  "造船・舶用工業",
  "自動車整備",
  "航空",
  "宿泊",
  "農業",
  "漁業",
  "飲食料品製造業",
  "外食業",
  "自動車運送業",
  "鉄道",
  "林業",
  "木材産業",
] as const;

export const HIRING_STATUSES = ["募集中", "至急募集", "面接中", "成約", "停止"] as const;

export type SswIndustry = (typeof SSW_INDUSTRIES)[number];
export type HiringStatus = (typeof HIRING_STATUSES)[number];
