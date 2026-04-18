import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentAccount } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCurrentAccount();
  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id: Number(id) },
    include: {
      deals: {
        include: {
          owner: { select: { name: true } },
          candidates: { select: { id: true } },
        },
        orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
      },
    },
  });

  if (!company) notFound();

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--color-primary)]">COMPANY DETAIL</p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--color-text-dark)]">{company.name}</h1>
          <p className="mt-2 text-sm text-gray-500">企業詳細と、この企業に紐づく案件をまとめて確認できます。</p>
        </div>
        <Link
          href="/companies/deals/new"
          className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
        >
          + 案件を追加
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--color-text-dark)]">企業情報</h2>
          <div className="mt-4 space-y-3 text-sm text-gray-600">
            <InfoRow label="業種" value={company.industry ?? "-"} />
            <InfoRow label="所在地" value={company.location ?? "-"} />
            <InfoRow label="採用状況" value={company.hiringStatus} />
            <InfoRow label="案件数" value={`${company.deals.length}件`} />
          </div>
          {company.notes ? (
            <div className="mt-4 rounded-xl border border-[var(--color-secondary)] bg-[var(--color-light)] p-4 text-sm leading-6 text-[var(--color-text-dark)]">
              {company.notes}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-[var(--color-text-dark)]">紐づいている案件</h2>
            <Link href="/companies/deals" className="text-xs text-[var(--color-primary)] hover:underline">
              案件管理を見る
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {company.deals.map((deal) => (
              <Link
                key={deal.id}
                href={`/companies/deals/${deal.id}`}
                className="rounded-2xl border border-gray-200 bg-[var(--color-light)] p-4 transition hover:border-[var(--color-secondary)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-dark)]">{deal.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{deal.owner?.name ?? "担当未設定"}</p>
                  </div>
                  <span className={statusClass(deal.status)}>{deal.status}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                  <Pill>{formatUnitPrice(deal.unitPrice)}</Pill>
                  <Pill>{deal.field ?? "分野未設定"}</Pill>
                  <Pill>{deal.deadline ? `期限 ${new Date(deal.deadline).toLocaleDateString("ja-JP")}` : "期限未設定"}</Pill>
                  <Pill>{deal.candidates.length}名</Pill>
                </div>
              </Link>
            ))}
            {company.deals.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-400 md:col-span-2">
                まだ案件がありません
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-[var(--color-text-dark)]">{value}</span>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white px-2.5 py-1">{children}</span>;
}

function statusClass(status: string) {
  if (status === "至急募集") return "rounded-full bg-[#FEE2E2] px-2.5 py-1 text-[11px] font-medium text-[#B91C1C]";
  if (status === "募集中") return "rounded-full bg-[#FEF3C7] px-2.5 py-1 text-[11px] font-medium text-[#92400E]";
  if (status === "面接中") return "rounded-full bg-[#DBEAFE] px-2.5 py-1 text-[11px] font-medium text-[#1D4ED8]";
  return "rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[11px] font-medium text-[#166534]";
}

function formatUnitPrice(value: string | null) {
  if (!value) return "単価未設定";
  return value.includes("万円") ? value : `${value}万円`;
}
