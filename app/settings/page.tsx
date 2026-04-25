import { getAccountSettings, getCoreSettings } from "@/lib/app-settings";
import { requireCurrentAccount } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const account = await requireCurrentAccount();
  const [settings, coreSettings, accounts, resumeTemplates, jobPostingTemplates] = await Promise.all([
    getAccountSettings(account.id),
    getCoreSettings(),
    account.role === "admin"
      ? prisma.staffAccount.findMany({
          orderBy: [{ role: "asc" }, { loginId: "asc" }],
          select: {
            id: true,
            loginId: true,
            name: true,
            role: true,
          },
        })
      : Promise.resolve([]),
    prisma.resumeTemplate.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.jobPostingTemplate.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">設定</h1>
        <p className="mt-1 text-sm text-gray-500">
          カレンダー、自分用テンプレートの基盤、管理者向けの共通設定をここで管理します。
        </p>
      </div>
      <SettingsClient
        currentAccount={account}
        initialSettings={{
          ...settings,
          fixedQuestions: coreSettings.fixedQuestions,
          recommendationColumns: coreSettings.recommendationColumns,
          monthlyOfferTarget: coreSettings.monthlyOfferTarget,
          monthlyRevenueTarget: coreSettings.monthlyRevenueTarget,
        }}
        accounts={accounts}
        resumeTemplates={resumeTemplates.map((template) => ({
          id: template.id,
          name: template.name,
          templateUrl: template.templateUrl,
          driveFolderUrl: template.driveFolderUrl,
        }))}
        jobPostingTemplates={jobPostingTemplates.map((template) => ({
          id: template.id,
          name: template.name,
          templateUrl: template.templateUrl,
          driveFolderUrl: template.driveFolderUrl,
        }))}
      />
    </div>
  );
}
