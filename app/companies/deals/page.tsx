import { prisma } from "@/lib/prisma";
import { requireCurrentAccount } from "@/lib/auth";
import DealsDashboardClient from "./DealsDashboardClient";

export const dynamic = "force-dynamic";

export default async function CompanyDealsPage() {
  await requireCurrentAccount();

  const deals = await prisma.deal.findMany({
    include: {
      company: { select: { name: true } },
      partner: { select: { name: true } },
      owner: { select: { name: true } },
      candidates: {
        include: {
          person: { select: { name: true, nationality: true } },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
  });

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">案件管理</h1>
        <p className="mt-1 text-sm text-gray-500">企業ごとの案件を、ステップ別のカードで見やすく管理します。</p>
      </div>
      <DealsDashboardClient
        deals={deals.map((deal) => ({
          id: deal.id,
          title: deal.title,
          companyName: deal.company.name,
          partnerName: deal.partner?.name ?? null,
          ownerName: deal.owner?.name ?? "未割当",
          priority: deal.priority,
          status: deal.status,
          unitPrice: deal.unitPrice,
          deadline: deal.deadline?.toISOString() ?? null,
          notes: deal.notes,
          candidatesCount: deal.candidates.length,
        }))}
      />
    </div>
  );
}
