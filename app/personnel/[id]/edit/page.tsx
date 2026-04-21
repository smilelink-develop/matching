import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditPersonForm from "./EditPersonForm";
import CustomQuestionsPanel from "./CustomQuestionsPanel";
import ExtractPanel from "./ExtractPanel";

export const dynamic = "force-dynamic";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [person, partners, customQuestions] = await Promise.all([
    prisma.person.findUnique({
      where: { id: Number(id) },
      include: {
        onboarding: true,
        documents: true,
        resumeProfile: true,
      },
    }),
    prisma.partner.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.personCustomQuestion.findMany({
      where: { personId: Number(id) },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
  ]);
  if (!person) notFound();

  return (
    <div className="px-8 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-dark)]">候補者詳細</h1>
          <p className="text-sm text-gray-500 mt-2">
            候補者情報を「基本情報」「資格・学歴」「各在留資格」に分けて管理します。
          </p>
        </div>

        <ExtractPanel personId={person.id} personName={person.name} />

        <CustomQuestionsPanel
          personId={person.id}
          personName={person.name}
          initialQuestions={customQuestions.map((q) => ({
            id: q.id,
            label: q.label,
            type: q.type,
            required: q.required,
            answer: q.answer,
            fileName: q.fileName,
            fileUrl: q.fileUrl,
            active: q.active,
            sortOrder: q.sortOrder,
          }))}
          profile={{
            englishName: person.onboarding?.englishName ?? null,
            phoneNumber: person.onboarding?.phoneNumber ?? null,
            birthDate: person.onboarding?.birthDate ?? null,
            postalCode: person.onboarding?.postalCode ?? null,
            address: person.onboarding?.address ?? null,
            gender: person.resumeProfile?.gender ?? null,
            spouseStatus: person.resumeProfile?.spouseStatus ?? null,
            childrenCount: person.resumeProfile?.childrenCount ?? null,
            motivation: person.resumeProfile?.motivation ?? null,
            selfIntroduction: person.resumeProfile?.selfIntroduction ?? null,
            japanPurpose: person.resumeProfile?.japanPurpose ?? null,
            currentJob: person.resumeProfile?.currentJob ?? null,
            retirementReason: person.resumeProfile?.retirementReason ?? null,
            preferenceNote: person.resumeProfile?.preferenceNote ?? null,
            japaneseLevel: person.resumeProfile?.japaneseLevel ?? null,
            visaExpiryDate: person.resumeProfile?.visaExpiryDate ?? null,
          }}
        />

        <EditPersonForm person={person} partners={partners} />
      </div>
    </div>
  );
}
