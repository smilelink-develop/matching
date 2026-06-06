/**
 * Gmail API 動作検証エンドポイント (管理者向け)
 *
 * 使い方:
 *   ブラウザで /api/email/test を開く
 *   各検証ステップの成功/失敗 + 詳細エラーを JSON で返す
 *
 * 検証する項目:
 *   1. 必要な環境変数が揃っているか
 *   2. Service Account の JWT 認証が成功するか (Gmail API 有効化必須)
 *   3. Domain-wide Delegation で recruit@ に impersonate できるか
 *   4. impersonate 先のプロファイル取得 (gmail.users.getProfile) が成功するか
 *
 * これが全部 ✅ なら本番送信も確実に成功する。
 */
import { google } from "googleapis";
import { requireApiAccount } from "@/lib/auth";

export const dynamic = "force-dynamic";

type StepResult = { name: string; ok: boolean; detail: string; data?: unknown };

function ok(name: string, detail: string, data?: unknown): StepResult {
  return { name, ok: true, detail, data };
}
function fail(name: string, detail: string): StepResult {
  return { name, ok: false, detail };
}

function getGooglePrivateKey(): string {
  const raw = process.env.GOOGLE_PRIVATE_KEY?.trim();
  if (!raw) throw new Error("GOOGLE_PRIVATE_KEY が未設定です");
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

export async function GET() {
  // ログイン管理者のみ
  try {
    await requireApiAccount();
  } catch {
    return Response.json({ ok: false, error: "ログインしてください" }, { status: 401 });
  }

  const steps: StepResult[] = [];

  // Step 1: 環境変数チェック
  const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const saKey = process.env.GOOGLE_PRIVATE_KEY?.trim();
  const sendAsUser = process.env.GMAIL_SEND_AS_USER?.trim();
  const gmailFrom = process.env.GMAIL_FROM?.trim();

  const envIssues: string[] = [];
  if (!saEmail) envIssues.push("GOOGLE_SERVICE_ACCOUNT_EMAIL 未設定");
  if (!saKey) envIssues.push("GOOGLE_PRIVATE_KEY 未設定");
  if (!sendAsUser) envIssues.push("GMAIL_SEND_AS_USER 未設定");
  if (!gmailFrom) envIssues.push("GMAIL_FROM 未設定 (任意だが推奨)");

  if (envIssues.length > 0) {
    steps.push(fail("環境変数チェック", envIssues.join(" / ")));
    return Response.json({ ok: false, steps, summary: "環境変数が足りません。Railway で設定後やり直してください。" });
  }
  steps.push(
    ok(
      "環境変数チェック",
      `SA=${saEmail}, sendAsUser=${sendAsUser}, from=${gmailFrom ?? "(default)"}`
    )
  );

  // Step 2: JWT 認証 (Service Account → Gmail API)
  let auth: InstanceType<typeof google.auth.JWT>;
  try {
    auth = new google.auth.JWT({
      email: saEmail,
      key: getGooglePrivateKey(),
      scopes: ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly"],
      subject: sendAsUser,
    });
    await auth.authorize();
    steps.push(ok("JWT 認証 + DwD impersonate", `${saEmail} → ${sendAsUser} の権限取得成功`));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    steps.push(fail("JWT 認証 + DwD impersonate", msg));

    // 典型的なエラーごとに原因示唆
    const hints: string[] = [];
    if (msg.includes("unauthorized_client") || msg.includes("Client is unauthorized")) {
      hints.push(
        "→ admin.google.com の Domain-wide Delegation で、サービスアカウントの Client ID と スコープ (gmail.send) が正しく登録されているか確認してください。"
      );
    }
    if (msg.includes("invalid_grant")) {
      hints.push(
        `→ ${sendAsUser} が Workspace の User アカウントとして実在しているか確認してください (Group やエイリアスは impersonate 不可)。`
      );
    }
    if (msg.includes("access_denied")) {
      hints.push("→ DwD のスコープが gmail.send になっているか確認してください。");
    }
    if (msg.includes("invalid_request") || msg.includes("private_key")) {
      hints.push("→ GOOGLE_PRIVATE_KEY の改行 (\\n) が正しく展開されているか確認してください。");
    }
    return Response.json({
      ok: false,
      steps,
      summary: "認証失敗。下記ヒントを確認してください。",
      hints,
    });
  }

  // Step 3: Gmail API 呼び出し (低コストの getProfile で疎通確認)
  try {
    const gmail = google.gmail({ version: "v1", auth });
    const profile = await gmail.users.getProfile({ userId: "me" });
    steps.push(
      ok(
        "Gmail API getProfile",
        `${profile.data.emailAddress} へ impersonate 確認成功 (受信件数=${profile.data.messagesTotal ?? "?"})`,
        { emailAddress: profile.data.emailAddress, messagesTotal: profile.data.messagesTotal }
      )
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    steps.push(fail("Gmail API getProfile", msg));

    const hints: string[] = [];
    if (msg.toLowerCase().includes("has not been used") || msg.toLowerCase().includes("gmail api")) {
      hints.push(
        "→ Cloud Console で **Gmail API を有効化** してください。プロジェクトの API ライブラリで gmail を検索 → 有効にする。"
      );
    }
    if (msg.includes("Insufficient Permission") || msg.includes("Insufficient scope")) {
      hints.push("→ DwD のスコープに gmail.send だけでなく gmail.readonly も追加してください (テスト時)。");
    }
    return Response.json({
      ok: false,
      steps,
      summary: "Gmail API 呼び出し失敗。",
      hints,
    });
  }

  return Response.json({
    ok: true,
    steps,
    summary: `🎉 すべて OK。${sendAsUser} として Gmail API 経由で送信できます。本番配信を試してください。`,
  });
}
