import Link from "next/link";
import PortalFrame from "../_components/PortalFrame";
import { getPortalOnboarding, getPortalPerson } from "../_components/portal-data";

export const dynamic = "force-dynamic";

export default async function PortalHomePage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  const person = await getPortalPerson(personId);
  const { onboarding, tasks } = await getPortalOnboarding(personId);

  const onboardingTask = {
    id: "onboarding",
    title: "初期登録フォームを提出",
    description: "個人情報、住所、緊急連絡先、顔写真を入力してください。",
    href: `/portal/${person.id}/profile`,
    dueDate: null as string | null,
    status: onboarding?.status === "submitted" ? "completed" : "pending",
    completedAt: onboarding?.submittedAt?.toISOString() ?? null,
  };

  const requestedTasks = tasks.map((task) => ({
    id: `task-${task.id}`,
    title: task.title,
    description: task.description ?? "",
    href: task.href || defaultHrefForTask(person.id, task.type),
    dueDate: task.dueDate?.toISOString() ?? null,
    status: task.status,
    completedAt: task.completedAt?.toISOString() ?? null,
  }));

  const allTasks = [onboardingTask, ...requestedTasks];
  const pendingTasks = allTasks.filter((task) => task.status === "pending");
  const completedTasks = allTasks.filter((task) => task.status === "completed");

  return (
    <PortalFrame person={person}>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-[24px] border border-[#D8E6F8] bg-white/94 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-4 border-b border-[#D8E6F8] bg-[linear-gradient(135deg,_#2563EB_0%,_#4F9BFF_100%)] px-5 py-4 text-white">
            <div>
              <p className="text-sm font-semibold">対応が必要</p>
              <p className="mt-1 text-xs text-white/80">
                {pendingTasks.length === 0
                  ? "現在、対応が必要な依頼はありません"
                  : `${pendingTasks.length} 件の依頼があります`}
              </p>
            </div>
            <div className="rounded-full bg-white/18 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20">
              {pendingTasks.length} 件
            </div>
          </div>

          <div className="bg-[#F9FBFF] px-3 py-3">
            {pendingTasks.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-[#D6E4F5] bg-white px-4 py-5">
                <p className="text-sm font-semibold text-[#0F172A]">すべて対応済みです</p>
                <p className="mt-1 text-xs leading-5 text-[#64748B]">
                  新しい依頼が届いたときだけ、ここにタスクが表示されます。
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    title={task.title}
                    description={task.description}
                    href={task.href}
                    dueDate={task.dueDate}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <details className="overflow-hidden rounded-[20px] border border-[#D8E6F8] bg-white/82">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm font-medium text-[#334155]">対応済み</p>
                <p className="mt-1 text-xs text-[#94A3B8]">{completedTasks.length} 件</p>
              </div>
              <span className="text-[#94A3B8]">▾</span>
            </div>
          </summary>
          <div className="border-t border-[#E6EEF8] bg-[#F8FBFF] px-3 py-3">
            {completedTasks.length === 0 ? (
              <p className="px-1 text-sm text-[#64748B]">まだ完了したタスクはありません。</p>
            ) : (
              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <div key={task.id} className="rounded-[16px] border border-[#E3EBF7] bg-white px-4 py-3">
                    <p className="text-sm font-medium text-[#0F172A]">{task.title}</p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {task.completedAt ? `対応済み: ${formatDate(task.completedAt)}` : "対応済み"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      </div>
    </PortalFrame>
  );
}

function TaskCard({
  title,
  description,
  href,
  dueDate,
}: {
  title: string;
  description: string;
  href: string;
  dueDate: string | null;
}) {
  const dueTone = getDueTone(dueDate);

  return (
    <Link
      href={href}
      className="block rounded-[18px] border border-[#DEE8F5] bg-white px-4 py-3.5 transition-colors hover:border-[#C9DCF3] hover:bg-[#FCFDFF]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#0F172A]">{title}</p>
          <p className="mt-1 text-[12px] leading-5 text-[#64748B]">{description}</p>
        </div>
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dueTone.dot}`} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${dueTone.badge}`}>
          {dueTone.label}
        </span>
        <span className="text-[12px] font-medium text-[#2563EB]">開く →</span>
      </div>
    </Link>
  );
}

function getDueTone(dueDate: string | null) {
  if (!dueDate) {
    return {
      label: "期限未設定",
      badge: "bg-slate-100 text-slate-500",
      dot: "bg-slate-300",
    };
  }

  const today = new Date();
  const target = new Date(dueDate);
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: `期限切れ ${formatDate(dueDate)}`,
      badge: "bg-red-100 text-red-600",
      dot: "bg-red-500",
    };
  }

  if (diffDays <= 7) {
    return {
      label: `期限 ${formatDate(dueDate)}`,
      badge: "bg-amber-100 text-amber-700",
      dot: "bg-amber-400",
    };
  }

  return {
    label: `期限 ${formatDate(dueDate)}`,
    badge: "bg-[#EFF6FF] text-[#2563EB]",
    dot: "bg-[#2563EB]",
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultHrefForTask(personId: number, type: string) {
  if (type === "documents") return `/portal/${personId}/documents`;
  if (type === "schedule") return `/portal/${personId}/schedule`;
  return `/portal/${personId}/profile`;
}
