export const PLACEMENT_STAGES = [
  { id: "offered", label: "内定" },
  { id: "accepted", label: "内定承諾" },
  { id: "applying", label: "申請中" },
  { id: "approved", label: "結果受領" },
  { id: "entered", label: "入国済み" },
  { id: "joined", label: "入社済み" },
] as const;

export type PlacementStageId = (typeof PLACEMENT_STAGES)[number]["id"];

export function inferPlacementStage(input: {
  stage?: string | null;
  offerAt?: Date | null;
  offerAcceptedAt?: Date | null;
  applicationAt?: Date | null;
  applicationResultAt?: Date | null;
  entryAt?: Date | null;
  joinAt?: Date | null;
}): PlacementStageId {
  const manual = input.stage as PlacementStageId | null | undefined;
  if (manual && PLACEMENT_STAGES.some((s) => s.id === manual)) return manual;
  if (input.joinAt) return "joined";
  if (input.entryAt) return "entered";
  if (input.applicationResultAt) return "approved";
  if (input.applicationAt) return "applying";
  if (input.offerAcceptedAt) return "accepted";
  return "offered";
}
