import { prisma } from "@/lib/prisma";
import { requireCurrentAccount } from "@/lib/auth";
import LinkPageClient from "./LinkPageClient";

export const dynamic = "force-dynamic";

export default async function PartnerLinkPage() {
  await requireCurrentAccount();
  const [partners, lineProfiles, messengerProfiles] = await Promise.all([
    prisma.partner.findMany({ orderBy: { name: "asc" } }),
    prisma.lineProfile.findMany({ orderBy: { lastSeenAt: "desc" }, take: 50 }),
    prisma.messengerProfile.findMany({ orderBy: { lastSeenAt: "desc" }, take: 50 }),
  ]);

  const linkedLineIds = new Set(partners.map((p) => p.lineUserId).filter(Boolean) as string[]);
  const linkedPsids = new Set(partners.map((p) => p.messengerPsid).filter(Boolean) as string[]);

  const unlinkedLine = lineProfiles.filter((p) => !linkedLineIds.has(p.lineUserId));
  const unlinkedMessenger = messengerProfiles.filter((p) => !linkedPsids.has(p.psid));

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">連絡先紐づけ</h1>
        <p className="mt-1 text-sm text-gray-500">
          LINE / Messenger の Webhook で受信した未紐づけユーザーを、パートナーへ紐づけます。紐づけ後は連絡先紐づけが「完了」に更新されます。
        </p>
      </div>

      <LinkPageClient
        partners={partners.map((p) => ({ id: p.id, name: p.name }))}
        unlinkedLine={unlinkedLine.map((p) => ({
          lineUserId: p.lineUserId,
          displayName: p.displayName,
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
