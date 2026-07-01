/**
 * 候補者データベース.xlsx の DB シート 全列を出力して、
 * スプシ同期の列マッピング設計に使う。
 */
import "dotenv/config";
import * as XLSX from "xlsx";

const FILE =
  process.env.FILE || `${process.env.HOME}/Downloads/候補者データベース (2).xlsx`;

const wb = XLSX.readFile(FILE);
console.log("シート一覧:", wb.SheetNames.join(" | "));
console.log("");

for (const sheetName of wb.SheetNames) {
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) as unknown[][];
  // DB は 2 行目、その他は 1 行目がヘッダ
  const headerRow = sheetName === "DB" ? (rows[1] ?? []) : (rows[0] ?? []);
  const headers = (headerRow as unknown[]).map((h) => (h ? String(h).replace(/\s+/g, "").replace(/\n/g, "") : "(空)"));
  console.log(`=== ${sheetName} (全 ${headers.length} 列) ===`);
  headers.forEach((h, i) => {
    const col = String.fromCharCode(65 + (i % 26));
    const prefix = i >= 26 ? String.fromCharCode(65 + Math.floor(i / 26) - 1) : "";
    console.log(`  ${prefix}${col} (${i + 1}) : ${h}`);
  });
  console.log("");
}
