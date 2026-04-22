import * as XLSX from "xlsx";

const file = process.env.COMPANY_XLSX || `${process.env.HOME}/Downloads/企業データベース (1).xlsx`;
const wb = XLSX.readFile(file, { cellDates: true });
const ws = wb.Sheets["企業マスタ"];
if (!ws) {
  console.error("企業マスタ sheet not found");
  process.exit(1);
}
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) as unknown[][];

const mapping: { externalId: string; name: string }[] = [];
for (let i = 1; i < rows.length; i++) {
  const row = rows[i] ?? [];
  const externalId = row[0] ? String(row[0]).trim() : "";
  const name = row[1] ? String(row[1]).trim() : "";
  if (!externalId || !name) continue;
  mapping.push({ externalId, name });
}

console.log(JSON.stringify(mapping, null, 2));
console.log("\nTOTAL:", mapping.length);
