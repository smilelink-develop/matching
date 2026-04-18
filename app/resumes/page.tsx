import { prisma } from "@/lib/prisma";
import { requireCurrentAccount } from "@/lib/auth";
import ResumesClient from "./ResumesClient";

export const dynamic = "force-dynamic";

export default async function ResumesPage() {
  const account = await requireCurrentAccount();
  const [persons, templates, documents] = await Promise.all([
    prisma.person.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, nationality: true, residenceStatus: true },
    }),
    prisma.resumeTemplate.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.resumeDocument.findMany({
      include: {
        person: { select: { name: true } },
        template: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">履歴書作成</h1>
        <p className="mt-1 text-sm text-gray-500">
          候補者情報をもとに Google Docs の履歴書を自動生成し、候補者データへ紐づけます。
        </p>
        <p className="mt-2 text-xs text-gray-400">
          テンプレート内では {"{{カタカナ名}}"} や {"{{英語名}}"} のようなプレースホルダを使います。
        </p>
      </div>
      <ResumesClient
        persons={persons}
        templates={templates.map((template) => ({
          id: template.id,
          name: template.name,
          templateUrl: template.templateUrl,
          driveFolderUrl: template.driveFolderUrl,
        }))}
        documents={documents.map((document) => ({
          id: document.id,
          title: document.title,
          status: document.status,
          documentUrl: document.documentUrl,
          driveFolderUrl: document.driveFolderUrl,
          personName: document.person.name,
          templateName: document.template.name,
          createdAt: document.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
