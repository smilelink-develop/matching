"use client";

import { useState } from "react";

type Deal = {
  id: number;
  title: string;
  companyName: string;
  candidateCount: number;
};

export default function RecommendationsClient({ deals }: { deals: Deal[] }) {
  const [dealId, setDealId] = useState(deals[0]?.id ? String(deals[0].id) : "");
  const [stageFilter, setStageFilter] = useState<string>("接続済み");
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    if (!dealId) {
      alert("案件を選択してください");
      return;
    }
    setDownloading(true);
    try {
      const url = `/api/recommendations/csv?dealId=${dealId}&stage=${encodeURIComponent(stageFilter)}`;
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text();
        alert(`CSV出力に失敗しました: ${text}`);
        return;
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const deal = deals.find((d) => String(d.id) === dealId);
      const date = new Date().toISOString().slice(0, 10);
      a.download = `${deal?.companyName ?? "company"}_${deal?.title ?? "deal"}_推薦リスト_${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[var(--color-secondary)] bg-white p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
        <Field label="案件">
          <select className={INPUT} value={dealId} onChange={(e) => setDealId(e.target.value)}>
            {deals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.companyName} / {deal.title} ({deal.candidateCount}名)
              </option>
            ))}
          </select>
        </Field>
        <Field label="対象ステージ">
          <select className={INPUT} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="接続済み">接続済みのみ</option>
            <option value="事前面談済み">事前面談済みのみ</option>
            <option value="推薦済み">推薦済みのみ</option>
            <option value="内定済み">内定済みのみ</option>
            <option value="all">すべて</option>
          </select>
        </Field>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void download()}
            disabled={downloading}
            className="h-[42px] rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
          >
            {downloading ? "出力中..." : "CSV ダウンロード"}
          </button>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        出力される列: ID / 追加日付 / 候補者名 / カタカナ名 / 状況 / 性別 / 年齢 / 国籍 / 在留資格 / 現住所 /
        生年月日 / ビザ期限 / 特定技能経過年数 / 実習経験有無 / 日本語レベル / 現職の手取り額 / 履歴書 / 書類フォルダ
      </p>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}

const INPUT =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";
