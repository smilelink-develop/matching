import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditPersonForm from "./EditPersonForm";

export const dynamic = "force-dynamic";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await prisma.person.findUnique({
    where: { id: Number(id) },
    include: {
      onboarding: true,
      documents: true,
    },
  });
  if (!person) notFound();
  return (
    <div className="px-8 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-dark)]">人材を編集</h1>
          <p className="text-sm text-gray-500 mt-2">
            基本情報、初期登録情報、提出書類を更新します。
          </p>
        </div>
        <EditPersonForm person={person} />
      </div>
    </div>
  );
}
