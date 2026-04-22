"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export type InvoiceRow = {
  id: number;
  personId: number | null;
  personName: string | null;
  dealId: number | null;
  dealTitle: string | null;
  companyId: number | null;
  companyName: string | null;
  partnerId: number | null;
  partnerName: string | null;
  invoiceDate: string | null;
  invoiceAmount: string | null;
  invoiceNumber: string | null;
  invoiceStatus: string;
  invoiceUrl: string | null;
  channel: string;
  costAmount: string | null;
  paInvoiceUrl: string | null;
  paPaid: boolean;
  paPaidAt: string | null;
  createdAt: string;
};

type TabKey = "companies" | "partners";

type CompanyTask = {
  invoiceId: number;
  companyId: number | null;
  companyName: string;
  dealTitle: string | null;
  personName: string | null;
  personId: number | null;
  amount: number;
  dueLabel: string | null;
  done: boolean;
};

type PartnerTask = {
  invoiceId: number;
  partnerId: number | null;
  partnerName: string;
  dealTitle: string | null;
  personName: string | null;
  personId: number | null;
  amount: number;
  dueLabel: string | null;
  done: boolean;
};

function parseNumber(value: string | null): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d.-]/g, "");
  return Number(cleaned) || 0;
}

export default function InvoicesDashboard({ invoices: initialInvoices }: { invoices: InvoiceRow[] }) {
  const searchParams = useSearchParams();
  const initialTab: TabKey = searchParams.get("tab") === "partners" ? "partners" : "companies";
  const [tab, setTab] = useState<TabKey>(initialTab);

  const [invoices, setInvoices] = useState(initialInvoices);

  const updateInvoice = async (id: number, patch: Partial<InvoiceRow>) => {
    const previous = invoices;
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...patch } : inv)));
    const response = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      setInvoices(previous);
      alert(result.error || "更新に失敗しました");
    }
  };

  const companyTasks = useMemo<CompanyTask[]>(
    () =>
      invoices.map((inv) => ({
        invoiceId: inv.id,
        companyId: inv.companyId,
        companyName: inv.companyName ?? "企業未設定",
        dealTitle: inv.dealTitle,
        personName: inv.personName,
        personId: inv.personId,
        amount: parseNumber(inv.invoiceAmount),
        dueLabel: inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("ja-JP") : null,
        done: inv.invoiceStatus === "送付済み" || inv.invoiceStatus === "入金済み",
      })),
    [invoices]
  );

  const partnerTasks = useMemo<PartnerTask[]>(
    () =>
      invoices
        .filter((inv) => inv.channel === "PA")
        .map((inv) => ({
          invoiceId: inv.id,
          partnerId: inv.partnerId,
          partnerName: inv.partnerName ?? "パートナー未設定",
          dealTitle: inv.dealTitle,
          personName: inv.personName,
          personId: inv.personId,
          amount: parseNumber(inv.costAmount),
          dueLabel: inv.paPaidAt ? new Date(inv.paPaidAt).toLocaleDateString("ja-JP") : null,
          done: inv.paPaid,
        })),
    [invoices]
  );

  const pendingCompanyCount = companyTasks.filter((t) => !t.done).length;
  const pendingPartnerCount = partnerTasks.filter((t) => !t.done).length;

  const totals = useMemo(() => {
    const pendingCompanyAmount = companyTasks.filter((t) => !t.done).reduce((s, t) => s + t.amount, 0);
    const pendingPartnerAmount = partnerTasks.filter((t) => !t.done).reduce((s, t) => s + t.amount, 0);
    const totalInvoiced = invoices.reduce((s, inv) => s + parseNumber(inv.invoiceAmount), 0);
    const totalPaid = invoices
      .filter((inv) => inv.invoiceStatus === "入金済み")
      .reduce((s, inv) => s + parseNumber(inv.invoiceAmount), 0);
    return { pendingCompanyAmount, pendingPartnerAmount, totalInvoiced, totalPaid };
  }, [companyTasks, partnerTasks, invoices]);

  const markInvoiceSent = (id: number) => void updateInvoice(id, { invoiceStatus: "送付済み" });
  const markInvoicePaid = (id: number) => void updateInvoice(id, { invoiceStatus: "入金済み" });
  const reopenInvoice = (id: number) => void updateInvoice(id, { invoiceStatus: "未送付" });
  const togglePaPaid = (id: number, next: boolean) =>
    void updateInvoice(id, {
      paPaid: next,
      paPaidAt: next ? new Date().toISOString() : null,
    });

  return (
    <div className="space-y-6">
      {/* Summary */}
      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="企業への請求 未対応"
          value={`${pendingCompanyCount}件 / ${totals.pendingCompanyAmount.toLocaleString()}円`}
          tone={pendingCompanyCount > 0 ? "alert" : "default"}
        />
        <SummaryCard
          label="PAへの請求 未対応"
          value={`${pendingPartnerCount}件 / ${totals.pendingPartnerAmount.toLocaleString()}円`}
          tone={pendingPartnerCount > 0 ? "alert" : "default"}
        />
        <SummaryCard
          label="入金 / 請求合計"
          value={`${totals.totalPaid.toLocaleString()} / ${totals.totalInvoiced.toLocaleString()}円`}
        />
      </section>

      {/* Tab switch */}
      <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setTab("companies")}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
            tab === "companies"
              ? "bg-[var(--color-primary)] text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          企業への請求 <span className="ml-1 text-xs">({pendingCompanyCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("partners")}
          className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
            tab === "partners"
              ? "bg-[var(--color-primary)] text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          PAへの請求 <span className="ml-1 text-xs">({pendingPartnerCount})</span>
        </button>
      </div>

      {tab === "companies" ? (
        <CompanySection
          tasks={companyTasks}
          onSent={markInvoiceSent}
          onPaid={markInvoicePaid}
          onReopen={reopenInvoice}
        />
      ) : (
        <PartnerSection
          tasks={partnerTasks}
          onPaid={(id) => togglePaPaid(id, true)}
          onUndoPaid={(id) => togglePaPaid(id, false)}
        />
      )}
    </div>
  );
}

