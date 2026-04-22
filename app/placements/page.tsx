import { prisma } from "@/lib/prisma";
import { requireCurrentAccount } from "@/lib/auth";
import PlacementsBoard, { type PlacementCardData } from "./PlacementsBoard";
import { inferPlacementStage } from "@/lib/placement-stage";

export const dynamic = "force-dynamic";

export default async function PlacementsPage() {
  await requireCurrentAccount();
  const placements = await prisma.personPlacement.findMany({
    include: {
      person: {
        select: {
          id: true,
          name: true,
          photoUrl: true,
          nationality: true,
          residenceStatus: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const cards: PlacementCardData[] = placements.map((placement) => {
    const computed = inferPlacementStage({
      stage: placement.stage,
      offerAt: placement.offerAt,
      offerAcceptedAt: placement.offerAcceptedAt,
      applicationAt: placement.applicationAt,
      applicationResultAt: placement.applicationResultAt,
      entryAt: placement.entryAt,
      joinAt: placement.joinAt,
    });
    return {
      id: placement.id,
      personId: placement.person.id,
      personName: placement.person.name,
      photoUrl: placement.person.photoUrl,
      nationality: placement.person.nationality,
      residenceStatus: placement.person.residenceStatus,
      stage: computed,
      offerAt: placement.offerAt?.toISOString() ?? null,
      offerAcceptedAt: placement.offerAcceptedAt?.toISOString() ?? null,
      applicationAt: placement.applicationAt?.toISOString() ?? null,
      applicationResultAt: placement.applicationResultAt?.toISOString() ?? null,
      entryAt: placement.entryAt?.toISOString() ?? null,
      joinAt: placement.joinAt?.toISOString() ?? null,
    };
  });

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">入社進捗</h1>
        <p className="mt-1 text-sm text-gray-500">
          内定から入社までの進捗を候補者ごとにチップ表示します。ドラッグ&ドロップでステージを動かせます。
        </p>
      </div>

      <PlacementsBoard initialCards={cards} />
    </div>
  );
}
