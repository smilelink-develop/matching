import { prisma } from "@/lib/prisma";
import { requireCurrentAccount } from "@/lib/auth";
import SharedCompaniesClient from "./SharedCompaniesClient";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  await requireCurrentAccount();
  const companies = await prisma.company.findMany({
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">企業情報</h1>
        <p className="mt-1 text-sm text-gray-500">
          この一覧は全アカウント共通です。誰かが追加・更新すると、全員に同じ内容が見えます。
        </p>
      </div>
      <SharedCompaniesClient
        initialCompanies={companies.map((company) => ({
          id: company.id,
          name: company.name,
          industry: company.industry,
          location: company.location,
          hiringStatus: company.hiringStatus,
          notes: company.notes,
        }))}
      />
    </div>
  );
}
