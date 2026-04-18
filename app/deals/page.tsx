import { prisma } from "@/lib/prisma";
import { requireCurrentAccount } from "@/lib/auth";
import DealsClient from "./DealsClient";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  await requireCurrentAccount();

  const deals = await prisma.deal.findMany({
    include: {
      company: { select: { name: true } },
      partner: { select: { name: true } },
      owner: { select: { name: true } },
      candidates: {
        include: {
          person: {
            select: {
              name: true,
              nationality: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
  });

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">案件管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          企業ごとに発生する複数案件をカードで管理し、案件詳細で候補者の進捗を追います。
        </p>
      </div>
      <DealsClient
        deals={deals.map((deal) => ({
          id: deal.id,
          title: deal.title,
          companyName: deal.company.name,
          partnerName: deal.partner?.name ?? null,
          ownerName: deal.owner?.name ?? "未割当",
          priority: deal.priority,
          status: deal.status,
          notes: deal.notes,
          updatedAt: deal.updatedAt.toISOString(),
          candidates: deal.candidates.map((candidate) => ({
            id: candidate.id,
            personName: candidate.person.name,
            nationality: candidate.person.nationality,
            stage: candidate.stage,
            note: candidate.note,
          })),
        }))}
      />
    </div>
  );
}
