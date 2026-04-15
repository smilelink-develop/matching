import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PortalIndexPage() {
  const persons = await prisma.person.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      name: true,
      nationality: true,
      residenceStatus: true,
    },
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#FFFFFF_0%,_#EAF4FF_42%,_#D7E9FF_100%)] px-4 py-8">
      <div className="mx-auto max-w-[430px] space-y-5">
        <div className="rounded-[28px] bg-white/85 p-6 shadow-[0_18px_60px_rgba(37,99,235,0.12)]">
          <p className="text-xs font-semibold tracking-[0.24em] text-[#2563EB]">USER PORTAL</p>
          <h1 className="mt-3 text-3xl font-bold text-[#0F172A]">ユーザー側ポータル</h1>
          <p className="mt-3 text-sm leading-6 text-[#475569]">
            管理側から人材ごとのURLを送る想定で、スマホ向けのポータルを先に設計しています。下の一覧から表示確認できます。
          </p>
        </div>

        <div className="space-y-3">
          {persons.map((person) => (
            <Link
              key={person.id}
              href={`/portal/${person.id}`}
              className="block rounded-[24px] border border-white/80 bg-white/85 p-5 shadow-[0_12px_36px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-[#0F172A]">{person.name}</p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    {person.nationality} / {person.residenceStatus}
                  </p>
                </div>
                <span className="rounded-full bg-[#EFF6FF] px-3 py-1.5 text-xs font-medium text-[#2563EB]">
                  ポータルを開く
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