function CompanySection({
  tasks,
  onSent,
  onPaid,
  onReopen,
}: {
  tasks: CompanyTask[];
  onSent: (id: number) => void;
  onPaid: (id: number) => void;
  onReopen: (id: number) => void;
}) {
  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[var(--color-text-dark)]">企業への請求タスク</h2>
      <p className="mt-1 text-xs text-gray-500">
        企業名をクリックすると企業詳細ページに移動します。
      </p>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold text-[#92400E]">未対応 ({pending.length}件)</p>
        {pending.length === 0 ? (
          <EmptyNote>未対応の企業請求はありません</EmptyNote>
        ) : (
          pending.map((t) => (
            <CompanyTaskRow key={`c-${t.invoiceId}`} task={t}>
              <button
                type="button"
                onClick={() => onSent(t.invoiceId)}
                className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)]"
              >
                送付済みにする
              </button>
              <button
                type="button"
                onClick={() => onPaid(t.invoiceId)}
                className="rounded-lg border border-[var(--color-primary)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-light)]"
              >
                入金済みにする
              </button>
            </CompanyTaskRow>
          ))
        )}
      </div>

      <div className="mt-6 space-y-2">
        <p className="text-xs font-semibold text-[#166534]">対応済み ({done.length}件)</p>
        {done.length === 0 ? (
          <EmptyNote muted>まだ完了タスクはありません</EmptyNote>
        ) : (
          done.map((t) => (
            <CompanyTaskRow key={`cd-${t.invoiceId}`} task={t}>
              <button
                type="button"
                onClick={() => onReopen(t.invoiceId)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                未送付に戻す
              </button>
            </CompanyTaskRow>
          ))
        )}
      </div>
    </section>
  );
}

