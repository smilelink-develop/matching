import AdminLogo from "./AdminLogo";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(120%_120%_at_0%_0%,#1E3B33_0%,#12281F_55%,#0A1813_100%)] px-4 py-10 text-white">
      {/* 装飾の光彩 */}
      <div className="pointer-events-none absolute -top-32 -left-16 h-80 w-80 rounded-full bg-[var(--color-primary)]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-[#C89F5B]/20 blur-3xl" />

      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <div className="relative w-full rounded-[32px] border border-white/10 bg-white/[0.07] p-8 shadow-[0_40px_120px_rgba(15,23,42,0.55)] backdrop-blur-xl">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <AdminLogo />
              <p className="text-[11px] font-semibold tracking-[0.32em] text-white/60">
                SMILE MATCHING
              </p>
            </div>
            <h1 className="mt-7 text-4xl font-semibold leading-[1.15] tracking-tight">
              人材紹介ダッシュボードへ
              <br />
              ログイン
            </h1>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
