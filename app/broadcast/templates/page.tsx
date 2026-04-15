import { prisma } from "@/lib/prisma";
import TemplatesClient from "./TemplatesClient";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await prisma.messageTemplate.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-[#0F172A]">メッセージテンプレート</h1>
      <TemplatesClient templates={templates.map((t) => ({ id: t.id, name: t.name, content: t.content }))} />
    </div>
  );
}
