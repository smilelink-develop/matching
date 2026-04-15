import SectionPlaceholder from "@/app/components/SectionPlaceholder";

export default function JobPostingsPage() {
  return (
    <SectionPlaceholder
      title="求人票管理"
      description="企業から受け取った求人票を取り込み、AI や整理ルールを使って自社フォーマットの求人票へまとめ直すためのセクションです。"
      points={[
        "求人票ファイルを取り込む",
        "必要項目を一覧化して標準フォーマットへ変換する",
        "候補者紹介用の見やすい求人表として保存する",
      ]}
      primaryHref="/deals"
      primaryLabel="案件管理を開く"
      secondaryHref="/settings"
      secondaryLabel="設定を開く"
    />
  );
}
