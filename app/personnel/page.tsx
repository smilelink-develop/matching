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
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">人材一覧</h1>
          <p className="text-sm text-gray-500 mt-1">{persons.length} 件</p>
        </div>
        <Link
          href="/personnel/new"
          className="bg-[#2563EB] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#1D4ED8] transition-colors"
        >
          + 人材を追加
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#EFF6FF] text-[#0F172A]">
              <th className="text-left px-4 py-3 font-semibold">名前</th>
              <th className="text-left px-4 py-3 font-semibold">国籍</th>
              <th className="text-left px-4 py-3 font-semibold">部署</th>
              <th className="text-left px-4 py-3 font-semibold">在留資格</th>
              <th className="text-left px-4 py-3 font-semibold">連絡手段</th>
              <th className="text-left px-4 py-3 font-semibold">ID紐づけ</th>
              <th className="px-4 py-3"></th>
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB] text-sm font-bold text-white">
                          {p.name[0]}
                        </div>
                      )}
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.nationality}</td>
                  <td className="px-4 py-3 text-gray-600">{p.department ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-600">{p.residenceStatus}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[#EFF6FF] text-[#2563EB]">
                      {CHANNEL_LABEL[p.channel] ?? p.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {hasId ? (
                      <span className="text-green-600 text-xs font-medium">登録済み</span>
                    ) : (
                      <span className="text-gray-400 text-xs">未登録</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/personnel/${p.id}/edit`}
                      className="text-[#2563EB] text-xs hover:underline"
                    >
                      編集
                    </Link>
                  </td>
                </tr>
              );
            })}
            {persons.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  人材が登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
