import { prisma } from "@/lib/prisma";
import BroadcastClient from "./BroadcastClient";

export const dynamic = "force-dynamic";

export default async function BroadcastPage() {
  const [persons, templates, groups] = await Promise.all([
    prisma.person.findMany({ orderBy: { name: "asc" } }),
    prisma.messageTemplate.findMany({ orderBy: { name: "asc" } }),
    prisma.group.findMany({ include: { members: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">配信送付</h1>
        <p className="text-sm text-gray-500 mt-1">フィルタ条件またはグループに一斉送信します</p>
      </div>
      <BroadcastClient
        persons={persons.map((p) => ({
          id: p.id, name: p.name, nationality: p.nationality,
          department: p.department, residenceStatus: p.residenceStatus,
          channel: p.channel, lineUserId: p.lineUserId, messengerPsid: p.messengerPsid,
        }))}
        templates={templates.map((t) => ({ id: t.id, name: t.name, content: t.content }))}
        groups={groups.map((g) => ({ id: g.id, name: g.name, memberCount: g.members.length }))}
      />
    </div>
  );
}
