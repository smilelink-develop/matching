import { readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

type Mapping = { externalId: string; name: string };

function loadMapping(): Mapping[] {
  const file = path.join(process.cwd(), "data", "company-id-mapping.json");
  const raw = readFileSync(file, "utf-8");
  const json = JSON.parse(raw);
  if (!Array.isArray(json)) throw new Error("mapping file must be a JSON array");
  return json as Mapping[];
}

function norm(s: string) {
  return s
    .trim()
    .replace(/\s+/g, "")
    .replace(/株式会社|有限会社|合同会社|合名会社|医療法人|社会福祉法人/g, "")
    .toLowerCase();
}

export async function POST() {
  try {
    await requireApiAdmin();

    const mapping = loadMapping();
    const companies = await prisma.company.findMany({
      select: { id: true, name: true, externalId: true },
      orderBy: { id: "asc" },
    });

    const log: string[] = [];
    let matched = 0;
    let updated = 0;
    let skipped = 0;
    const unmatched: string[] = [];

    // 事前に正規化したキーで検索できるようにマップ化
    const byNorm = new Map<string, typeof companies>();
    for (const company of companies) {
      const key = norm(company.name);
      const arr = byNorm.get(key) ?? [];
      arr.push(company);
      byNorm.set(key, arr);
    }

    // externalId の競合を避けるため、一旦一意なプレースホルダに退避
    for (const company of companies) {
      if (company.externalId) {
        await prisma.company.update({
          where: { id: company.id },
          data: { externalId: `__tmp_${company.id}` },
        });
      }
    }

    for (const entry of mapping) {
      const key = norm(entry.name);
      let candidates = byNorm.get(key) ?? [];
      // フォールバック: contains マッチ
      if (candidates.length === 0) {
        for (const company of companies) {
          const n = norm(company.name);
          if (n.includes(key) || key.includes(n)) {
            candidates = [company];
            break;
          }
        }
      }
      if (candidates.length === 0) {
        unmatched.push(`${entry.externalId} ${entry.name}`);
        log.push(`❓ 未マッチ: ${entry.externalId} ${entry.name}`);
        continue;
      }
      if (candidates.length > 1) {
        log.push(
          `⚠️ 重複候補: ${entry.externalId} ${entry.name} → ${candidates.map((c) => `${c.id}:${c.name}`).join(", ")} (先頭を採用)`
        );
      }
      const target = candidates[0];
      matched++;
      if (target.externalId === entry.externalId) {
        skipped++;
        log.push(`= ${entry.externalId} ${entry.name} (既に一致)`);
        // 退避から戻す
        await prisma.company.update({
          where: { id: target.id },
          data: { externalId: entry.externalId },
        });
        continue;
      }
      await prisma.company.update({
        where: { id: target.id },
        data: { externalId: entry.externalId },
      });
      updated++;
      log.push(`✅ ${target.id} ${target.name} ← ${entry.externalId}`);
    }

    // 未マッチの companies は __tmp_ を null に戻す (以前 externalId があった場合は消去する)
    const stillTmp = await prisma.company.findMany({
      where: { externalId: { startsWith: "__tmp_" } },
      select: { id: true, name: true, externalId: true },
    });
    for (const company of stillTmp) {
      await prisma.company.update({ where: { id: company.id }, data: { externalId: null } });
      log.push(`↺ ${company.id} ${company.name}: externalId をクリア (xlsx に存在しない)`);
    }

    return Response.json({
      ok: true,
      summary: {
        mapping: mapping.length,
        companies: companies.length,
        matched,
        updated,
        skipped,
        unmatched: unmatched.length,
        cleared: stillTmp.length,
      },
      unmatched,
      log,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
