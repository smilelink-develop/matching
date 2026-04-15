import SectionPlaceholder from "@/app/components/SectionPlaceholder";

export default function PlacementsPage() {
  return (
    <SectionPlaceholder
      title="入社進捗"
      description="紹介決定後の書類、入社準備、受け入れ状況を候補者ごとに追跡するためのセクションです。"
      points={[
        "内定後に必要な書類提出を再確認する",
        "入社までの手続き進捗を候補者単位で追う",
        "未対応事項を担当者が見落とさないように残す",
      ]}
      primaryHref="/personnel"
      primaryLabel="候補者一覧を開く"
      secondaryHref="/deals"
      secondaryLabel="案件管理を開く"
    />
  );
}
