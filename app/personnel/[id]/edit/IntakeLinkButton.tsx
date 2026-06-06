"use client";

import { useState } from "react";
import IntakeFormBuilderModal from "./IntakeFormBuilderModal";
import IconTooltip from "./IconTooltip";

type Answers = {
  motivation: string;
  selfIntroduction: string;
  japanPurpose: string;
  currentJob: string;
  retirementReason: string;
  interviewAnswers: Record<string, string>;
};

export default function IntakeLinkButton({
  personId,
  personName,
  answers,
}: {
  personId: number;
  personName: string;
  answers: Answers;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconTooltip label="入力フォーム作成 / 送信">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--color-primary)] transition-transform hover:scale-110 hover:bg-[var(--color-light)]"
        >
          <PaperPlaneIcon />
        </button>
      </IconTooltip>
      {open ? (
        <IntakeFormBuilderModal
          personId={personId}
          personName={personName}
          answers={answers}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function PaperPlaneIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* 紙飛行機 (送信アイコン) */}
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
