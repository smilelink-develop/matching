import { prisma } from "@/lib/prisma";
import { reconcileMessagePersonLinks } from "@/lib/message-linking";
import { requireCurrentAccount } from "@/lib/auth";
import ChatClient from "./ChatClient";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  await requireCurrentAccount();
  await reconcileMessagePersonLinks();

  const persons = await prisma.person.findMany({
    orderBy: { name: "asc" },
  });

  const messages = await prisma.message.findMany({
    orderBy: { sentAt: "asc" },
    take: 500,
  });

  // メッセージテンプレートは全アカウント共通
  const templates = await prisma.messageTemplate.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <ChatClient
      persons={persons.map((p) => ({
        id: p.id, name: p.name, channel: p.channel,
        photoUrl: p.photoUrl,
        lineUserId: p.lineUserId, messengerPsid: p.messengerPsid,
      }))}
      initialMessages={messages.map((m) => ({
        id: m.id, personId: m.personId, channel: m.channel,
        direction: m.direction, content: m.content,
        sentAt: m.sentAt.toISOString(), readAt: m.readAt?.toISOString() ?? null,
      }))}
      templates={templates.map((t) => ({ id: t.id, name: t.name, content: t.content }))}
    />
  );
}
