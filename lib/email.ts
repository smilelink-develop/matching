/**
 * メール送信ライブラリ (Resend API / HTTPS)
 *
 * Railway の SMTP 完全遮断対策として HTTPS ベースの送信に変更。
 * Resend は croslan.co.jp の DNS に TXT/CNAME を追加することで
 * 認証済みドメインからの正規送信となる (SPF/DKIM 自動付与)。
 *
 * 環境変数:
 *   RESEND_API_KEY      = re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   RESEND_FROM_EMAIL   = 株式会社CROSLAN-人材紹介事業部 <recruit@croslan.co.jp>
 *   RESEND_REPLY_TO     = (任意) recruit@croslan.co.jp と異なる返信先を使う場合
 */

export type EmailSendResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

/**
 * 1 件のメールを送信する。HTML / プレーンテキスト両対応。
 * - text のみ渡すとプレーンテキストメール
 * - html のみ渡すと HTML メール
 * - 両方渡すと マルチパート (text は HTML 非対応クライアント用フォールバック)
 */
export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  /** Reply-To ヘッダ。省略時は RESEND_REPLY_TO 環境変数、それも無ければ RESEND_FROM_EMAIL */
  replyTo?: string;
}): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    return {
      ok: false,
      error: "RESEND_API_KEY / RESEND_FROM_EMAIL が未設定です",
    };
  }
  if (!opts.text && !opts.html) {
    return { ok: false, error: "text または html のいずれかが必要です" };
  }

  const replyTo = opts.replyTo ?? process.env.RESEND_REPLY_TO?.trim() ?? undefined;

  const body: Record<string, unknown> = {
    from,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
  };
  if (opts.text) body.text = opts.text;
  if (opts.html) body.html = opts.html;
  if (replyTo) body.reply_to = replyTo;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { ok: false, error: await res.text() };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fetch error" };
  }
}

/**
 * テンプレ本文 (プレーンテキスト) を簡易 HTML に変換。
 * 改行を <br> に、URL を <a> に置換するだけの軽量変換。
 */
export function textToBasicHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#0c8a61;text-decoration:underline">$1</a>'
  );
  const withBreaks = linked.replace(/\n/g, "<br>");
  return `<div style="font-family:sans-serif;line-height:1.7;color:#1f2937">${withBreaks}</div>`;
}

/** デフォルトの件名 (テンプレに emailSubject が無いときに使う) */
export const DEFAULT_EMAIL_SUBJECT = "【SMILE MATCHING】ご連絡";
