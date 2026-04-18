import { prisma } from "@/lib/prisma";
import { getDocumentDefinitions } from "@/lib/candidate-profile";
import { ensurePersonDriveFolder, uploadDataUrlToDrive } from "@/lib/google-docs";

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
    const person = await prisma.person.findUnique({
      where: { id: normalizedPersonId },
      select: { id: true, name: true, driveFolderUrl: true },
    });

    if (!person) {
      return Response.json(
        { ok: false, error: "候補者が見つかりません" },
        { status: 404 }
      );
    }

    const folder = await ensurePersonDriveFolder({
      existingFolderUrl: person.driveFolderUrl,
      personName: body.name || person.name,
    });

    const photoUpload =
      typeof body.photoUrl === "string" && body.photoUrl.startsWith("data:")
        ? await uploadDataUrlToDrive({
            dataUrl: body.photoUrl,
            fileName: `${body.name || person.name}-photo`,
            folderUrl: folder.folderUrl,
          })
        : null;

    const uploadedDocuments = await Promise.all(
      documents.map(async (document) => {
        if (!document?.kind || !document?.fileName || !document?.fileUrl) return document;
        if (typeof document.fileUrl === "string" && document.fileUrl.startsWith("data:")) {
          const uploaded = await uploadDataUrlToDrive({
            dataUrl: document.fileUrl,
            fileName: document.fileName,
            folderUrl: folder.folderUrl,
          });
          return {
            ...document,
            fileUrl: uploaded.fileUrl,
            mimeType: uploaded.mimeType,
          };
        }
        return document;
      })
    );
    const requiredDocumentKinds = getDocumentDefinitions(String(body.residenceStatus ?? "")).map(
      (document) => document.kind
    );
    const missingRequiredDocument = requiredDocumentKinds.some((kind) => {
      const current = uploadedDocuments.find((document) => document.kind === kind);
      return !current?.fileUrl;
    });

    if (missingRequiredDocument) {
      return Response.json(
        { ok: false, error: "必要書類の提出が必要です" },
        { status: 400 }
      );
    }

    await prisma.person.update({
      where: { id: normalizedPersonId },
      data: {
        name: body.name,
        photoUrl: photoUpload?.fileUrl || body.photoUrl || null,
        driveFolderUrl: folder.folderUrl,
        nationality: body.nationality || undefined,
        residenceStatus: body.residenceStatus || undefined,
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

    await prisma.resumeProfile.upsert({
      where: { personId: normalizedPersonId },
      create: {
        personId: normalizedPersonId,
        gender: body.gender || null,
        country: body.nationality || null,
        spouseStatus: body.spouseStatus || null,
        childrenCount: body.childrenCount || null,
        visaType: body.residenceStatus || null,
        visaExpiryDate: body.visaExpiryDate || null,
        workExperiences: body.workExperiences ?? [],
        motivation: body.motivation || null,
        selfIntroduction: body.selfIntroduction || null,
        japanPurpose: body.japanPurpose || null,
        currentJob: body.currentJob || null,
        retirementReason: body.retirementReason || null,
        preferenceNote: body.preferenceNote || null,
        japaneseLevel: body.japaneseLevel || null,
        japaneseLevelDate: body.japaneseLevelDate || null,
        licenseName: body.licenseName || null,
        licenseExpiryDate: body.licenseExpiryDate || null,
        otherQualificationName: body.otherQualificationName || null,
        otherQualificationExpiryDate: body.otherQualificationExpiryDate || null,
        traineeExperience: body.traineeExperience || null,
        highSchoolName: body.highSchoolName || null,
        highSchoolStartDate: body.highSchoolStartDate || null,
        highSchoolEndDate: body.highSchoolEndDate || null,
        universityName: body.universityName || null,
        universityStartDate: body.universityStartDate || null,
        universityEndDate: body.universityEndDate || null,
      },
      update: {
        gender: body.gender || null,
        country: body.nationality || null,
        spouseStatus: body.spouseStatus || null,
        childrenCount: body.childrenCount || null,
        visaType: body.residenceStatus || null,
        visaExpiryDate: body.visaExpiryDate || null,
        workExperiences: body.workExperiences ?? [],
        motivation: body.motivation || null,
        selfIntroduction: body.selfIntroduction || null,
        japanPurpose: body.japanPurpose || null,
        currentJob: body.currentJob || null,
        retirementReason: body.retirementReason || null,
        preferenceNote: body.preferenceNote || null,
        japaneseLevel: body.japaneseLevel || null,
        japaneseLevelDate: body.japaneseLevelDate || null,
        licenseName: body.licenseName || null,
        licenseExpiryDate: body.licenseExpiryDate || null,
        otherQualificationName: body.otherQualificationName || null,
        otherQualificationExpiryDate: body.otherQualificationExpiryDate || null,
        traineeExperience: body.traineeExperience || null,
        highSchoolName: body.highSchoolName || null,
        highSchoolStartDate: body.highSchoolStartDate || null,
        highSchoolEndDate: body.highSchoolEndDate || null,
        universityName: body.universityName || null,
        universityStartDate: body.universityStartDate || null,
        universityEndDate: body.universityEndDate || null,
      },
    });

    const savedDocuments = [];

    for (const document of uploadedDocuments) {
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
