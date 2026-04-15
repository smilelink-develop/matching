import SectionPlaceholder from "@/app/components/SectionPlaceholder";

export default function ResumesPage() {
  return (
    <SectionPlaceholder
      title="履歴書作成"
      description="候補者から回収した情報を確認したあと、Google Docs テンプレートに沿って履歴書を作成し、Google Drive に保管するための入口です。"
      points={[
        "候補者の基本情報と提出書類を確認する",
        "Google Docs テンプレートから履歴書を複製する",
        "Google Drive の候補者フォルダへ保存し、履歴を残す",
      ]}
      primaryHref="/personnel"
      primaryLabel="候補者一覧を開く"
      secondaryHref="/broadcast/onboarding-forms"
      secondaryLabel="入力依頼フォームを確認"
    />
  );
}
