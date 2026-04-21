import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentAccount } from "@/lib/auth";
import DealDetailClient from "./DealDetailClient";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCurrentAccount();
  const { id } = await params;
  const [deal, persons] = await Promise.all([
    prisma.deal.findUnique({
      where: { id: Number(id) },
      include: {
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
        candidates: {
          include: {
            person: {
              select: {
                id: true,
                name: true,
                nationality: true,
                residenceStatus: true,
                photoUrl: true,
                partner: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: [{ updatedAt: "desc" }],
        },
      },
    }),
    prisma.person.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        nationality: true,
        residenceStatus: true,
        photoUrl: true,
      },
    }),
  ]);

  if (!deal) notFound();

  return (
    <div className="space-y-6 p-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.16em] text-[var(--color-primary)]">DEAL BOARD</p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-dark)]">{deal.title}</h1>
        <p className="mt-1 text-sm text-gray-500">案件詳細と、候補者の進捗を Trello のようなボードで管理します。</p>
      </div>

      <DealDetailClient
        deal={{
          id: deal.id,
          title: deal.title,
          field: deal.field,
          company: deal.company,
          owner: deal.owner,
          priority: deal.priority,
          status: deal.status,
          unitPrice: deal.unitPrice,
          deadline: deal.deadline?.toISOString() ?? null,
          acceptedAt: deal.acceptedAt?.toISOString() ?? null,
          requiredCount: deal.requiredCount,
          recommendedCount: deal.recommendedCount,
          interviewCount: deal.interviewCount,
          offerCount: deal.offerCount,
          contractCount: deal.contractCount,
          notes: deal.notes,
          candidates: deal.candidates.map((candidate) => ({
            id: candidate.id,
            note: candidate.note,
            stage: candidate.stage,
            person: candidate.person,
          })),
        }}
        persons={persons}
      />
    </div>
  );
}
