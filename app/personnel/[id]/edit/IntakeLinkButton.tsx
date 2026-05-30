"use client";

import { useState } from "react";
import IntakeFormBuilderModal from "./IntakeFormBuilderModal";

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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
      >
        入力フォーム作成 / URL を発行
      </button>
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
