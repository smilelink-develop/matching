import { prisma } from "@/lib/prisma";
import GroupsClient from "./GroupsClient";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const [groups, persons] = await Promise.all([
    prisma.group.findMany({
      include: { members: { include: { person: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">連絡グループ</h1>
      <GroupsClient
        groups={groups.map((g) => ({
          id: g.id, name: g.name,
          members: g.members.map((m) => ({ id: m.person.id, name: m.person.name })),
        }))}
        persons={persons.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
