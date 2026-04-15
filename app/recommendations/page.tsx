import SectionPlaceholder from "@/app/components/SectionPlaceholder";

export default function RecommendationsPage() {
  return (
    <SectionPlaceholder
      title="推薦リスト"
      description="面談後に複数名の合格候補者を選び、企業へ渡す推薦リストを整理するためのセクションです。最終的にはスプレッドシート連携も視野に入れています。"
      points={[
        "面談合格者を選択する",
        "企業に見せる必要情報だけを抜き出す",
        "社内共有用と企業共有用の2種類の出し分けをする",
      ]}
      primaryHref="/deals"
      primaryLabel="案件管理を開く"
      secondaryHref="/personnel"
      secondaryLabel="候補者一覧を開く"
    />
  );
}
