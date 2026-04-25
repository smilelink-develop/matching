/**
 * 候補者データベース.xlsx の DB シート + 履歴書収集フォームシートを
 * data/candidates-master.json に書き出す。
 * (Railway 上の admin endpoint がこの JSON を読んで欠損補完する)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

const FILE = process.env.CANDIDATE_XLSX || `${process.env.HOME}/Downloads/候補者データベース.xlsx`;
const OUT = path.join(process.cwd(), "data", "candidates-master.json");

function s(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length === 0 ? null : str;
}

function dStr(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  const str = s(value);
  if (!str) return null;
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return str;
}

function readSheet(filePath: string, sheetName: string): unknown[][] {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) as unknown[][];
}

function rowToRecord(headers: (string | null)[], row: unknown[]): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  headers.forEach((h, i) => {
    if (h) record[h.replace(/\s+/g, "").replace(/\n/g, "")] = row[i] ?? null;
  });
  return record;
}

type CandidateMasterRow = {
  id: number;
  englishName: string | null;
  katakanaName: string | null;
  partner: string | null;
  nationality: string | null;
  residenceStatus: string | null;
  birthDate: string | null;
  postalCode: string | null;
  prefecture: string | null;
  address: string | null;
  driveFolderUrl: string | null;
  gender: string | null;
  visaExpiryDate: string | null;
  japaneseLevel: string | null;
  traineeExperience: string | null;
  preferenceNote: string | null;
  field: string | null;
};

type CandidateFormRow = {
  katakanaName: string | null;
  englishName: string | null;
  birthDate: string | null;
  gender: string | null;
  spouseStatus: string | null;
  childrenCount: string | null;
  postalCode: string | null;
  address: string | null;
  phoneNumber: string | null;
  email: string | null;
  highSchoolName: string | null;
  highSchoolStartDate: string | null;
  highSchoolEndDate: string | null;
  licenseName: string | null;
  licenseExpiryDate: string | null;
  qualification1: string | null;
  qualificationDate1: string | null;
  motivation: string | null;
  selfIntroduction: string | null;
  japanPurpose: string | null;
  currentJob: string | null;
  retirementReason: string | null;
  workExperiences: { companyName: string; startDate: string; endDate: string; reason: string }[];
  photoUrl: string | null;
  driveFolderUrl: string | null;
};

function main() {
  // DB シート
  const dbRows = readSheet(FILE, "DB");
  const dbHeaderRow = (dbRows[1] ?? []) as unknown[];
  const dbHeaders = dbHeaderRow.map((h) => (h ? String(h).replace(/\s+/g, "").replace(/\n/g, "") : null));
  const masterById = new Map<number, CandidateMasterRow>();
  for (let i = 2; i < dbRows.length; i++) {
    const rec = rowToRecord(dbHeaders, dbRows[i]);
    const id = Number(s(rec["ID"]));
    if (!Number.isFinite(id) || id <= 0) continue;
    const row: CandidateMasterRow = {
      id,
      englishName: s(rec["候補者名"]),
      katakanaName: s(rec["カタカナ名"]),
      partner: s(rec["パートナー"]),
      nationality: s(rec["国籍"]),
      residenceStatus: s(rec["在留資格"]),
      birthDate: dStr(rec["生年月日"]),
      postalCode: s(rec["郵便番号"]),
      prefecture: s(rec["都道府県"]),
      address: s(rec["現住所"]),
      driveFolderUrl: s(rec["書類フォルダリンク"]),
      gender: s(rec["性別"]),
      visaExpiryDate: dStr(rec["ビザ期限"]),
      japaneseLevel: s(rec["日本語レベル"]),
      traineeExperience: s(rec["実習経験有無"]),
      preferenceNote: s(rec["現職の手取り額"]),
      field: s(rec["分野"]),
    };
    masterById.set(id, row);
  }

  // 履歴書収集フォーム (カタカナ名で照合)
  const formRows = readSheet(FILE, "履歴書収集フォーム");
  const formHeaderRow = (formRows[0] ?? []) as unknown[];
  const formHeaders = formHeaderRow.map((h) => (h ? String(h).replace(/\s+/g, "").replace(/\n/g, "") : null));
  const formByKana = new Map<string, CandidateFormRow>();
  for (let i = 2; i < formRows.length; i++) {
    const rec = rowToRecord(formHeaders, formRows[i]);
    const kana = s(rec["カタカナ名"]);
    if (!kana) continue;
    const works: { companyName: string; startDate: string; endDate: string; reason: string }[] = [];
    for (let n = 1; n <= 4; n++) {
      const companyName = s(rec[`会社名${n}`]);
      if (!companyName) continue;
      works.push({
        companyName,
        startDate: dStr(rec[`入社${n}`]) ?? "",
        endDate: dStr(rec[`退社${n}`]) ?? "",
        reason: "",
      });
    }
    formByKana.set(kana, {
      katakanaName: kana,
      englishName: s(rec["英語名"]),
      birthDate: dStr(rec["生年月日"]),
      gender: s(rec["性別"]),
      spouseStatus: s(rec["配偶者"]),
      childrenCount: s(rec["子供"]),
      postalCode: s(rec["郵便番号"]),
      address: s(rec["現住所"]),
      phoneNumber: s(rec["電話"]),
      email: s(rec["メール"]),
      highSchoolName: s(rec["高校名"]),
      highSchoolStartDate: dStr(rec["入学"]),
      highSchoolEndDate: dStr(rec["卒業"]),
      licenseName: s(rec["免許"]),
      licenseExpiryDate: dStr(rec["免許年"]),
      qualification1: s(rec["資格1"]),
      qualificationDate1: dStr(rec["資格年1"]),
      motivation: s(rec["志望動機"]),
      selfIntroduction: s(rec["自己紹介"]),
      japanPurpose: s(rec["来日目的"]),
      currentJob: s(rec["現在の仕事"]),
      retirementReason: s(rec["退職理由"]),
      workExperiences: works,
      photoUrl: s(rec["顔写真"]),
      driveFolderUrl: s(rec["応募者フォルダURL"]),
    });
  }

  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify(
      {
        master: Array.from(masterById.values()),
        formByKana: Object.fromEntries(formByKana),
      },
      null,
      2
    )
  );
  console.log(`✅ ${OUT} に master ${masterById.size} 件 / form ${formByKana.size} 件を出力`);
}

main();
