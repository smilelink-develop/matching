import { prisma } from "@/lib/prisma";

type UploadedDocumentInput = {
  kind: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
};

function evaluateDocument(kind: string, fileName: string, fileUrl: string) {
  const lowerName = fileName.toLowerCase();
  const isImage = fileUrl.startsWith("data:image/");
  const isPdf = fileUrl.startsWith("data:application/pdf");
  const isAcceptedType = isImage || isPdf;

  if (!isAcceptedType) {
    return {
      status: "rejected",
      note: "画像またはPDFファイルを提出してください",
    };
  }

  if (kind === "residence-card" && !(lowerName.includes("zairyu") || isImage)) {
    return {
      status: "needs_review",
      note: "在留カードらしい画像か確認待ちです",
    };
  }

  if (kind === "certificate" && lowerName.endsWith(".pdf")) {
    return {
      status: "accepted",
      note: "PDF として受理しました",
    };
  }

  return {
    status: "accepted",
    note: "自動判定で受理しました",
  };
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ personId: string }> }
) {
  const { personId } = await params;
  const normalizedPersonId = Number(personId);

  const [onboarding, documents] = await Promise.all([
    prisma.personOnboarding.findUnique({
      where: { personId: normalizedPersonId },
    }),
    prisma.portalDocument.findMany({
      where: { personId: normalizedPersonId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return Response.json({ ok: true, onboarding, documents });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await params;
    const normalizedPersonId = Number(personId);
    const body = await req.json();

    if (!Number.isInteger(normalizedPersonId) || normalizedPersonId <= 0) {
      return Response.json(
        { ok: false, error: "personId が不正です" },
        { status: 400 }
      );
    }

    if (!body.name?.trim() || !body.birthDate?.trim() || !body.address?.trim()) {
      return Response.json(
        { ok: false, error: "カタカナ名・生年月日・住所は必須です" },
        { status: 400 }
      );
    }

    const documents: UploadedDocumentInput[] = Array.isArray(body.documents)
      ? body.documents
      : [];
    const residenceCard = documents.find((doc) => doc.kind === "residence-card");
    const certificate = documents.find((doc) => doc.kind === "certificate");

    if (!residenceCard?.fileUrl || !certificate?.fileUrl) {
      return Response.json(
        { ok: false, error: "在留カードと合格書の提出が必要です" },
        { status: 400 }
      );
    }

    await prisma.person.update({
      where: { id: normalizedPersonId },
      data: {
        name: body.name,
        photoUrl: body.photoUrl || null,
      },
    });

    const onboarding = await prisma.personOnboarding.upsert({
      where: { personId: normalizedPersonId },
      update: {
        englishName: body.englishName || null,
        birthDate: body.birthDate,
        phoneNumber: body.phoneNumber || null,
        postalCode: body.postalCode || null,
        address: body.address,
        status: "submitted",
        submittedAt: new Date(),
      },
      create: {
        personId: normalizedPersonId,
        englishName: body.englishName || null,
        birthDate: body.birthDate,
        phoneNumber: body.phoneNumber || null,
        postalCode: body.postalCode || null,
        address: body.address,
        status: "submitted",
        submittedAt: new Date(),
      },
    });

    const savedDocuments = [];

    for (const document of documents) {
      if (!document?.kind || !document?.fileName || !document?.fileUrl) continue;

      const evaluation = evaluateDocument(
        String(document.kind),
        String(document.fileName),
        String(document.fileUrl)
      );

      const saved = await prisma.portalDocument.upsert({
        where: {
          personId_kind: {
            personId: normalizedPersonId,
            kind: String(document.kind),
          },
        },
        update: {
          fileName: String(document.fileName),
          fileUrl: String(document.fileUrl),
          mimeType: document.mimeType ? String(document.mimeType) : null,
          autoJudgeStatus: evaluation.status,
          autoJudgeNote: evaluation.note,
        },
        create: {
          personId: normalizedPersonId,
          kind: String(document.kind),
          fileName: String(document.fileName),
          fileUrl: String(document.fileUrl),
          mimeType: document.mimeType ? String(document.mimeType) : null,
          autoJudgeStatus: evaluation.status,
          autoJudgeNote: evaluation.note,
        },
      });

      savedDocuments.push(saved);
    }

    return Response.json({
      ok: true,
      onboarding,
      documents: savedDocuments,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}
