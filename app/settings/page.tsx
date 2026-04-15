import { getAppSettings } from "@/lib/app-settings";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getAppSettings();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">設定</h1>
        <p className="mt-1 text-sm text-gray-500">
          カレンダー連携と、初期登録フォームの固定質問を管理します。
        </p>
      </div>
      <SettingsClient initialSettings={settings} />
    </div>
  );
}
