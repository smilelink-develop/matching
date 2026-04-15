import { prisma } from "@/lib/prisma";
import LinkPageClient from "./LinkPageClient";

export const dynamic = "force-dynamic";

export default async function LinkPage() {
  const [persons, lineProfiles, messengerProfiles] = await Promise.all([
    prisma.person.findMany({ orderBy: { name: "asc" } }),
    prisma.lineProfile.findMany({ orderBy: { lastSeenAt: "desc" }, take: 50 }),
    prisma.messengerProfile.findMany({ orderBy: { lastSeenAt: "desc" }, take: 50 }),
  ]);

  const linkedLineIds = new Set(persons.map((p) => p.lineUserId).filter(Boolean));
  const linkedPsids = new Set(persons.map((p) => p.messengerPsid).filter(Boolean));

  const unlinkedLine = lineProfiles.filter((p) => !linkedLineIds.has(p.lineUserId));
  const unlinkedMessenger = messengerProfiles.filter((p) => !linkedPsids.has(p.psid));

  return (
    <div className="p-8 space-y-8">
      <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">連絡先の紐づけ</h1>
          <p className="text-sm text-gray-500 mt-1">
          webhook で受信した ID を候補者に紐づけます
        </p>
      </div>

      <LinkPageClient
        persons={persons.map((p) => ({ id: p.id, name: p.name, contactName: p.name }))}
        unlinkedLine={unlinkedLine.map((p) => ({
          lineUserId: p.lineUserId,
          lastMessageText: p.lastMessageText,
          lastSeenAt: p.lastSeenAt.toISOString(),
        }))}
        unlinkedMessenger={unlinkedMessenger.map((p) => ({
          psid: p.psid,
          lastMessageText: p.lastMessageText,
          lastSeenAt: p.lastSeenAt.toISOString(),
        }))}
      />
    </div>
  );
}
