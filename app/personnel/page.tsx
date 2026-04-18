import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CHANNEL_LABEL: Record<string, string> = {
  LINE: "LINE",
  Messenger: "Messenger",
  mail: "メール",
  WhatsApp: "WhatsApp",
};

export default async function PersonnelPage() {
  const persons = await prisma.person.findMany({
    include: {
      partner: { select: { name: true } },
      onboarding: { select: { phoneNumber: true, englishName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">候補者一覧</h1>
          <p className="text-sm text-gray-500 mt-1">{persons.length} 件</p>
        </div>
        <Link
          href="/personnel/new"
          className="bg-[var(--color-primary)] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          + 候補者を追加
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-light)] text-[var(--color-text-dark)]">
              <th className="text-left px-4 py-3 font-semibold">名前</th>
              <th className="text-left px-4 py-3 font-semibold">国籍</th>
              <th className="text-left px-4 py-3 font-semibold">英語名</th>
              <th className="text-left px-4 py-3 font-semibold">在留資格</th>
              <th className="text-left px-4 py-3 font-semibold">紹介パートナー</th>
              <th className="text-left px-4 py-3 font-semibold">連絡手段</th>
              <th className="text-left px-4 py-3 font-semibold">ID紐づけ</th>
            </tr>
          </thead>
          <tbody>
            {persons.map((p) => {
              const hasId =
                (p.channel === "LINE" && !!p.lineUserId) ||
                (p.channel === "Messenger" && !!p.messengerPsid) ||
                (p.channel === "mail" && !!p.email) ||
                (p.channel === "WhatsApp" && !!p.whatsappId);
              return (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/personnel/${p.id}/edit`} className="block -mx-4 -my-3 px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.photoUrl ? (
                          <Image
                            src={p.photoUrl}
                            alt={p.name}
                            width={40}
                            height={40}
                            unoptimized
                            className="h-10 w-10 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-sm font-bold text-white">
                            {p.name[0]}
                          </div>
                        )}
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600"><Link href={`/personnel/${p.id}/edit`} className="block -mx-4 -my-3 px-4 py-3">{p.nationality}</Link></td>
                  <td className="px-4 py-3 text-gray-600"><Link href={`/personnel/${p.id}/edit`} className="block -mx-4 -my-3 px-4 py-3">{p.onboarding?.englishName ?? "-"}</Link></td>
                  <td className="px-4 py-3 text-gray-600"><Link href={`/personnel/${p.id}/edit`} className="block -mx-4 -my-3 px-4 py-3">{p.residenceStatus}</Link></td>
                  <td className="px-4 py-3 text-gray-600"><Link href={`/personnel/${p.id}/edit`} className="block -mx-4 -my-3 px-4 py-3">{p.partner?.name ?? "未設定"}</Link></td>
                  <td className="px-4 py-3"><Link href={`/personnel/${p.id}/edit`} className="block -mx-4 -my-3 px-4 py-3"><span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-light)] text-[var(--color-primary)]">{CHANNEL_LABEL[p.channel] ?? p.channel}</span></Link></td>
                  <td className="px-4 py-3"><Link href={`/personnel/${p.id}/edit`} className="block -mx-4 -my-3 px-4 py-3">{hasId ? <span className="text-green-600 text-xs font-medium">登録済み</span> : <span className="text-gray-400 text-xs">未登録</span>}</Link></td>
                </tr>
              );
            })}
            {persons.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  候補者が登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
