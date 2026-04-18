import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";
import { buildResumePlaceholders } from "@/lib/resume-placeholders";
import { createResumeDocumentFromTemplate } from "@/lib/google-docs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const account = await requireApiAccount();
    const body = await req.json();
    const personId = Number(body.personId);
    const templateId = Number(body.templateId);
    const title = String(body.title ?? "").trim();
    const documentUrl = String(body.documentUrl ?? "").trim();

    if (!Number.isFinite(personId) || !Number.isFinite(templateId) || !title) {
      return Response.json(
        { ok: false, error: "候補者、テンプレート、履歴書名を入力してください" },
        { status: 400 }
      );
    }

    const template = await prisma.resumeTemplate.findFirst({
      where: { id: templateId, accountId: account.id },
    });

    if (!template) {
      return Response.json({ ok: false, error: "テンプレートが見つかりません" }, { status: 404 });
    }

    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: {
        onboarding: true,
        resumeProfile: true,
      },
    });

    if (!person) {
      return Response.json({ ok: false, error: "候補者が見つかりません" }, { status: 404 });
    }

    const generated = await createResumeDocumentFromTemplate({
      templateUrl: template.templateUrl,
      folderUrl: template.driveFolderUrl,
      title,
      replacements: buildResumePlaceholders({ person }),
    });

    const resume = await prisma.resumeDocument.create({
      data: {
        personId,
        templateId: template.id,
        accountId: account.id,
        title,
        documentId: generated.documentId,
        documentUrl: generated.documentUrl || documentUrl || null,
        driveFolderUrl: template.driveFolderUrl,
        status: "generated",
      },
      include: {
        person: { select: { name: true } },
        template: { select: { name: true } },
      },
    });

    return Response.json({
      ok: true,
      resume: {
        id: resume.id,
        title: resume.title,
        status: resume.status,
        documentUrl: resume.documentUrl,
        driveFolderUrl: resume.driveFolderUrl,
        personName: resume.person.name,
        templateName: resume.template.name,
        createdAt: resume.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
