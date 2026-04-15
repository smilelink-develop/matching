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
        <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600">{description}</p>
      </div>

      <section className="rounded-3xl border border-[var(--color-secondary)] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-[var(--color-primary)]">このセクションでやること</p>
        <div className="mt-4 space-y-3">
          {points.map((point, index) => (
            <div
              key={point}
              className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-[var(--color-light)] px-4 py-3"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)] text-xs font-semibold text-[var(--color-primary-hover)]">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-[var(--color-text-dark)]">{point}</p>
            </div>
          ))}
        </div>

        {(primaryHref || secondaryHref) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {primaryHref && primaryLabel ? (
              <Link
                href={primaryHref}
                className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
              >
                {primaryLabel}
              </Link>
            ) : null}
            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-[var(--color-text-dark)] hover:bg-gray-50"
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
