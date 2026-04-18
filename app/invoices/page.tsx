import SectionPlaceholder from "@/app/components/SectionPlaceholder";

export default function InvoicesPage() {
  return (
    <SectionPlaceholder
      title="請求"
      description="成約後の請求予定、請求済み、入金確認を追いかけるためのセクションです。"
      points={[
        "案件ごとの請求タイミングを整理する",
        "企業別の請求状況を一覧で見る",
        "売上ダッシュボードとつながる形にする",
      ]}
      primaryHref="/revenue"
      primaryLabel="売上ダッシュボードを開く"
      secondaryHref="/companies/deals"
      secondaryLabel="案件管理を開く"
    />
  );
}
