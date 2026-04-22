import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentAccount } from "@/lib/auth";
import { compareExternalId, findExternalIdByName } from "@/lib/company-id-mapping";
import CompaniesListClient from "./CompaniesListClient";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  await requireCurrentAccount();

  // externalId が未設定の企業に、マッピング (data/company-id-mapping.json) から自動補完
  await autoFillExternalIds();

  const companies = await prisma.company.findMany({
    include: {
      deals: {
        select: { id: true },
      },
    },
  });

  // externalId (数値プレフィックス) で昇順。欠番は末尾
  const sorted = [...companies].sort((a, b) => compareExternalId(a.externalId, b.externalId));

  const active = sorted
    .filter((company) => company.hiringStatus !== "停止")
    .map(toRow);
  const stopped = sorted
    .filter((company) => company.hiringStatus === "停止")
    .map(toRow);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">企業一覧</h1>
          <p className="mt-1 text-sm text-gray-500">{companies.length} 件 (稼働中 {active.length} / 停止 {stopped.length})</p>
        </div>
        <Link
          href="/companies/new"
          className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
        >
          + 企業を追加
        </Link>
      </div>

      <CompaniesListClient active={active} stopped={stopped} />
    </div>
  );
}

type RawCompany = {
  id: number;
  externalId: string | null;
  name: string;
  industry: string | null;
  hiringStatus: string;
  deals: { id: number }[];
};

function toRow(c: RawCompany) {
  return {
    id: c.id,
    externalId: c.externalId,
    name: c.name,
    industry: c.industry,
    hiringStatus: c.hiringStatus,
    deals: c.deals,
  };
}

// セッション内で 1 度だけ実行 (モジュールスコープのフラグ)
let autoFillDone = false;

async function autoFillExternalIds() {
  if (autoFillDone) return;
  autoFillDone = true;
  try {
    const candidates = await prisma.company.findMany({
      where: { externalId: null },
      select: { id: true, name: true },
    });
    if (candidates.length === 0) return;

    // 既に使われている externalId を一括取得して衝突チェック
    const taken = new Set(
      (
        await prisma.company.findMany({
          where: { externalId: { not: null } },
          select: { externalId: true },
        })
      )
        .map((c) => c.externalId)
        .filter((v): v is string => !!v)
    );

    for (const company of candidates) {
      const externalId = findExternalIdByName(company.name);
      if (!externalId || taken.has(externalId)) continue;
      try {
        await prisma.company.update({
          where: { id: company.id },
          data: { externalId },
        });
        taken.add(externalId);
      } catch {
        // 並列更新などは無視
      }
    }
  } catch {
    // 一度失敗したら再試行しない (フラグは立てたまま)
  }
}
