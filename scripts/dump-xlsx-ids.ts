import * as XLSX from "xlsx";

const FILE = process.env.FILE || `${process.env.HOME}/Downloads/候補者データベース (3).xlsx`;
const wb = XLSX.readFile(FILE);
console.log("シート一覧:", wb.SheetNames.join(" | "));
console.log("");

const sheetName = "DB";
if (!wb.Sheets[sheetName]) {
  console.log(`DB シートが見つかりません`);
  process.exit(0);
}
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, blankrows: false }) as unknown[][];
console.log(`DB 行数: ${rows.length}`);
console.log(`ヘッダ(row2):`, (rows[1] as unknown[])?.slice(0, 5));
console.log("");
console.log("=== 全 ID / カタカナ / 英語名 (row 3 以降) ===");
let count = 0;
for (let i = 2; i < rows.length; i++) {
  const r = rows[i] as unknown[];
  const id = r?.[0];
  const englishName = r?.[2];
  const kana = r?.[3];
  if (id === undefined || id === null || id === "") continue;
  count++;
  console.log(`  ${String(id).padStart(5, " ")} | ${String(kana ?? "").padEnd(20, " ")} | ${String(englishName ?? "")}`);
}
console.log(`\n合計: ${count} 件`);
