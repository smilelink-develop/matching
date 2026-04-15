import Image from "next/image";
import Link from "next/link";
import PortalAvatar from "./PortalAvatar";

type PortalPerson = {
  id: number;
  name: string;
  nationality: string;
  residenceStatus: string;
  department: string | null;
  photoUrl: string | null;
};

export default function PortalFrame({
  person,
  children,
}: {
  person: PortalPerson;
  children: React.ReactNode;
}) {
  const baseHref = `/portal/${person.id}`;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--color-light)_0%,var(--color-secondary)_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-4 pb-8 pt-5">
        <div className="rounded-[24px] border border-[var(--color-secondary)] bg-white/92 px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <Link href={baseHref} className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[18px] bg-[var(--color-light)] ring-1 ring-[var(--color-secondary)]">
                <Image
                  src="/logo.png"
                  alt="SMILE MATCHING"
                  width={48}
                  height={48}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold tracking-[0.2em] text-[var(--color-primary)]">SMILE MATCHING</p>
                <p className="mt-1 truncate text-[15px] font-semibold text-[var(--color-text-dark)]">
                  {person.name} さんのポータル
                </p>
              </div>
            </Link>
            <div className="shrink-0 rounded-[18px] bg-[var(--color-light)] p-1 ring-1 ring-[var(--color-secondary)]">
              <PortalAvatar name={person.name} photoUrl={person.photoUrl} size={42} />
            </div>
          </div>
        </div>

        <div className="flex-1 py-4">{children}</div>
      </div>
    </div>
  );
}
