import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditPersonForm from "./EditPersonForm";

export const dynamic = "force-dynamic";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [person, partners] = await Promise.all([
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
        <EditPersonForm person={person} partners={partners} />
      </div>
    </div>
  );
}
