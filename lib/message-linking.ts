import { prisma } from "@/lib/prisma";

export async function reconcileMessagePersonLinks() {
  const orphanMessages = await prisma.message.findMany({
    where: {
      personId: null,
      externalId: { not: null },
    },
    select: {
      id: true,
      channel: true,
      externalId: true,
    },
    take: 500,
  });

  if (orphanMessages.length === 0) {
    return 0;
  }

  const persons = await prisma.person.findMany({
    where: {
      OR: [
        { lineUserId: { not: null } },
        { messengerPsid: { not: null } },
      ],
    },
    select: {
      id: true,
      lineUserId: true,
      messengerPsid: true,
    },
  });

  const lineMap = new Map(
    persons
      .filter((person) => person.lineUserId)
      .map((person) => [person.lineUserId as string, person.id])
  );

  const messengerMap = new Map(
    persons
      .filter((person) => person.messengerPsid)
      .map((person) => [person.messengerPsid as string, person.id])
  );

  const updates = orphanMessages
    .map((message) => {
      const externalId = message.externalId;
      if (!externalId) return null;

      const personId =
        message.channel === "Messenger"
          ? messengerMap.get(externalId)
          : lineMap.get(externalId);

      if (!personId) return null;

      return prisma.message.update({
        where: { id: message.id },
        data: { personId },
      });
    })
    .filter((update): update is ReturnType<typeof prisma.message.update> => update !== null);

  if (updates.length === 0) {
    return 0;
  }

  await prisma.$transaction(updates);
  return updates.length;
}
