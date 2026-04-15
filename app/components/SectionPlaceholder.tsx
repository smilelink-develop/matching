import Link from "next/link";

export default function SectionPlaceholder({
  title,
  description,
  points,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  description: string;
  points: string[];
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600">{description}</p>
      </div>

      <section className="rounded-3xl border border-[#D9E7FF] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-[#2563EB]">このセクションでやること</p>
        <div className="mt-4 space-y-3">
          {points.map((point, index) => (
            <div
              key={point}
              className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-[#F8FBFF] px-4 py-3"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-xs font-semibold text-[#1D4ED8]">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-[#0F172A]">{point}</p>
            </div>
          ))}
        </div>

        {(primaryHref || secondaryHref) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {primaryHref && primaryLabel ? (
              <Link
                href={primaryHref}
                className="rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1D4ED8]"
              >
                {primaryLabel}
              </Link>
            ) : null}
            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-[#0F172A] hover:bg-gray-50"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
