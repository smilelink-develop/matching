import SectionPlaceholder from "@/app/components/SectionPlaceholder";

export default function RevenuePage() {
  return (
    <SectionPlaceholder
      title="売上ダッシュボード"
      description="進行中案件、成約見込み、入社確定後の売上を見える化するためのセクションです。"
      points={[
        "案件ごとの進捗と売上見込みを一覧化する",
        "月次・担当別の進捗を確認する",
        "目標との差分を把握しやすくする",
      ]}
      primaryHref="/deals"
      primaryLabel="案件管理を開く"
      secondaryHref="/placements"
      secondaryLabel="入社進捗を開く"
    />
  );
}
