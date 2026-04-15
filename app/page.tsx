import Link from "next/link";
import { requireCurrentAccount } from "@/lib/auth";

const FLOW = [
  {
    title: "候補者へ入力依頼フォームを送る",
    description:
      "候補者ごとの状況に応じたテンプレートを使って、必要情報とファイル提出を依頼します。",
    href: "/broadcast/onboarding-forms",
    label: "入力依頼フォームへ",
  },
  {
    title: "履歴書を作成する",
    description:
      "Google Docs テンプレートに合わせて履歴書を作成し、Google Drive の所定フォルダへ保管します。",
    href: "/resumes",
    label: "履歴書作成へ",
  },
  {
    title: "面談・事前確認を進める",
    description:
      "面談メモ、評価、補足情報を保管しながら、外部カレンダーと日程調整APIで予定を管理します。",
    href: "/calendar",
    label: "日程調整へ",
  },
  {
    title: "推薦リストを作成して企業へ共有する",
    description:
      "合格候補者を複数選択し、必要情報だけを整理した推薦リストを作成して共有します。",
    href: "/recommendations",
    label: "推薦リストへ",
  },
];

const MODULES = [
  { title: "候補者管理", href: "/personnel", body: "候補者の基本情報、連絡先、SNS導線をまとめて管理します。" },
  { title: "企業情報", href: "/companies", body: "企業情報は全アカウント共通で持ち、案件や推薦の土台にします。" },
  { title: "パートナー情報", href: "/partners", body: "海外パートナー情報も共通台帳として持ち、誰でも同じ情報を見られます。" },
  { title: "候補者チャット", href: "/chat", body: "候補者とのLINE / Messenger連絡を一元化します。" },
  { title: "求人票管理", href: "/job-postings", body: "企業から受けた求人票を整理し、自社フォーマットへ落とし込みます。" },
  { title: "案件・進捗管理", href: "/deals", body: "企業、パートナー、候補者の複数軸で案件を追いかけます。" },
  { title: "売上ダッシュボード", href: "/revenue", body: "進行中案件と確定売上を見える化します。" },
  { title: "設定", href: "/settings", body: "各アカウントのカレンダーと管理者向けの共通設定を変更します。" },
];

export default async function Home() {
  const account = await requireCurrentAccount();

  return (
    <div className="space-y-8 p-8">
      <section className="rounded-[28px] border border-[#D8E7FF] bg-[linear-gradient(135deg,#F8FBFF_0%,#ECF5FF_100%)] p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.24em] text-[#2563EB]">SMILE MATCHING</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-[#0F172A]">
          {account.name}さんの人材紹介ダッシュボード
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-gray-600">
          候補者への入力依頼、履歴書作成、面談調整、推薦、入社進捗、売上確認までを一つの流れで管理するための社内システムです。
        </p>
        <p className="mt-2 max-w-4xl text-sm leading-7 text-gray-500">
          候補者・企業・パートナー・案件は全員共通で管理し、カレンダーや自分用テンプレートだけをアカウントごとに分けます。
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[#0F172A]">標準の進め方</h2>
            <p className="mt-1 text-sm text-gray-500">
              まずはこの流れで使い始めると、日々の運用が整理しやすくなります。
            </p>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {FLOW.map((step, index) => (
            <Link
              key={step.title}
              href={step.href}
              className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#BFDBFE] hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#DBEAFE] text-sm font-semibold text-[#1D4ED8]">
                  {index + 1}
                </div>
                <div>
                  <p className="text-base font-semibold text-[#0F172A]">{step.title}</p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{step.description}</p>
                  <p className="mt-4 text-sm font-medium text-[#2563EB]">{step.label} →</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A]">主要セクション</h2>
          <p className="mt-1 text-sm text-gray-500">
            今回の業務フローに合わせて、必要な機能をこの構造で整理しています。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((module) => (
            <Link
              key={module.title}
              href={module.href}
              className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-[#BFDBFE] hover:shadow-md"
            >
              <p className="text-base font-semibold text-[#0F172A]">{module.title}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">{module.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