function PartnerSection({
  tasks,
  onPaid,
  onUndoPaid,
}: {
  tasks: PartnerTask[];
  onPaid: (id: number) => void;
  onUndoPaid: (id: number) => void;
}) {
  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[var(--color-text-dark)]">PAへの請求タスク</h2>
      <p className="mt-1 text-xs text-gray-500">
        パートナー名をクリックするとパートナーリストに移動します。
      </p>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold text-[#92400E]">未対応 ({pending.length}件)</p>
        {pending.length === 0 ? (
          <EmptyNote>PA の未払いはありません</EmptyNote>
        ) : (
          pending.map((t) => (
            <PartnerTaskRow key={`p-${t.invoiceId}`} task={t}>
              <button
                type="button"
                onClick={() => onPaid(t.invoiceId)}
                className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)]"
              >
                支払い済みにする
              </button>
            </PartnerTaskRow>
          ))
        )}
      </div>

      <div className="mt-6 space-y-2">
        <p className="text-xs font-semibold text-[#166534]">対応済み ({done.length}件)</p>
        {done.length === 0 ? (
          <EmptyNote muted>まだ完了タスクはありません</EmptyNote>
        ) : (
          done.map((t) => (
            <PartnerTaskRow key={`pd-${t.invoiceId}`} task={t}>
              <button
                type="button"
                onClick={() => onUndoPaid(t.invoiceId)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                未払に戻す
              </button>
            </PartnerTaskRow>
          ))
        )}
      </div>
    </section>
  );
}

function CompanyTaskRow({ task, children }: { task: CompanyTask; children: React.ReactNode }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
        task.done ? "border-[#BBF7D0] bg-[#F0FDF4]" : "border-[#FECACA] bg-[#FEF2F2]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${task.done ? "text-[#166534] line-through" : "text-[var(--color-text-dark)]"}`}>
          📨{" "}
          {task.companyId ? (
            <Link href={`/companies/${task.companyId}`} className="hover:underline">
              {task.companyName}
            </Link>
          ) : (
            task.companyName
          )}{" "}
          へ請求書送付
        </p>
        <p className="mt-0.5 text-xs text-gray-600">
          {task.dealTitle ?? "案件未設定"}
          {task.personName ? (
            <>
              {" "}
              / 候補者:{" "}
              {task.personId ? (
                <Link href={`/personnel/${task.personId}/edit`} className="text-[var(--color-primary)] hover:underline">
                  {task.personName}
                </Link>
              ) : (
                task.personName
              )}
            </>
          ) : null}
          {task.amount > 0 ? <> / {task.amount.toLocaleString()}円</> : null}
          {task.dueLabel ? <> / {task.dueLabel}</> : null}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function PartnerTaskRow({ task, children }: { task: PartnerTask; children: React.ReactNode }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
        task.done ? "border-[#BBF7D0] bg-[#F0FDF4]" : "border-[#FEF3C7] bg-[#FFFBEB]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${task.done ? "text-[#166534] line-through" : "text-[var(--color-text-dark)]"}`}>
          💸{" "}
          <Link href="/partners" className="hover:underline">
            {task.partnerName}
          </Link>{" "}
          へ仕入支払い
        </p>
        <p className="mt-0.5 text-xs text-gray-600">
          {task.dealTitle ?? "案件未設定"}
          {task.personName ? (
            <>
              {" "}
              / 候補者:{" "}
              {task.personId ? (
                <Link href={`/personnel/${task.personId}/edit`} className="text-[var(--color-primary)] hover:underline">
                  {task.personName}
                </Link>
              ) : (
                task.personName
              )}
            </>
          ) : null}
          {task.amount > 0 ? <> / {task.amount.toLocaleString()}円</> : null}
          {task.dueLabel ? <> / {task.dueLabel}</> : null}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function EmptyNote({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <p
      className={`rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm ${
        muted ? "text-gray-400" : "text-gray-500"
      }`}
    >
      {children}
    </p>
  );
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "alert" }) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${
        tone === "alert" ? "border-[#FECACA] bg-[#FEF2F2]" : "border-gray-200 bg-white"
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-2 text-xl font-bold ${tone === "alert" ? "text-[#B91C1C]" : "text-[var(--color-text-dark)]"}`}>
        {value}
      </p>
    </div>
  );
}
