/**
 * 履歴書系の混在した日付文字列を <input type="date"> が受け付ける
 * `YYYY-MM-DD` に正規化するパーサー。
 *
 * 受け付ける主要フォーマット:
 *   "2018年5月"            → "2018-05-01"
 *   "2018年 5月"            → "2018-05-01"
 *   "2026年3月15日"         → "2026-03-15"
 *   "2021年"                → "2021-01-01"
 *   "2017年4"  (壊れデータ)  → "2017-04-01"
 *   "9月2013年-6月2016年"   → 区切りで分けて第1セグメントを採用
 *   "2014 năm 08 tháng"     → "2014-08-01"  (ベトナム語)
 *   "Năm 2016 tháng 5"      → "2016-05-01"
 *   "2020/03/31"            → "2020-03-31"
 *   "2020-03-31"            → そのまま
 *   "現在 / 現在に至る / 現在まで" → "current" (sentinel)
 *   "" / null / undefined   → null
 */

export type FlexibleDateResult =
  | { type: "iso"; value: string }
  | { type: "current" }
  | { type: "unparseable"; raw: string }
  | null;

const FW_DIGITS: Record<string, string> = {
  "０": "0", "１": "1", "２": "2", "３": "3", "４": "4",
  "５": "5", "６": "6", "７": "7", "８": "8", "９": "9",
};

function toHalfWidth(s: string): string {
  return s.replace(/[０-９]/g, (ch) => FW_DIGITS[ch] ?? ch);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isCurrent(raw: string): boolean {
  return /(現在|至る|現在まで)/i.test(raw) || /^continuing$/i.test(raw.trim());
}

export function parseFlexibleDate(input: unknown): FlexibleDateResult {
  if (input === null || input === undefined) return null;
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    const y = input.getFullYear();
    const m = pad2(input.getMonth() + 1);
    const d = pad2(input.getDate());
    return { type: "iso", value: `${y}-${m}-${d}` };
  }
  const raw = String(input).trim();
  if (!raw) return null;

  // 「現在 / 現在に至る」系
  if (isCurrent(raw)) return { type: "current" };

  // 全角数字を半角に
  const norm = toHalfWidth(raw)
    .replace(/[　\s]+/g, " ") // 全角/半角スペース統一
    .trim();

  // ① 既に ISO (YYYY-MM-DD) or YYYY/MM/DD
  const isoMatch = norm.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (isValidYMD(y, m, d)) return { type: "iso", value: `${y}-${pad2(m)}-${pad2(d)}` };
  }

  // ② YYYY-MM or YYYY/MM
  const ymMatch = norm.match(/^(\d{4})[-\/.](\d{1,2})$/);
  if (ymMatch) {
    const y = Number(ymMatch[1]);
    const m = Number(ymMatch[2]);
    if (isValidYM(y, m)) return { type: "iso", value: `${y}-${pad2(m)}-01` };
  }

  // ③ 日本語: YYYY年MM月DD日 / YYYY年MM月 / YYYY年
  const jaYMD = norm.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/);
  if (jaYMD) {
    const y = Number(jaYMD[1]);
    const m = Number(jaYMD[2]);
    const d = Number(jaYMD[3]);
    if (isValidYMD(y, m, d)) return { type: "iso", value: `${y}-${pad2(m)}-${pad2(d)}` };
  }
  const jaYM = norm.match(/(\d{4})\s*年\s*(\d{1,2})\s*月?/);
  if (jaYM) {
    const y = Number(jaYM[1]);
    const m = Number(jaYM[2]);
    if (isValidYM(y, m)) return { type: "iso", value: `${y}-${pad2(m)}-01` };
  }
  const jaY = norm.match(/(\d{4})\s*年/);
  if (jaY) {
    const y = Number(jaY[1]);
    if (y >= 1900 && y <= 2100) return { type: "iso", value: `${y}-01-01` };
  }

  // ④ ベトナム語: "2014 năm 08 tháng" / "Năm 2016 tháng 5"
  const viYM1 = norm.match(/(\d{4})\s*năm\s*(\d{1,2})\s*tháng/i);
  if (viYM1) {
    const y = Number(viYM1[1]);
    const m = Number(viYM1[2]);
    if (isValidYM(y, m)) return { type: "iso", value: `${y}-${pad2(m)}-01` };
  }
  const viYM2 = norm.match(/năm\s*(\d{4})\s*tháng\s*(\d{1,2})/i);
  if (viYM2) {
    const y = Number(viYM2[1]);
    const m = Number(viYM2[2]);
    if (isValidYM(y, m)) return { type: "iso", value: `${y}-${pad2(m)}-01` };
  }
  // "2022 năm tháng 10" のように間に "tháng" が逆順
  const viYM3 = norm.match(/(\d{4})\s*năm\s*tháng\s*(\d{1,2})/i);
  if (viYM3) {
    const y = Number(viYM3[1]);
    const m = Number(viYM3[2]);
    if (isValidYM(y, m)) return { type: "iso", value: `${y}-${pad2(m)}-01` };
  }
  const viYOnly = norm.match(/năm\s*(\d{4})/i);
  if (viYOnly) {
    const y = Number(viYOnly[1]);
    if (y >= 1900 && y <= 2100) return { type: "iso", value: `${y}-01-01` };
  }

  // ⑤ 区切り文字 (- / 〜 / ~) で複数フィールドが連結している場合は最初のセグメントを再帰
  const splitMatch = norm.split(/[−ー〜　\-~〜−ー－]/);
  if (splitMatch.length > 1) {
    for (const seg of splitMatch) {
      const trimmed = seg.trim();
      if (!trimmed) continue;
      const r = parseFlexibleDate(trimmed);
      if (r && r.type === "iso") return r;
    }
  }

  // ⑥ 末尾の壊れデータ (例: "2017年4" → 年と月だけ)
  const fallbackY = norm.match(/^(\d{4})[^\d]+(\d{1,2})$/);
  if (fallbackY) {
    const y = Number(fallbackY[1]);
    const m = Number(fallbackY[2]);
    if (isValidYM(y, m)) return { type: "iso", value: `${y}-${pad2(m)}-01` };
  }

  // パース不能。元の文字列を残しておく
  return { type: "unparseable", raw };
}

function isValidYMD(y: number, m: number, d: number): boolean {
  return isValidYM(y, m) && d >= 1 && d <= 31;
}

function isValidYM(y: number, m: number): boolean {
  return y >= 1900 && y <= 2100 && m >= 1 && m <= 12;
}

/**
 * `<input type="date">` 用に ISO `YYYY-MM-DD` を返す簡易ラッパー。
 * パース不可 / 現在 / 空欄 はすべて null。
 */
export function toIsoDate(input: unknown): string | null {
  const r = parseFlexibleDate(input);
  return r && r.type === "iso" ? r.value : null;
}
