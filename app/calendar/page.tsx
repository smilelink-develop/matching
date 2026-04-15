import Link from "next/link";
import { getAccountSettings } from "@/lib/app-settings";
import { requireCurrentAccount } from "@/lib/auth";
import CalendarSetupCard from "./CalendarSetupCard";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const account = await requireCurrentAccount();
  const settings = await getAccountSettings(account.id);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">カレンダー</h1>
        <p className="mt-1 text-sm text-gray-500">
          {account.name}さん専用の面談・予定カレンダーを表示します
        </p>
      </div>

      {settings.calendarEmbedUrl ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">
                  {settings.calendarLabel || "外部カレンダー"}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  設定済みのカレンダーをそのまま表示しています。
                </p>
              </div>
              <Link
                href="/settings"
                className="rounded-lg border border-[#2563EB] px-4 py-2 text-sm font-medium text-[#2563EB] hover:bg-[#EFF6FF]"
              >
                設定を開く
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <iframe
              src={settings.calendarEmbedUrl}
              title={settings.calendarLabel || "calendar"}
              className="h-[720px] w-full"
            />
          </div>
        </div>
      ) : (
        <CalendarSetupCard />
      )}
    </div>
  );
}
