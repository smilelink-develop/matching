"use client";

import { useMemo, useState } from "react";
import type { FixedQuestionSetting } from "@/lib/app-settings";

type AccountSummary = {
  id: number;
  loginId: string;
  name: string;
  role: string;
};

export default function SettingsClient({
  initialSettings,
  currentAccount,
  accounts,
}: {
  initialSettings: {
    calendarEmbedUrl: string;
    calendarLabel: string;
    fixedQuestions: FixedQuestionSetting[];
  };
  currentAccount: {
    id: number;
    loginId: string;
    name: string;
    role: string;
  };
  accounts: AccountSummary[];
}) {
  const isAdmin = currentAccount.role === "admin";
  const [calendarEmbedUrl, setCalendarEmbedUrl] = useState(initialSettings.calendarEmbedUrl);
  const [calendarLabel, setCalendarLabel] = useState(initialSettings.calendarLabel);
  const [fixedQuestions, setFixedQuestions] = useState(initialSettings.fixedQuestions);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [fixedQuestionsOpen, setFixedQuestionsOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [passcodes, setPasscodes] = useState<Record<number, string>>({});
  const [switchingId, setSwitchingId] = useState<number | null>(null);
  const [savingPasscodeId, setSavingPasscodeId] = useState<number | null>(null);

  const accountRows = useMemo(() => accounts.filter((account) => account.id !== currentAccount.id), [accounts, currentAccount.id]);

  const saveCalendar = async () => {
    setSavingCalendar(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarEmbedUrl,
          calendarLabel,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(`保存失敗: ${data.error}`);
        return;
      }
      alert("自分のカレンダー設定を保存しました");
    } finally {
      setSavingCalendar(false);
    }
  };

  const clearCalendar = async () => {
    setCalendarEmbedUrl("");
    setCalendarLabel("");
    setSavingCalendar(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarEmbedUrl: "",
          calendarLabel: "",
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(`解除失敗: ${data.error}`);
        return;
      }
      alert("カレンダー連携を解除しました");
    } finally {
      setSavingCalendar(false);
    }
  };

  const saveFixedQuestions = async () => {
    setSavingQuestions(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fixedQuestions,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(`保存失敗: ${data.error}`);
        return;
      }
      setFixedQuestions(data.settings.fixedQuestions);
      alert("共通の固定質問を保存しました");
    } finally {
      setSavingQuestions(false);
    }
  };

  const updateFixedQuestion = (fixedKey: string, patch: Partial<FixedQuestionSetting>) => {
    setFixedQuestions((current) =>
      current.map((question) =>
        question.fixedKey === fixedKey ? { ...question, ...patch } : question
      )
    );
  };

  const switchAccount = async (accountId: number) => {
    setSwitchingId(accountId);
    try {
      const res = await fetch("/api/auth/switch-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(`切替失敗: ${data.error}`);
        return;
      }
      window.location.href = "/";
    } finally {
      setSwitchingId(null);
    }
  };

  const savePasscode = async (accountId: number) => {
    const passcode = passcodes[accountId]?.trim() ?? "";
    if (passcode.length < 6) {
      alert("パスコードは6文字以上で入力してください");
      return;
    }

    setSavingPasscodeId(accountId);
    try {
      const res = await fetch("/api/auth/passcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, passcode }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(`更新失敗: ${data.error}`);
        return;
      }
      setPasscodes((current) => ({ ...current, [accountId]: "" }));
      alert("パスコードを更新しました");
    } finally {
      setSavingPasscodeId(null);
    }
  };

  return (
    <div className="space-y-6">
      <SummaryCard currentAccount={currentAccount} />

      <SectionCard
        title="自分のカレンダー"
        description="各アカウントごとに Google / Outlook の面談カレンダーを登録できます。"
        open={calendarOpen}
        onToggle={() => setCalendarOpen((current) => !current)}
      >
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
          <div className="flex gap-3">
            <ActionButton onClick={saveCalendar} disabled={savingCalendar}>
              {savingCalendar ? "保存中..." : "自分のカレンダーを保存"}
            </ActionButton>
            <SecondaryButton onClick={clearCalendar} disabled={savingCalendar}>
              リンクを解除
            </SecondaryButton>
          </div>
        </div>
      </SectionCard>

      {isAdmin && (
        <SectionCard
          title="共通の初期入力ルール"
          description="候補者へ送る入力依頼フォームで、最初に必ず出る固定質問の内容を管理者だけが変更できます。"
          open={fixedQuestionsOpen}
          onToggle={() => setFixedQuestionsOpen((current) => !current)}
        >
          <div className="space-y-4">
            {fixedQuestions.map((question) => (
              <div
                key={question.fixedKey}
                className="rounded-2xl border border-gray-200 bg-[#FCFDFF] p-4"
              >
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_140px]">
                  <Field label="質問名">
                    <input
                      className={INPUT}
                      value={question.label}
                      onChange={(event) =>
                        updateFixedQuestion(question.fixedKey, { label: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="回答形式">
                    <select
                      className={INPUT}
                      value={question.type}
                      onChange={(event) =>
                        updateFixedQuestion(question.fixedKey, {
                          type: event.target.value === "file" ? "file" : "text",
                        })
                      }
                    >
                      <option value="text">テキスト</option>
                      <option value="file">ファイル</option>
                    </select>
                  </Field>
                  <Field label="必須設定">
                    <select
                      className={INPUT}
                      value={question.required ? "required" : "optional"}
                      onChange={(event) =>
                        updateFixedQuestion(question.fixedKey, {
                          required: event.target.value === "required",
                        })
                      }
                    >
                      <option value="required">必須</option>
                      <option value="optional">任意</option>
                    </select>
                  </Field>
                </div>
              </div>
            ))}
            <ActionButton onClick={saveFixedQuestions} disabled={savingQuestions}>
              {savingQuestions ? "保存中..." : "共通ルールを保存"}
            </ActionButton>
          </div>
        </SectionCard>
      )}

      {isAdmin && (
        <SectionCard
          title="アカウント管理"
          description="管理者は各メンバーのパスコード変更と、ログインなしでのアカウント切替ができます。"
          open={accountsOpen}
          onToggle={() => setAccountsOpen((current) => !current)}
        >
          <div className="space-y-4">
            {accountRows.map((account) => (
              <div
                key={account.id}
                className="rounded-2xl border border-gray-200 bg-[#FCFDFF] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{account.name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {account.loginId} / {account.role === "admin" ? "管理者" : "通常アカウント"}
                    </p>
                  </div>
                  <SecondaryButton
                    onClick={() => void switchAccount(account.id)}
                    disabled={switchingId === account.id}
                  >
                    {switchingId === account.id ? "切替中..." : "このアカウントに入る"}
                  </SecondaryButton>
                </div>
                <div className="mt-4 flex gap-3">
                  <input
                    className={INPUT}
                    type="password"
                    value={passcodes[account.id] ?? ""}
                    onChange={(event) =>
                      setPasscodes((current) => ({
                        ...current,
                        [account.id]: event.target.value,
                      }))
                    }
                    placeholder="新しいパスコード（6文字以上）"
                  />
                  <ActionButton
                    onClick={() => void savePasscode(account.id)}
                    disabled={savingPasscodeId === account.id}
                  >
                    {savingPasscodeId === account.id ? "更新中..." : "パスコード変更"}
                  </ActionButton>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function SummaryCard({
  currentAccount,
}: {
  currentAccount: {
    id: number;
    loginId: string;
    name: string;
    role: string;
  };
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold tracking-[0.18em] text-[#2563EB]">CURRENT ACCOUNT</p>
      <h2 className="mt-2 text-xl font-semibold text-[#0F172A]">{currentAccount.name}</h2>
      <p className="mt-1 text-sm text-gray-500">
        {currentAccount.loginId} / {currentAccount.role === "admin" ? "管理者" : "通常アカウント"}
      </p>
    </section>
  );
}

function SectionCard({
  title,
  description,
  open,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <Chevron expanded={open} />
      </button>

      {open && <div className="mt-5">{children}</div>}
    </section>
  );
}

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
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

function ActionButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50 ${props.className ?? ""}`}
    />
  );
}

function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-lg border border-gray-300 px-5 py-2.5 text-sm hover:bg-gray-50 disabled:opacity-50 ${props.className ?? ""}`}
    />
  );
}

const INPUT =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30";
