/**
 * 求人票テンプレート Docs から全 {{...}} placeholder を抽出。
 * 条件タブとの対照表を作るため。
 */
import "dotenv/config";
import { google } from "googleapis";

const TEMPLATE_ID = "1JfERX3IOJ2WZpho7xe0SoxjmUsoZZo5Kom82w6vTYBY";

async function main() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    key: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/documents.readonly", "https://www.googleapis.com/auth/drive.readonly"],
  });
  await auth.authorize();
  const docs = google.docs({ version: "v1", auth });

  const doc = await docs.documents.get({ documentId: TEMPLATE_ID });
  let allText = "";
  const walk = (element: unknown) => {
    if (!element || typeof element !== "object") return;
    const e = element as Record<string, unknown>;
    if (typeof e.content === "string") allText += e.content;
    for (const [key, value] of Object.entries(e)) {
      if (key === "content" && typeof value === "string") continue;
      if (Array.isArray(value)) value.forEach((v) => walk(v));
      else if (value && typeof value === "object") walk(value);
    }
  };
  walk(doc.data.body);
  walk(doc.data.headers);
  walk(doc.data.footers);
  walk(doc.data.namedStyles);

  const placeholders = new Set<string>();
  const regex = /\{\{([^}]+)\}\}/g;
  let match;
  while ((match = regex.exec(allText)) !== null) {
    placeholders.add(match[1].trim());
  }

  console.log("=== テンプレート内の全 placeholder (重複除去、出現順) ===");
  console.log(`合計: ${placeholders.size} 個\n`);
  const sorted = Array.from(placeholders).sort();
  for (const p of sorted) {
    console.log(`  {{${p}}}`);
  }
}

main().catch(console.error);
