"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type InvoiceRow = {
  id: number;
  personId: number | null;
  personName: string | null;
  dealId: number | null;
  dealTitle: string | null;
  companyName: string | null;
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

type TaskItem = {
  id: string;
  invoiceId: number;
  kind: "invoice" | "payment";
  label: string;
  detail: string;
  amount: number;
  dueLabel: string | null;
  person: string | null;
  personId: number | null;
  done: boolean;
};

function parseNumber(value: string | null): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d.-]/g, "");
  return Number(cleaned) || 0;
}

export default function InvoicesDashboard({ invoices: initialInvoices }: { invoices: InvoiceRow[] }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [filter, setFilter] = useState<"pending" | "done" | "all">("pending");

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

  const tasks = useMemo<TaskItem[]>(() => {
    const list: TaskItem[] = [];
    for (const invoice of invoices) {
      const invoiceDone = invoice.invoiceStatus === "送付済み" || invoice.invoiceStatus === "入金済み";
      list.push({
        id: `invoice-${invoice.id}`,
        invoiceId: invoice.id,
        kind: "invoice",
        label: `${invoice.companyName ?? "企業未設定"} へ請求書送付`,
        detail: invoice.dealTitle ?? "案件未設定",
        amount: parseNumber(invoice.invoiceAmount),
        dueLabel: invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("ja-JP") : null,
        person: invoice.personName,
        personId: invoice.personId,
        done: invoiceDone,
      });
      if (invoice.channel === "PA") {
        list.push({
          id: `pa-pay-${invoice.id}`,
          invoiceId: invoice.id,
          kind: "payment",
          label: `${invoice.partnerName ?? "パートナー"} へ仕入支払い`,
          detail: invoice.dealTitle ?? "案件未設定",
          amount: parseNumber(invoice.costAmount),
          dueLabel: invoice.paPaidAt ? new Date(invoice.paPaidAt).toLocaleDateString("ja-JP") : null,
          person: invoice.personName,
          personId: invoice.personId,
          done: invoice.paPaid,
        });
      }
    }
    return list;
  }, [invoices]);

  const pendingTasks = tasks.filter((task) => !task.done);
  const doneTasks = tasks.filter((task) => task.done);

  const markInvoiceDone = async (invoiceId: number) => {
    await updateInvoice(invoiceId, { invoiceStatus: "送付済み" });
  };
  const markInvoicePaid = async (invoiceId: number) => {
    await updateInvoice(invoiceId, { invoiceStatus: "入金済み" });
  };
  const togglePaPaid = async (invoiceId: number, next: boolean) => {
    await updateInvoice(invoiceId, {
      paPaid: next,
      paPaidAt: next ? new Date().toISOString() : null,
    });
  };
  const reopenInvoice = async (invoiceId: number) => {
    await updateInvoice(invoiceId, { invoiceStatus: "未送付" });
  };

  const totals = useMemo(() => {
    const pendingInvoiceAmount = tasks
      .filter((t) => t.kind === "invoice" && !t.done)
      .reduce((sum, t) => sum + t.amount, 0);
    const pendingPaAmount = tasks
      .filter((t) => t.kind === "payment" && !t.done)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalInvoiced = invoices.reduce((sum, inv) => sum + parseNumber(inv.invoiceAmount), 0);
    const totalPaid = invoices
      .filter((inv) => inv.invoiceStatus === "入金済み")
      .reduce((sum, inv) => sum + parseNumber(inv.invoiceAmount), 0);
    return { pendingInvoiceAmount, pendingPaAmount, totalInvoiced, totalPaid };
  }, [tasks, invoices]);

  const filteredInvoices = invoices.filter((invoice) => {
    if (filter === "pending") {
      return invoice.invoiceStatus !== "送付済み" && invoice.invoiceStatus !== "入金済み";
    }
    if (filter === "done") {
      return invoice.invoiceStatus === "送付済み" || invoice.invoiceStatus === "入金済み";
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Summary */}
      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="未対応タスク" value={`${pendingTasks.length}件`} tone="alert" />
        <SummaryCard label="企業請求 未送付合計" value={`${totals.pendingInvoiceAmount.toLocaleString()}円`} />
        <SummaryCard label="PA支払い 未払合計" value={`${totals.pendingPaAmount.toLocaleString()}円`} />
        <SummaryCard
          label="今期請求/入金"
          value={`${totals.totalPaid.toLocaleString()} / ${totals.totalInvoiced.toLocaleString()}円`}
        />
      </section>

      {/* Tasks */}
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-text-dark)]">対応タスク</h2>
          <p className="text-xs text-gray-500">完了チェックで自動同期</p>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold text-[#92400E]">未対応 ({pendingTasks.length}件)</p>
          {pendingTasks.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
              すべての請求・支払いが完了しています
            </p>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onInvoiceSent={() => void markInvoiceDone(task.invoiceId)}
                  onInvoicePaid={() => void markInvoicePaid(task.invoiceId)}
                  onPaPaid={() => void togglePaPaid(task.invoiceId, true)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-xs font-semibold text-[#166534]">対応済み ({doneTasks.length}件)</p>
          {doneTasks.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-4 text-center text-xs text-gray-400">
              まだ完了タスクはありません
            </p>
          ) : (
            <div className="space-y-2">
              {doneTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onReopenInvoice={() => void reopenInvoice(task.invoiceId)}
                  onUnpa={() => void togglePaPaid(task.invoiceId, false)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Invoice list */}
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--color-text-dark)]">請求一覧</h2>
          <div className="flex gap-1">
            {(["pending", "done", "all"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-lg border px-3 py-1 text-xs ${
                  filter === value
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {value === "pending" ? "未対応のみ" : value === "done" ? "対応済み" : "すべて"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="bg-[var(--color-light)] text-left text-xs font-semibold text-gray-600">
                <th className="px-3 py-2">ステータス</th>
                <th className="px-3 py-2">候補者</th>
                <th className="px-3 py-2">企業 / 案件</th>
                <th className="px-3 py-2">区分</th>
                <th className="px-3 py-2 text-right">請求額</th>
                <th className="px-3 py-2 text-right">仕入</th>
                <th className="px-3 py-2">PA支払</th>
                <th className="px-3 py-2">請求日</th>
                <th className="px-3 py-2">リンク</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <span className={statusBadge(invoice.invoiceStatus)}>{invoice.invoiceStatus}</span>
                  </td>
                  <td className="px-3 py-2">
                    {invoice.personId ? (
                      <Link href={`/personnel/${invoice.personId}/edit`} className="text-[var(--color-primary)] hover:underline">
                        {invoice.personName ?? "-"}
                      </Link>
                    ) : (
                      invoice.personName ?? "-"
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {invoice.companyName ?? "-"} / {invoice.dealTitle ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-xs">{invoice.channel}</td>
                  <td className="px-3 py-2 text-right">{parseNumber(invoice.invoiceAmount).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-gray-500">
                    {invoice.channel === "PA" ? parseNumber(invoice.costAmount).toLocaleString() : "-"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {invoice.channel === "PA" ? (
                      <span
                        className={
                          invoice.paPaid
                            ? "rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[#166534]"
                            : "rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[#92400E]"
                        }
                      >
                        {invoice.paPaid ? "支払済" : "未払"}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString("ja-JP") : "-"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {invoice.invoiceUrl ? (
                      <a href={invoice.invoiceUrl} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] underline">
                        請求書
                      </a>
                    ) : null}
                    {invoice.paInvoiceUrl ? (
                      <a href={invoice.paInvoiceUrl} target="_blank" rel="noreferrer" className="ml-2 text-gray-500 underline">
                        PA
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-gray-400">
                    該当する請求はありません
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function TaskRow({
  task,
  onInvoiceSent,
  onInvoicePaid,
  onPaPaid,
  onReopenInvoice,
  onUnpa,
}: {
  task: TaskItem;
  onInvoiceSent?: () => void;
  onInvoicePaid?: () => void;
  onPaPaid?: () => void;
  onReopenInvoice?: () => void;
  onUnpa?: () => void;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
        task.done
          ? "border-[#BBF7D0] bg-[#F0FDF4]"
          : task.kind === "payment"
            ? "border-[#FEF3C7] bg-[#FFFBEB]"
            : "border-[#FECACA] bg-[#FEF2F2]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${task.done ? "text-[#166534] line-through" : "text-[var(--color-text-dark)]"}`}>
          {task.kind === "invoice" ? "📨" : "💸"} {task.label}
        </p>
        <p className="mt-0.5 text-xs text-gray-600">
          {task.detail}
          {task.person ? (
            <>
              {" "}
              / 候補者:{" "}
              {task.personId ? (
                <Link href={`/personnel/${task.personId}/edit`} className="text-[var(--color-primary)] hover:underline">
                  {task.person}
                </Link>
              ) : (
                task.person
              )}
            </>
          ) : null}
          {task.amount > 0 ? <> / {task.amount.toLocaleString()}円</> : null}
          {task.dueLabel ? <> / {task.dueLabel}</> : null}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {!task.done && task.kind === "invoice" ? (
          <>
            <button
              type="button"
              onClick={onInvoiceSent}
              className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)]"
            >
              送付済みにする
            </button>
            <button
              type="button"
              onClick={onInvoicePaid}
              className="rounded-lg border border-[var(--color-primary)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-light)]"
            >
              入金済みにする
            </button>
          </>
        ) : null}
        {!task.done && task.kind === "payment" ? (
          <button
            type="button"
            onClick={onPaPaid}
            className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            支払い済みにする
          </button>
        ) : null}
        {task.done && task.kind === "invoice" ? (
          <button
            type="button"
            onClick={onReopenInvoice}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            未送付に戻す
          </button>
        ) : null}
        {task.done && task.kind === "payment" ? (
          <button
            type="button"
            onClick={onUnpa}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            未払に戻す
          </button>
        ) : null}
      </div>
    </div>
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

function statusBadge(status: string) {
  if (status === "入金済み") return "rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-medium text-[#166534]";
  if (status === "送付済み") return "rounded-full bg-[#DBEAFE] px-2.5 py-0.5 text-[11px] font-medium text-[#1D4ED8]";
  if (status === "保留") return "rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600";
  return "rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[11px] font-medium text-[#92400E]";
}
