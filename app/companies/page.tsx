import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentAccount } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  await requireCurrentAccount();
  const companies = await prisma.company.findMany({
    include: {
      deals: {
        select: { id: true },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">企業一覧</h1>
          <p className="mt-1 text-sm text-gray-500">{companies.length} 件</p>
        </div>
        <Link
          href="/companies/new"
          className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
        >
          + 企業を追加
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-light)] text-[var(--color-text-dark)]">
              <th className="px-4 py-3 text-left font-semibold">企業名</th>
              <th className="px-4 py-3 text-left font-semibold">業種</th>
              <th className="px-4 py-3 text-left font-semibold">所在地</th>
              <th className="px-4 py-3 text-left font-semibold">採用状況</th>
              <th className="px-4 py-3 text-left font-semibold">案件数</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-[var(--color-text-dark)]">{company.name}</td>
                <td className="px-4 py-3 text-gray-600">{company.industry ?? "-"}</td>
                <td className="px-4 py-3 text-gray-600">{company.location ?? "-"}</td>
                <td className="px-4 py-3">
                  <span className="inline-block rounded-full bg-[var(--color-light)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                    {company.hiringStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{company.deals.length}件</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/companies/${company.id}`}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    詳細を見る
                  </Link>
                </td>
              </tr>
            ))}
            {companies.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  まだ企業情報が登録されていません
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
