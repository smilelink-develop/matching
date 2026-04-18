const STANDARD_FIELDS = [
  "企業名",
  "勤務地",
  "職種",
  "業務内容",
  "雇用形態",
  "給与",
  "勤務時間",
  "休日",
  "必要資格",
  "日本語条件",
  "住居支援",
  "選考フロー",
];

export default function JobPostingsPage() {
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">求人票作成</h1>
        <p className="mt-1 text-sm text-gray-500">
          企業から受け取った求人票ファイルを取り込み、必要項目を一覧化して、自社標準の求人表へ整理する前提で画面を整えています。
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-[var(--color-secondary)] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[var(--color-text-dark)]">取込フロー</h2>
          <div className="mt-4 space-y-3">
            {[
              "求人票ファイルをアップロード",
              "AI で必要項目を抽出",
              "標準フォーマットに変換",
              "候補者向け求人表として保存",
            ].map((step, index) => (
              <div key={step} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-[var(--color-light)] px-4 py-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)] text-xs font-semibold text-[var(--color-primary-hover)]">
                  {index + 1}
                </span>
                <p className="text-sm text-[var(--color-text-dark)]">{step}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-secondary)] bg-[var(--color-light)] px-4 py-10 text-center text-sm text-gray-500">
            求人票取込エリア
            <div className="mt-2 text-xs text-gray-400">PDF / Excel / 画像ファイルの受け皿をここに実装予定</div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--color-secondary)] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-dark)]">標準フォーマット</h2>
              <p className="mt-1 text-sm text-gray-500">
                AI で抜いた内容を、候補者紹介用の見やすい求人表に変換します。
              </p>
            </div>
            <span className="rounded-full bg-[var(--color-light)] px-3 py-1 text-xs font-medium text-[var(--color-primary-hover)]">
              自社Style
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {STANDARD_FIELDS.map((field) => (
              <div key={field} className="rounded-2xl border border-gray-200 bg-[var(--color-light)] px-4 py-3">
                <p className="text-xs text-gray-500">{field}</p>
                <p className="mt-2 text-sm text-[var(--color-text-dark)]">ここに抽出結果を表示</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-[var(--color-text-dark)]">候補者向け求人票の保存先</p>
            <p className="mt-2 text-sm leading-7 text-gray-600">
              変換後の求人票は、企業ごとの案件にひも付けて保存し、候補者へ共有する前提です。次の段階で、案件管理・推薦リストと連動させます。
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
