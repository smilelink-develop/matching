import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentAccount } from "@/lib/auth";
import CompanyDetailClient from "./CompanyDetailClient";

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

  // この企業に紐づく請求を取得
  const invoices = await prisma.invoice.findMany({
    where: { deal: { companyId: Number(id) } },
    orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
    include: {
      person: { select: { id: true, name: true } },
      deal: { select: { id: true, title: true } },
    },
  });

  return (
    <div className="space-y-6 p-8">
      <CompanyDetailClient
        initialCompany={{
          id: company.id,
          externalId: company.externalId,
          name: company.name,
          industry: company.industry,
          location: company.location,
          hiringStatus: company.hiringStatus,
          driveFolderUrl: company.driveFolderUrl,
          notes: company.notes,
          deals: company.deals.map((deal) => ({
            id: deal.id,
            title: deal.title,
            status: deal.status,
            unitPrice: deal.unitPrice,
            field: deal.field,
            deadline: deal.deadline?.toISOString() ?? null,
            ownerName: deal.owner?.name ?? null,
            candidatesCount: deal.candidates.length,
          })),
          invoices: invoices.map((invoice) => ({
            id: invoice.id,
            personId: invoice.person?.id ?? null,
            personName: invoice.person?.name ?? null,
            dealId: invoice.deal?.id ?? null,
            dealTitle: invoice.deal?.title ?? null,
            invoiceDate: invoice.invoiceDate?.toISOString() ?? null,
            invoiceAmount: invoice.invoiceAmount,
            invoiceNumber: invoice.invoiceNumber,
            invoiceStatus: invoice.invoiceStatus,
            invoiceUrl: invoice.invoiceUrl,
          })),
        }}
      />
    </div>
  );
}
