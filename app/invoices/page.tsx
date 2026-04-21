import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentAccount } from "@/lib/auth";
import InvoicesDashboard from "./InvoicesDashboard";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  await requireCurrentAccount();
  const invoices = await prisma.invoice.findMany({
    orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
    include: {
      person: { select: { id: true, name: true } },
      partner: { select: { id: true, name: true } },
      deal: { select: { id: true, title: true, company: { select: { name: true } } } },
    },
  });

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">請求</h1>
          <p className="mt-1 text-sm text-gray-500">
            企業への請求と、パートナーへの支払いタスクを一元管理します。各候補者の「内定後」タブと同期しています。
          </p>
        </div>
        <Link
          href="/revenue"
          className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          売上ダッシュボード →
        </Link>
      </div>

      <InvoicesDashboard
        invoices={invoices.map((invoice) => ({
          id: invoice.id,
          personId: invoice.person?.id ?? null,
          personName: invoice.person?.name ?? null,
          dealId: invoice.dealId,
          dealTitle: invoice.deal?.title ?? null,
          companyName: invoice.deal?.company?.name ?? null,
          partnerName: invoice.partner?.name ?? null,
          invoiceDate: invoice.invoiceDate?.toISOString() ?? null,
          invoiceAmount: invoice.invoiceAmount,
          invoiceNumber: invoice.invoiceNumber,
          invoiceStatus: invoice.invoiceStatus,
          invoiceUrl: invoice.invoiceUrl,
          channel: invoice.channel,
          costAmount: invoice.costAmount,
          paInvoiceUrl: invoice.paInvoiceUrl,
          paPaid: invoice.paPaid,
          paPaidAt: invoice.paPaidAt?.toISOString() ?? null,
          createdAt: invoice.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
