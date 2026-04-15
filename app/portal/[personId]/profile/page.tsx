import OnboardingForm from "./OnboardingForm";
import PortalFrame from "../../_components/PortalFrame";
import { getPortalOnboarding, getPortalPerson } from "../../_components/portal-data";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  const person = await getPortalPerson(personId);
  const { onboarding, documents } = await getPortalOnboarding(personId);

  const initialDocuments = [
    {
      kind: "residence-card" as const,
      label: "在留カード",
      fileName:
        documents.find((document) => document.kind === "residence-card")?.fileName ?? "",
      fileUrl:
        documents.find((document) => document.kind === "residence-card")?.fileUrl ?? "",
      mimeType:
        documents.find((document) => document.kind === "residence-card")?.mimeType ?? "",
    },
    {
      kind: "certificate" as const,
      label: "合格書",
      fileName:
        documents.find((document) => document.kind === "certificate")?.fileName ?? "",
      fileUrl:
        documents.find((document) => document.kind === "certificate")?.fileUrl ?? "",
      mimeType:
        documents.find((document) => document.kind === "certificate")?.mimeType ?? "",
    },
  ];

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
          photoUrl: person.photoUrl ?? "",
          documents: initialDocuments,
        }}
      />
    </PortalFrame>
  );
}
