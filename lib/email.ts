/**
 * メール送信ライブラリ (Resend API 直叩き)
 *
 * 環境変数:
 *   RESEND_API_KEY      = re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   RESEND_FROM_EMAIL   = SMILE MATCHING <noreply@example.com>
 *                          ↑ Resend で検証済みドメインのアドレス
 *
 * 別の送信サービス (SendGrid / SES / Gmail SMTP 等) に変更したい場合は、
 * この sendEmail() の中身だけを差し替えれば全機能が動く。
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
  /** 返信先 (省略すると RESEND_FROM_EMAIL と同じ) */
  replyTo?: string;
}): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return {
      ok: false,
      error: "RESEND_API_KEY / RESEND_FROM_EMAIL が未設定です",
    };
  }
  if (!opts.text && !opts.html) {
    return { ok: false, error: "text または html のいずれかが必要です" };
  }

  const body: Record<string, unknown> = {
    from,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
  };
  if (opts.text) body.text = opts.text;
  if (opts.html) body.html = opts.html;
  if (opts.replyTo) body.reply_to = opts.replyTo;

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
  // URL を a タグに
  const linked = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#0c8a61;text-decoration:underline">$1</a>'
  );
  // 改行を <br>
  const withBreaks = linked.replace(/\n/g, "<br>");
  return `<div style="font-family:sans-serif;line-height:1.7;color:#1f2937">${withBreaks}</div>`;
}

/** デフォルトの件名 (テンプレに emailSubject が無いときに使う) */
export const DEFAULT_EMAIL_SUBJECT = "【SMILE MATCHING】ご連絡";
