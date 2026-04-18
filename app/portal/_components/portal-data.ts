import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export async function getPortalPerson(personId: string) {
  const person = await prisma.person.findUnique({
    where: { id: Number(personId) },
    select: {
      id: true,
      name: true,
      nationality: true,
      residenceStatus: true,
      department: true,
      photoUrl: true,
      lineUserId: true,
      messengerPsid: true,
      email: true,
      whatsappId: true,
      resumeProfile: true,
    },
  });

  if (!person) {
    notFound();
  }

  return person;
}

export async function getPortalOnboarding(personId: string) {
  const normalizedPersonId = Number(personId);

  const [onboarding, documents, tasks] = await Promise.all([
    prisma.personOnboarding.findUnique({
      where: { personId: normalizedPersonId },
    }),
    prisma.portalDocument.findMany({
      where: { personId: normalizedPersonId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.portalTask.findMany({
      where: { personId: normalizedPersonId },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return { onboarding, documents, tasks };
}
