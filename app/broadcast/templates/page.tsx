import { prisma } from "@/lib/prisma";
import { requireCurrentAccount } from "@/lib/auth";
import TemplatesClient from "./TemplatesClient";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const account = await requireCurrentAccount();
  const templates = await prisma.messageTemplate.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-[#0F172A]">連絡テンプレート</h1>
      <p className="text-sm text-gray-500">候補者や海外パートナーに送る定型文を {account.name}さん単位で管理します。</p>
      <TemplatesClient templates={templates.map((t) => ({ id: t.id, name: t.name, content: t.content }))} />
    </div>
  );
}
