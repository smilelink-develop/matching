import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import IntakeClient from "./IntakeClient";

export const dynamic = "force-dynamic";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 8) notFound();

  const person = await prisma.person.findUnique({
    where: { intakeToken: token },
    select: {
      id: true,
      name: true,
      onboarding: { select: { englishName: true } },
      resumeProfile: {
        select: {
          motivation: true,
          selfIntroduction: true,
          japanPurpose: true,
          currentJob: true,
          retirementReason: true,
          interviewAnswers: true,
        },
      },
    },
  });
  if (!person) notFound();

  return (
    <IntakeClient
      token={token}
      personName={person.name}
      englishName={person.onboarding?.englishName ?? null}
      initial={{
        motivation: person.resumeProfile?.motivation ?? "",
        selfIntroduction: person.resumeProfile?.selfIntroduction ?? "",
        japanPurpose: person.resumeProfile?.japanPurpose ?? "",
        currentJob: person.resumeProfile?.currentJob ?? "",
        retirementReason: person.resumeProfile?.retirementReason ?? "",
        interviewAnswers:
          person.resumeProfile?.interviewAnswers &&
          typeof person.resumeProfile.interviewAnswers === "object"
            ? (person.resumeProfile.interviewAnswers as Record<string, string>)
            : {},
      }}
    />
  );
}
