import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentAccount } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PartnerLinkPage() {
  await requireCurrentAccount();
  const partners = await prisma.partner.findMany({
    orderBy: [{ linkStatus: "asc" }, { name: "asc" }],
  });

  const pending = partners.filter((partner) => partner.linkStatus !== "完了");
  const completed = partners.filter((partner) => partner.linkStatus === "完了");

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">連絡先紐づけ</h1>
        <p className="mt-1 text-sm text-gray-500">
          海外パートナーの連絡先(LINE / Messenger / WhatsApp など)の紐づけ状況を管理します。紐づけが済んだらパートナー編集画面で「完了」に更新してください。
        </p>
      </div>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--color-text-dark)]">未紐づけ ({pending.length}件)</h2>
          <Link href="/partners" className="text-xs text-[var(--color-primary)] hover:underline">
            パートナー管理へ
          </Link>
        </div>
        <div className="mt-4 space-y-2">
          {pending.map((partner) => (
            <div
              key={partner.id}
              className="flex items-center justify-between rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-dark)]">{partner.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {partner.country ?? "国未設定"} / {partner.channel ?? "連絡手段未設定"}
                </p>
              </div>
              <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-xs text-[#92400E]">未</span>
            </div>
          ))}
          {pending.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
              未紐づけのパートナーはいません
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[var(--color-text-dark)]">紐づけ完了 ({completed.length}件)</h2>
        <div className="mt-4 space-y-2">
          {completed.map((partner) => (
            <div
              key={partner.id}
              className="flex items-center justify-between rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-dark)]">{partner.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {partner.country ?? "国未設定"} / {partner.channel ?? "連絡手段未設定"}
                </p>
              </div>
              <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-xs text-[#166534]">完了</span>
            </div>
          ))}
          {completed.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
              紐づけ完了のパートナーはいません
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
