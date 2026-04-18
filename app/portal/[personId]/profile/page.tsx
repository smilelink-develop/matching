import OnboardingForm from "./OnboardingForm";
import PortalFrame from "../../_components/PortalFrame";
import { getPortalOnboarding, getPortalPerson } from "../../_components/portal-data";
import { getDocumentDefinitions } from "@/lib/candidate-profile";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  const person = await getPortalPerson(personId);
  const { onboarding, documents } = await getPortalOnboarding(personId);

  const initialDocuments = getDocumentDefinitions(person.residenceStatus).map((definition) => ({
    kind: definition.kind,
    label: definition.label,
    fileName:
      documents.find((document) => document.kind === definition.kind)?.fileName ?? "",
    fileUrl:
      documents.find((document) => document.kind === definition.kind)?.fileUrl ?? "",
    mimeType:
      documents.find((document) => document.kind === definition.kind)?.mimeType ?? "",
  }));

  return (
    <PortalFrame person={person}>
      <OnboardingForm
        personId={person.id}
        personName={person.name}
        personPhotoUrl={person.photoUrl}
        initialData={{
          englishName: onboarding?.englishName ?? "",
          birthDate: onboarding?.birthDate ?? "",
          phoneNumber: onboarding?.phoneNumber ?? "",
          postalCode: onboarding?.postalCode ?? "",
          address: onboarding?.address ?? "",
          nationality: person.nationality ?? "",
          residenceStatus: person.residenceStatus ?? "",
          gender: person.resumeProfile?.gender ?? "",
          spouseStatus: person.resumeProfile?.spouseStatus ?? "",
          childrenCount: person.resumeProfile?.childrenCount ?? "",
          motivation: person.resumeProfile?.motivation ?? "",
          selfIntroduction: person.resumeProfile?.selfIntroduction ?? "",
          japanPurpose: person.resumeProfile?.japanPurpose ?? "",
          currentJob: person.resumeProfile?.currentJob ?? "",
          retirementReason: person.resumeProfile?.retirementReason ?? "",
          preferenceNote: person.resumeProfile?.preferenceNote ?? "",
          visaExpiryDate: person.resumeProfile?.visaExpiryDate ?? "",
          japaneseLevel: person.resumeProfile?.japaneseLevel ?? "",
          japaneseLevelDate: person.resumeProfile?.japaneseLevelDate ?? "",
          licenseName: person.resumeProfile?.licenseName ?? "",
          licenseExpiryDate: person.resumeProfile?.licenseExpiryDate ?? "",
          otherQualificationName: person.resumeProfile?.otherQualificationName ?? "",
          otherQualificationExpiryDate: person.resumeProfile?.otherQualificationExpiryDate ?? "",
          traineeExperience: person.resumeProfile?.traineeExperience ?? "",
          highSchoolName: person.resumeProfile?.highSchoolName ?? "",
          highSchoolStartDate: person.resumeProfile?.highSchoolStartDate ?? "",
          highSchoolEndDate: person.resumeProfile?.highSchoolEndDate ?? "",
          universityName: person.resumeProfile?.universityName ?? "",
          universityStartDate: person.resumeProfile?.universityStartDate ?? "",
          universityEndDate: person.resumeProfile?.universityEndDate ?? "",
          workExperiences: person.resumeProfile?.workExperiences ?? [],
          photoUrl: person.photoUrl ?? "",
          documents: initialDocuments,
        }}
      />
    </PortalFrame>
  );
}
