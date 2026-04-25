import * as XLSX from "xlsx";
const FILE = `${process.env.HOME}/Downloads/候補者データベース.xlsx`;
const wb = XLSX.readFile(FILE, { cellDates: true });
const ws = wb.Sheets["履歴書収集フォーム"];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) as unknown[][];
console.log("Header row 0:", rows[0]);
console.log("Row 2 (sample):");
const headerRow = (rows[0] ?? []).map((h) => (h ? String(h).replace(/\s+/g, "").replace(/\n/g, "") : null));
const sample = rows[10] ?? [];
headerRow.forEach((h, i) => {
  if (h) console.log(`  ${h} = ${sample[i] ?? "(null)"}`);
});
