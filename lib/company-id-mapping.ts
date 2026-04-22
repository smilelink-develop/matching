import { readFileSync } from "node:fs";
import path from "node:path";

export type CompanyIdMapping = { externalId: string; name: string };

let cached: CompanyIdMapping[] | null = null;

export function loadCompanyIdMapping(): CompanyIdMapping[] {
  if (cached) return cached;
  try {
    const file = path.join(process.cwd(), "data", "company-id-mapping.json");
    const raw = readFileSync(file, "utf-8");
    const json = JSON.parse(raw);
    if (!Array.isArray(json)) throw new Error("mapping must be array");
    cached = json as CompanyIdMapping[];
    return cached;
  } catch {
    cached = [];
    return cached;
  }
}

export function normalizeCompanyName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "")
    .replace(/株式会社|有限会社|合同会社|合名会社|医療法人|社会福祉法人/g, "")
    .toLowerCase();
}

/**
 * DB の companyName から外部IDを探す。完全一致→部分一致 の順。
 */
export function findExternalIdByName(companyName: string): string | null {
  const mapping = loadCompanyIdMapping();
  const needle = normalizeCompanyName(companyName);
  const exact = mapping.find((entry) => normalizeCompanyName(entry.name) === needle);
  if (exact) return exact.externalId;
  const partial = mapping.find((entry) => {
    const n = normalizeCompanyName(entry.name);
    return n.includes(needle) || needle.includes(n);
  });
  return partial?.externalId ?? null;
}

/**
 * externalId を「数値部分 + サフィックス」でソートする比較関数。
 * 02sv, 14sv, 29ky, AD などが自然順に並ぶようにする。
 * null/undefined は最後。
 */
export function compareExternalId(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const numA = parseInt(a.replace(/[^\d]/g, ""), 10);
  const numB = parseInt(b.replace(/[^\d]/g, ""), 10);
  if (Number.isFinite(numA) && Number.isFinite(numB) && numA !== numB) {
    return numA - numB;
  }
  return a.localeCompare(b);
}
