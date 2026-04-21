import { prisma } from "@/lib/prisma";
import { requireCurrentAccount } from "@/lib/auth";
import RevenueDashboard from "./RevenueDashboard";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  await requireCurrentAccount();
  const [deals, invoices] = await Promise.all([
    prisma.deal.findMany({
      select: {
        id: true,
        title: true,
        acceptedAt: true,
        createdAt: true,
        requiredCount: true,
        recommendedCount: true,
        interviewCount: true,
        offerCount: true,
        contractCount: true,
        company: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      select: {
        id: true,
        invoiceDate: true,
        invoiceAmount: true,
        costAmount: true,
        channel: true,
        invoiceStatus: true,
        createdAt: true,
        dealId: true,
        deal: { select: { title: true, company: { select: { name: true } } } },
        person: { select: { id: true, name: true } },
      },
      orderBy: { invoiceDate: "desc" },
    }),
  ]);

  return (
    <RevenueDashboard
      initialDeals={deals.map((deal) => ({
        id: deal.id,
        title: deal.title,
        companyName: deal.company.name,
        acceptedAt: deal.acceptedAt?.toISOString() ?? null,
        createdAt: deal.createdAt.toISOString(),
        requiredCount: deal.requiredCount,
        recommendedCount: deal.recommendedCount,
        interviewCount: deal.interviewCount,
        offerCount: deal.offerCount,
        contractCount: deal.contractCount,
      }))}
      initialInvoices={invoices.map((invoice) => ({
        id: invoice.id,
        invoiceDate: invoice.invoiceDate?.toISOString() ?? null,
        createdAt: invoice.createdAt.toISOString(),
        invoiceAmount: invoice.invoiceAmount,
        costAmount: invoice.costAmount,
        channel: invoice.channel,
        invoiceStatus: invoice.invoiceStatus,
        dealTitle: invoice.deal?.title ?? null,
        companyName: invoice.deal?.company?.name ?? null,
        personName: invoice.person?.name ?? null,
      }))}
    />
  );
}
