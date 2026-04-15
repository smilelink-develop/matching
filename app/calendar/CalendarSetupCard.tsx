"use client";

import Link from "next/link";
import { useState } from "react";

export default function CalendarSetupCard() {
  const [calendarLabel, setCalendarLabel] = useState("");
  const [calendarEmbedUrl, setCalendarEmbedUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!calendarEmbedUrl.trim()) {
      alert("埋め込みURLを入力してください");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarLabel,
          calendarEmbedUrl,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(`保存失敗: ${data.error}`);
        return;
      }
      window.location.reload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <p className="text-lg font-semibold text-[#0F172A]">最初にカレンダーを設定します</p>
          <p className="mt-2 text-sm text-gray-500">
            Google Calendar や Outlook Calendar の埋め込みURLを登録すると、次回からこの画面で自動表示されます。
          </p>
        </div>

        <div className="space-y-4">
          <Field label="表示名">
            <input
              className={INPUT}
              value={calendarLabel}
              onChange={(event) => setCalendarLabel(event.target.value)}
              placeholder="Google Calendar"
            />
          </Field>

          <Field label="埋め込みURL">
            <input
              className={INPUT}
              value={calendarEmbedUrl}
              onChange={(event) => setCalendarEmbedUrl(event.target.value)}
              placeholder="https://calendar.google.com/calendar/embed?src=..."
            />
          </Field>
        </div>

        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50"
          >
            {saving ? "保存中..." : "この内容で設定"}
          </button>
          <Link
            href="/settings"
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm hover:bg-gray-50"
          >
            詳細設定へ
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}

const INPUT =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30";
