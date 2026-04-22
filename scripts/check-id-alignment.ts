import "dotenv/config";
import * as XLSX from "xlsx";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "../lib/database-url";

const CANDIDATE_FILE = process.env.CANDIDATE_XLSX || `${process.env.HOME}/Downloads/候補者データベース.xlsx`;
const adapter = new PrismaPg({ connectionString: getDatabaseUrl()! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const wb = XLSX.readFile(CANDIDATE_FILE, { cellDates: true });
  const ws = wb.Sheets["DB"];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }) as unknown[][];

  // xlsx の候補者一覧
  const xlsxEntries: { xlsxId: string; kanaName: string; englishName: string }[] = [];
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const id = row[0] != null ? String(row[0]).trim() : "";
    const englishName = row[2] != null ? String(row[2]).trim() : "";
    const kanaName = row[3] != null ? String(row[3]).trim() : "";
    if (!id || !kanaName) continue;
    xlsxEntries.push({ xlsxId: id, kanaName, englishName });
  }

  const persons = await prisma.person.findMany({
    orderBy: { id: "asc" },
    include: { onboarding: true },
  });

  console.log(`xlsx データ: ${xlsxEntries.length} 件 / DB データ: ${persons.length} 件\n`);

  // マッチング確認
  let mismatch = 0;
  const limit = Math.max(xlsxEntries.length, persons.length);
  console.log("xlsxID | DB.id | 一致 | カタカナ名 (xlsx) | カタカナ名 (DB)");
  console.log("-------|-------|------|-------------------|------------------");
  for (let i = 0; i < Math.min(limit, 15); i++) {
    const xe = xlsxEntries[i];
    const p = persons[i];
    const xlsxId = xe?.xlsxId ?? "-";
    const dbId = p?.id ?? "-";
    const match = xe && p && String(p.id) === String(xe.xlsxId) ? "✓" : "✗";
    if (match === "✗") mismatch++;
    console.log(
      `${xlsxId.padEnd(6)} | ${String(dbId).padEnd(5)} | ${match}   | ${(xe?.kanaName ?? "-").padEnd(18)} | ${p?.name ?? "-"}`
    );
  }
  console.log(`\n上位15件中、不一致: ${mismatch} 件`);

  // 不一致が発生する最初の位置を特定
  console.log("\n=== 不一致が始まる位置 ===");
  let found = 0;
  for (let i = 0; i < Math.min(xlsxEntries.length, persons.length); i++) {
    if (String(persons[i].id) !== String(xlsxEntries[i].xlsxId)) {
      if (found < 10) {
        console.log(`i=${i}: xlsxID=${xlsxEntries[i].xlsxId}, DB.id=${persons[i].id}, xlsx名=${xlsxEntries[i].kanaName}, DB名=${persons[i].name}`);
      }
      found++;
    }
  }

  // xlsx ID の歯抜けを確認
  const xlsxIds = xlsxEntries.map((e) => Number(e.xlsxId)).filter((n) => Number.isFinite(n));
  const maxXlsxId = Math.max(...xlsxIds);
  const missingIds: number[] = [];
  for (let i = 1; i <= maxXlsxId; i++) {
    if (!xlsxIds.includes(i)) missingIds.push(i);
  }
  console.log(`\nxlsx ID の最大: ${maxXlsxId}, 歯抜けID: ${missingIds.slice(0, 20).join(", ")}${missingIds.length > 20 ? " ..." : ""} (計 ${missingIds.length} 件)`);
}

main().finally(() => prisma.$disconnect());
