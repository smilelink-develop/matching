import PortalFrame from "../../_components/PortalFrame";
import { getPortalPerson } from "../../_components/portal-data";

export const dynamic = "force-dynamic";

const SLOTS = [
  "4/18(木) 10:00 - 10:30",
  "4/18(木) 15:00 - 15:30",
  "4/19(金) 11:00 - 11:30",
  "4/20(土) 13:00 - 13:30",
];

export default async function PortalSchedulePage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  const person = await getPortalPerson(personId);

  return (
    <PortalFrame person={person}>
      <div className="space-y-4">
        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold text-[var(--color-text-dark)]">今回の依頼</p>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">
            入社前面談の日程を1つ選択してください。都合が悪い場合は別日程希望も送れる設計です。
          </p>
        </section>

        <section className="space-y-3">
          {SLOTS.map((slot, index) => (
            <button
              key={slot}
              className={`w-full rounded-[24px] border px-5 py-4 text-left shadow-[0_14px_38px_rgba(15,23,42,0.08)] transition-colors ${
                index === 1
                  ? "border-[var(--color-primary)] bg-[var(--color-light)]"
                  : "border-white/80 bg-white/90"
              }`}
            >
              <p className="text-base font-semibold text-[var(--color-text-dark)]">{slot}</p>
              <p className="mt-1 text-sm text-[#64748B]">
                {index === 1 ? "選択中の候補" : "この時間で希望を送る"}
              </p>
            </button>
          ))}
        </section>

        <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold text-[var(--color-text-dark)]">別日程を希望する場合</p>
          <textarea
            className="mt-3 min-h-28 w-full rounded-2xl border border-[var(--color-secondary)] bg-[var(--color-light)] px-4 py-3 text-sm text-[var(--color-text-dark)] outline-none"
            defaultValue="午前中が難しいため、午後の候補日を希望します。"
          />
          <button className="mt-4 w-full rounded-2xl bg-[var(--color-primary)] px-4 py-3 text-sm font-medium text-white shadow-[0_12px_24px_rgba(37,99,235,0.2)]">
            希望を送信する
          </button>
        </section>
      </div>
    </PortalFrame>
  );
}
