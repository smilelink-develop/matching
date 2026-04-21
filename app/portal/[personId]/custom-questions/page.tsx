import { prisma } from "@/lib/prisma";
import PortalFrame from "../../_components/PortalFrame";
import { getPortalPerson } from "../../_components/portal-data";
import CustomQuestionsAnswerClient from "./CustomQuestionsAnswerClient";

export const dynamic = "force-dynamic";

export default async function PortalCustomQuestionsPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  const person = await getPortalPerson(personId);
  const questions = await prisma.personCustomQuestion.findMany({
    where: { personId: Number(personId), active: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  return (
    <PortalFrame person={person}>
      <div className="space-y-4">
        <section className="rounded-[22px] border border-[var(--color-secondary)] bg-white/94 px-5 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          <p className="text-sm font-semibold text-[var(--color-text-dark)]">個別質問</p>
          <p className="mt-1 text-xs text-[#64748B]">担当者からの質問に回答してください。ファイルの添付が必要な項目もあります。</p>
        </section>

        <CustomQuestionsAnswerClient
          personId={person.id}
          initialQuestions={questions.map((q) => ({
            id: q.id,
            label: q.label,
            type: q.type,
            required: q.required,
            answer: q.answer,
            fileName: q.fileName,
            fileUrl: q.fileUrl,
          }))}
        />
      </div>
    </PortalFrame>
  );
}
