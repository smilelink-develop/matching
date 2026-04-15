import SectionPlaceholder from "@/app/components/SectionPlaceholder";

export default function DealsPage() {
  return (
    <SectionPlaceholder
      title="案件管理"
      description="企業、海外パートナー、候補者の3軸を同時に追いながら、どの案件がどこまで進んでいるかを整理するためのセクションです。"
      points={[
        "企業ごとの求人と候補者候補をひも付ける",
        "海外パートナーへの依頼状況を記録する",
        "面談日程、結果、推薦状態を案件単位で追う",
      ]}
      primaryHref="/calendar"
      primaryLabel="日程調整を開く"
      secondaryHref="/recommendations"
      secondaryLabel="推薦リストを開く"
    />
  );
}
