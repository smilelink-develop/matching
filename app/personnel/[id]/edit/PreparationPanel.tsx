"use client";

import { useState } from "react";

/**
 * 事前面談の準備パネル。
 * 履歴書取込 → フォーム送信 → 本人の回答 → 面談 の 4 ステップの進行状況を
 * 候補者詳細の最上部に常設表示する。
 *
 * 各ステップの判定はサーバー側 (page.tsx) で計算して props で受け取る。
 */
export type PreparationState = {
  /** Step1: 履歴書 (原本ファイル or AI 抽出) が取り込まれているか */
  resumeImported: boolean;
  /** AI 抽出で埋まっている主要項目数 (表示用) */
  extractedFieldCount: number;
  /** Step2: intake フォーム URL 発行済みか */
  intakeIssued: boolean;
  intakeToken: string | null;
  /** Step3: 必須質問の回答状況 */
  mustTotal: number;
  mustAnswered: number;
  /** 未回答の必須質問ラベル (最大 5 件に切って渡す) */
  unansweredLabels: string[];
};

export default function PreparationPanel({
  personName,
  state,
}: {
  personName: string;
  state: PreparationState;
}) {
  const [copied, setCopied] = useState(false);

  const step3Done = state.mustTotal > 0 && state.mustAnswered >= state.mustTotal;
  const answering = state.intakeIssued && !step3Done;

  const copyRemind = async () => {
    if (!state.intakeToken) return;
    const url = `${window.location.origin}/intake/${state.intakeToken}`;
    const text =
      `${personName} さん、こんにちは。SMILEVISA です。\n` +
      `面談の前に、こちらのフォームへのご回答をお願いします (5分くらいで終わります)。\n` +
      `Please answer this form before the interview (about 5 minutes).\n${url}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      prompt("コピーできませんでした。以下を手動でコピーしてください:", text);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">事前面談の準備</p>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Step 1: 履歴書取込 */}
        <StepCard
          done={state.resumeImported}
          active={!state.resumeImported}
          title="1. 履歴書取込"
          doneNote={`AI 読み取り済み${state.extractedFieldCount > 0 ? ` ・ ${state.extractedFieldCount} 項目` : ""}`}
          pendingNote="上の ✨ ボタンから履歴書を AI 取込み"
        />

        {/* Step 2: フォーム送信 */}
        <StepCard
          done={state.intakeIssued}
          active={state.resumeImported && !state.intakeIssued}
          title="2. フォーム送信"
          doneNote={`URL 発行済み ・ 必須 ${state.mustTotal} 問`}
          pendingNote="上の ✈ ボタンからフォーム URL を発行"
        />

        {/* Step 3: 本人の回答 */}
        <StepCard
          done={step3Done}
          active={answering}
          title="3. 本人の回答"
          doneNote="全問回答済み"
          pendingNote={
            state.intakeIssued
              ? `${state.mustAnswered} / ${state.mustTotal} 問 回答済み`
              : "フォーム送信後に表示"
          }
          extra={
            answering && state.intakeToken ? (
              <button
                type="button"
                onClick={() => void copyRemind()}
                className="mt-2 rounded-lg border border-[var(--color-primary)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-light)]"
              >
                {copied ? "コピーしました" : "リマインド文をコピー"}
              </button>
            ) : null
          }
        />

        {/* Step 4: 面談へ */}
        <StepCard
          done={false}
          active={step3Done}
          title="4. 面談へ"
          doneNote=""
          pendingNote={step3Done ? "準備完了。面談に進めます" : "全問回答で準備完了"}
        />
      </div>

      {/* 未回答の必須質問 */}
      {state.intakeIssued && !step3Done && state.unansweredLabels.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          <span className="text-[11px] text-gray-500">未回答:</span>
          {state.unansweredLabels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[11px] font-medium text-[#92400E]"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StepCard({
  done,
  active,
  title,
  doneNote,
  pendingNote,
  extra,
}: {
  done: boolean;
  active: boolean;
  title: string;
  doneNote: string;
  pendingNote: string;
  extra?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        done
          ? "border-[#BBF7D0] bg-[#F0FDF4]"
          : active
            ? "border-2 border-[var(--color-primary)] bg-white"
            : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {done ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <span
            className={`inline-block h-2 w-2 rounded-full ${active ? "bg-[var(--color-primary)]" : "bg-gray-300"}`}
          />
        )}
        <span
          className={`text-[12px] font-semibold ${
            done ? "text-[#15803D]" : active ? "text-[var(--color-primary)]" : "text-gray-400"
          }`}
        >
          {title}
        </span>
      </div>
      <p className={`mt-1 text-[11px] ${done ? "text-[#166534]" : active ? "text-gray-600" : "text-gray-400"}`}>
        {done ? doneNote : pendingNote}
      </p>
      {extra}
    </div>
  );
}
