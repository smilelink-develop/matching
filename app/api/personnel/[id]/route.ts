import { prisma } from "@/lib/prisma";
import { reconcileMessagePersonLinks } from "@/lib/message-linking";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await prisma.person.findUnique({
    where: { id: Number(id) },
    include: {
      onboarding: true,
      documents: true,
      resumeProfile: true,
    },
  });
  if (!person) return Response.json({ ok: false, error: "not found" }, { status: 404 });
  return Response.json({ ok: true, person });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const personId = Number(id);
    const body = await req.json();
    const documents = Array.isArray(body.documents) ? body.documents : [];

    const person = await prisma.person.update({
      where: { id: personId },
      data: {
        name: body.name,
        photoUrl: body.photoUrl || null,
        nationality: body.nationality,
        department: body.department || null,
        residenceStatus: body.residenceStatus,
        channel: body.channel,
        lineUserId: body.lineUserId || null,
        messengerPsid: body.messengerPsid || null,
        email: body.email || null,
        whatsappId: body.whatsappId || null,
      },
    });

    await prisma.personOnboarding.upsert({
      where: { personId },
      create: {
        personId,
        englishName: body.englishName || null,
        birthDate: body.birthDate || null,
        phoneNumber: body.phoneNumber || null,
        postalCode: body.postalCode || null,
        address: body.address || null,
        status: "submitted",
        submittedAt: body.birthDate || body.address ? new Date() : null,
      },
      update: {
        englishName: body.englishName || null,
        birthDate: body.birthDate || null,
        phoneNumber: body.phoneNumber || null,
        postalCode: body.postalCode || null,
        address: body.address || null,
        status: body.birthDate || body.address ? "submitted" : "draft",
        submittedAt: body.birthDate || body.address ? new Date() : null,
      },
    });

    await prisma.resumeProfile.upsert({
      where: { personId },
      create: {
        personId,
        gender: body.resumeGender || null,
        country: body.resumeCountry || null,
        spouseStatus: body.resumeSpouseStatus || null,
        childrenCount: body.resumeChildrenCount || null,
        phoneHome: body.resumePhoneHome || null,
        visaType: body.resumeVisaType || null,
        visaExpiryDate: body.resumeVisaExpiryDate || null,
        workVisa: body.resumeWorkVisa || null,
        remarks: body.resumeRemarks || null,
        educations: body.resumeEducations ?? [],
        workExperiences: body.resumeWorkExperiences ?? [],
        certifications: body.resumeCertifications ?? [],
        motivation: body.resumeMotivation || null,
        selfIntroduction: body.resumeSelfIntroduction || null,
        japanPurpose: body.resumeJapanPurpose || null,
        currentJob: body.resumeCurrentJob || null,
        retirementReason: body.resumeRetirementReason || null,
        preferenceNote: body.resumePreferenceNote || null,
      },
      update: {
        gender: body.resumeGender || null,
        country: body.resumeCountry || null,
        spouseStatus: body.resumeSpouseStatus || null,
        childrenCount: body.resumeChildrenCount || null,
        phoneHome: body.resumePhoneHome || null,
        visaType: body.resumeVisaType || null,
        visaExpiryDate: body.resumeVisaExpiryDate || null,
        workVisa: body.resumeWorkVisa || null,
        remarks: body.resumeRemarks || null,
        educations: body.resumeEducations ?? [],
        workExperiences: body.resumeWorkExperiences ?? [],
        certifications: body.resumeCertifications ?? [],
        motivation: body.resumeMotivation || null,
        selfIntroduction: body.resumeSelfIntroduction || null,
        japanPurpose: body.resumeJapanPurpose || null,
        currentJob: body.resumeCurrentJob || null,
        retirementReason: body.resumeRetirementReason || null,
        preferenceNote: body.resumePreferenceNote || null,
      },
    });

    for (const document of documents) {
      if (!document?.kind || !document?.fileUrl || !document?.fileName) continue;

      await prisma.portalDocument.upsert({
        where: {
          personId_kind: {
            personId,
            kind: document.kind,
          },
        },
        create: {
          personId,
          kind: document.kind,
          fileName: document.fileName,
          fileUrl: document.fileUrl,
          mimeType: document.mimeType || null,
          autoJudgeStatus: document.autoJudgeStatus || "accepted",
          autoJudgeNote: document.autoJudgeNote || "管理画面から更新",
        },
        update: {
          fileName: document.fileName,
          fileUrl: document.fileUrl,
          mimeType: document.mimeType || null,
          autoJudgeStatus: document.autoJudgeStatus || "accepted",
          autoJudgeNote: document.autoJudgeNote || "管理画面から更新",
        },
      });
    }

    await reconcileMessagePersonLinks();
    return Response.json({ ok: true, person });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const person = await prisma.person.update({
      where: { id: Number(id) },
      data: body,
    });
    await reconcileMessagePersonLinks();
    return Response.json({ ok: true, person });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.person.delete({ where: { id: Number(id) } });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
