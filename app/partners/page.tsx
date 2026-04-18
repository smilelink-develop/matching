import { prisma } from "@/lib/prisma";
import { requireCurrentAccount } from "@/lib/auth";
import SharedPartnersClient from "./SharedPartnersClient";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  await requireCurrentAccount();
  const partners = await prisma.partner.findMany({
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">パートナーリスト</h1>
        <p className="mt-1 text-sm text-gray-500">
          海外紹介パートナーの情報も全アカウント共通です。担当者が変わっても同じ台帳を見られます。
        </p>
      </div>
      <SharedPartnersClient
        initialPartners={partners.map((partner) => ({
          id: partner.id,
          name: partner.name,
          country: partner.country,
          channel: partner.channel,
          contactName: partner.contactName,
          notes: partner.notes,
        }))}
      />
    </div>
  );
}
