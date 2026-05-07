/**
 * resumeProfile に保存された日付文字列を <input type="date"> が
 * 受け付ける ISO `YYYY-MM-DD` 形式に正規化する一発マイグレーション。
 *
 * 対象フィールド:
 *   - highSchoolStartDate / highSchoolEndDate
 *   - universityStartDate / universityEndDate
 *   - workExperiences[].startDate / endDate
 *
 * 「現在に至る」は workExperience の場合 endDate を空文字にし、
 * reason に「現在に至る」を入れる (UI で在職中表示にできる)。
 * 学校系では「現在」は通常入らないので、空文字にしてスキップ。
 *
 * Dry-run:
 *   DRY_RUN=1 npx tsx scripts/normalize-resume-dates.ts
 *
 * 本番反映:
 *   npx tsx scripts/normalize-resume-dates.ts
 */

import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "../lib/database-url";
import { parseFlexibleDate } from "../lib/flexible-date";

const cs = getDatabaseUrl();
if (!cs) throw new Error("DATABASE_URL is not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: cs }) });
const DRY_RUN = process.env.DRY_RUN === "1";

type ConvertResult = { value: string | null; changed: boolean };

function convertSchoolDate(raw: string | null): ConvertResult {
  if (!raw) return { value: raw ?? null, changed: false };
  const r = parseFlexibleDate(raw);
  if (!r) return { value: null, changed: raw !== null };
  if (r.type === "iso") return { value: r.value, changed: r.value !== raw };
  if (r.type === "current") return { value: null, changed: true }; // 学校では「現在」は意味なし
  return { value: raw, changed: false }; // unparseable は保持
}

type WorkOut = {
  changed: boolean;
  endDate: string;
  reason: string;
};

function convertWorkEnd(rawEnd: string, rawReason: string): WorkOut {
  if (!rawEnd) return { changed: false, endDate: "", reason: rawReason };
  const r = parseFlexibleDate(rawEnd);
  if (!r) return { changed: false, endDate: "", reason: rawReason };
  if (r.type === "iso") return { changed: r.value !== rawEnd, endDate: r.value, reason: rawReason };
  if (r.type === "current") {
    const reason = rawReason && rawReason.trim() ? rawReason : "現在に至る";
    return { changed: rawEnd !== "" || reason !== rawReason, endDate: "", reason };
  }
  return { changed: false, endDate: rawEnd, reason: rawReason };
}

function convertWorkStart(rawStart: string): { value: string; changed: boolean } {
  if (!rawStart) return { value: "", changed: false };
  const r = parseFlexibleDate(rawStart);
  if (!r) return { value: "", changed: rawStart !== "" };
  if (r.type === "iso") return { value: r.value, changed: r.value !== rawStart };
  if (r.type === "current") return { value: "", changed: true };
  return { value: rawStart, changed: false };
}

async function main() {
  console.log(`== resumeProfile 日付正規化 ${DRY_RUN ? "(DRY-RUN)" : ""} ==`);
  const profiles = await prisma.resumeProfile.findMany({
    select: {
      personId: true,
      highSchoolStartDate: true,
      highSchoolEndDate: true,
      universityStartDate: true,
      universityEndDate: true,
      workExperiences: true,
    },
  });
  console.log(`  対象 resumeProfile: ${profiles.length} 件`);

  let updated = 0;
  let schoolFieldsConverted = 0;
  let workEntriesConverted = 0;
  const samples: string[] = [];

  for (const p of profiles) {
    const data: Record<string, unknown> = {};
    let dirty = false;

    const hsStart = convertSchoolDate(p.highSchoolStartDate);
    if (hsStart.changed) {
      data.highSchoolStartDate = hsStart.value;
      dirty = true;
      schoolFieldsConverted++;
      if (samples.length < 8) samples.push(`person ${p.personId} hs.start: "${p.highSchoolStartDate}" → "${hsStart.value}"`);
    }
    const hsEnd = convertSchoolDate(p.highSchoolEndDate);
    if (hsEnd.changed) {
      data.highSchoolEndDate = hsEnd.value;
      dirty = true;
      schoolFieldsConverted++;
      if (samples.length < 8) samples.push(`person ${p.personId} hs.end: "${p.highSchoolEndDate}" → "${hsEnd.value}"`);
    }
    const uStart = convertSchoolDate(p.universityStartDate);
    if (uStart.changed) {
      data.universityStartDate = uStart.value;
      dirty = true;
      schoolFieldsConverted++;
    }
    const uEnd = convertSchoolDate(p.universityEndDate);
    if (uEnd.changed) {
      data.universityEndDate = uEnd.value;
      dirty = true;
      schoolFieldsConverted++;
    }

    if (Array.isArray(p.workExperiences)) {
      const works = p.workExperiences as Array<Record<string, unknown>>;
      let workDirty = false;
      const newWorks = works.map((w) => {
        const startRaw = String(w?.startDate ?? "");
        const endRaw = String(w?.endDate ?? "");
        const reasonRaw = String(w?.reason ?? "");
        const start = convertWorkStart(startRaw);
        const end = convertWorkEnd(endRaw, reasonRaw);
        const result: Record<string, unknown> = { ...w };
        if (start.changed) {
          result.startDate = start.value;
          workDirty = true;
          workEntriesConverted++;
          if (samples.length < 8) samples.push(`person ${p.personId} work.start: "${startRaw}" → "${start.value}"`);
        }
        if (end.changed) {
          result.endDate = end.endDate;
          result.reason = end.reason;
          workDirty = true;
          workEntriesConverted++;
          if (samples.length < 8) samples.push(`person ${p.personId} work.end: "${endRaw}" → "${end.endDate}" (reason="${end.reason}")`);
        }
        return result;
      });
      if (workDirty) {
        data.workExperiences = newWorks;
        dirty = true;
      }
    }

    if (dirty) {
      updated++;
      if (!DRY_RUN) {
        await prisma.resumeProfile.update({ where: { personId: p.personId }, data });
      }
    }
  }

  console.log(`\n  更新対象 resumeProfile: ${updated} 件`);
  console.log(`  学校日付フィールド変換: ${schoolFieldsConverted} 件`);
  console.log(`  職歴日付フィールド変換: ${workEntriesConverted} 件`);
  console.log(`\n  サンプル:`);
  for (const s of samples) console.log(`    - ${s}`);
  console.log(DRY_RUN ? "\n(DRY-RUN: 実 DB は変更されていません)" : "\n✅ DB 更新完了");
}

main()
  .catch((e) => {
    console.error("❌ エラー:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
