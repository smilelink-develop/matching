import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#0F172A_0%,#172554_100%)] px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <div className="w-full rounded-[28px] border border-white/10 bg-white/10 p-7 shadow-[0_30px_80px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="mb-8">
            <p className="text-xs font-semibold tracking-[0.3em] text-white/60">
              SMILE MATCHING
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight">
              人材紹介ダッシュボードへログイン
            </h1>
            <p className="mt-2 text-sm text-white/70">
              社内メンバーだけが入れる最小ログインです。ログインIDとパスコードを入力してください。
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
