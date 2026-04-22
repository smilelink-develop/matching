import { prisma } from "@/lib/prisma";
import { requireCurrentAccount } from "@/lib/auth";
import PartnerInvoicesClient from "../PartnerInvoicesClient";

export const dynamic = "force-dynamic";

export default async function PartnerInvoicesPage() {
  await requireCurrentAccount();
  const invoices = await prisma.invoice.findMany({
    where: { channel: "PA" },
    orderBy: [{ paPaidAt: "desc" }, { createdAt: "desc" }],
    include: {
      person: { select: { id: true, name: true } },
      partner: { select: { id: true, name: true } },
      deal: { select: { id: true, title: true } },
    },
  });

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">PAへの請求</h1>
        <p className="mt-1 text-sm text-gray-500">
          パートナーエージェントから受け取る請求と、それに対する仕入支払いタスクを管理します。
        </p>
      </div>

      <PartnerInvoicesClient
        invoices={invoices.map((invoice) => ({
          id: invoice.id,
          personId: invoice.person?.id ?? null,
          personName: invoice.person?.name ?? null,
          dealId: invoice.deal?.id ?? null,
          dealTitle: invoice.deal?.title ?? null,
          partnerId: invoice.partner?.id ?? null,
          partnerName: invoice.partner?.name ?? null,
          paPaid: invoice.paPaid,
          paPaidAt: invoice.paPaidAt?.toISOString() ?? null,
          costAmount: invoice.costAmount,
          paInvoiceUrl: invoice.paInvoiceUrl,
          createdAt: invoice.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
