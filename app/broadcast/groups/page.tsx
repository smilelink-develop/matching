import { prisma } from "@/lib/prisma";
import GroupsClient from "./GroupsClient";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const [groups, partners] = await Promise.all([
    prisma.group.findMany({
      include: { members: { include: { partner: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.partner.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">連絡グループ</h1>
      <p className="text-sm text-gray-500">パートナー向けの一斉連絡先をグループでまとめます。</p>
      <GroupsClient
        groups={groups.map((g) => ({
          id: g.id, name: g.name,
          members: g.members.map((m) => ({ id: m.partner.id, name: m.partner.name })),
        }))}
        persons={partners.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
