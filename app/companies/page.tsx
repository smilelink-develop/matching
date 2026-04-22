import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentAccount } from "@/lib/auth";
import { compareExternalId, findExternalIdByName } from "@/lib/company-id-mapping";

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

  const active = sorted.filter((company) => company.hiringStatus !== "停止");
  const stopped = sorted.filter((company) => company.hiringStatus === "停止");

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

      <CompaniesTable companies={active} emptyLabel="まだ企業情報が登録されていません" />

      {stopped.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 pt-2">
            <h2 className="text-sm font-semibold text-gray-500">採用停止中</h2>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-500">
              {stopped.length} 件
            </span>
          </div>
          <CompaniesTable companies={stopped} emptyLabel="停止中の企業はありません" muted />
        </div>
      ) : null}
    </div>
  );
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

type CompanyRow = {
  id: number;
  externalId: string | null;
  name: string;
  industry: string | null;
  hiringStatus: string;
  deals: { id: number }[];
};

function CompaniesTable({
  companies,
  emptyLabel,
  muted = false,
}: {
  companies: CompanyRow[];
  emptyLabel: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${
        muted ? "opacity-80" : ""
      }`}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--color-light)] text-[var(--color-text-dark)]">
            <th className="px-4 py-3 text-left font-semibold w-28">企業ID</th>
            <th className="px-4 py-3 text-left font-semibold">企業名</th>
            <th className="px-4 py-3 text-left font-semibold">業種</th>
            <th className="px-4 py-3 text-left font-semibold">採用状況</th>
            <th className="px-4 py-3 text-left font-semibold w-20">案件数</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="p-0 font-mono text-[13px] text-[var(--color-primary)]">
                <Link href={`/companies/${company.id}`} className="block px-4 py-3">
                  {company.externalId ?? <span className="text-gray-300">未設定</span>}
                </Link>
              </td>
              <td className="p-0 font-medium text-[var(--color-text-dark)]">
                <Link href={`/companies/${company.id}`} className="block px-4 py-3">
                  {company.name}
                </Link>
              </td>
              <td className="p-0 text-gray-600">
                <Link href={`/companies/${company.id}`} className="block px-4 py-3">
                  {company.industry ?? "-"}
                </Link>
              </td>
              <td className="p-0">
                <Link href={`/companies/${company.id}`} className="block px-4 py-3">
                  <span className="inline-block rounded-full bg-[var(--color-light)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                    {company.hiringStatus}
                  </span>
                </Link>
              </td>
              <td className="p-0 text-gray-600">
                <Link href={`/companies/${company.id}`} className="block px-4 py-3">
                  {company.deals.length}件
                </Link>
              </td>
            </tr>
          ))}
          {companies.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                {emptyLabel}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
