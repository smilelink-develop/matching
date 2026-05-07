/**
 * PDF からページ単位でテキストを抽出する。
 *
 * 元々は pdfjs-dist を使っていたが Next.js (Railway) のバンドラで
 *   "Setting up fake worker failed: Cannot find module pdf.worker.mjs"
 * が出るため、worker 不要な pdf-parse に切り替え。
 *
 * pdf-parse は内部で pdfjs-dist を使うが Node 用にラップしているので
 *   * バンドル不要
 *   * worker 不要
 *   * テキストレイヤー前提 (スキャン PDF は別途 OCR が必要)
 *
 * 注意:
 * - pdf-parse はページ単位の構造化テキストを返さず、全文 + ページ毎の
 *   pageRender callback を提供する。各ページの text を集めるため
 *   options.pagerender を上書きしてページ別に保存する。
 */

export type PdfTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfPage = {
  pageNumber: number;
  text: string;
  /** pdf-parse 経由では bbox が取れないため空配列 (将来 Cloud Vision 等で埋める) */
  items: PdfTextItem[];
};

/**
 * Buffer / Uint8Array の PDF から全ページのテキストを抽出。
 */
export async function extractPdfPages(input: Buffer | Uint8Array): Promise<PdfPage[]> {
  // pdf-parse は CJS で require が中で走るため動的 import で読み込む
  type PdfParseFn = (
    data: Buffer,
    options?: { pagerender?: (page: unknown) => Promise<string> | string }
  ) => Promise<{ numpages: number; text: string }>;
  const mod = (await import("pdf-parse")) as unknown as PdfParseFn | { default: PdfParseFn };
  const pdfParse: PdfParseFn = typeof mod === "function" ? mod : mod.default;

  const buffer = input instanceof Buffer ? input : Buffer.from(input);

  const pageTexts: string[] = [];

  // pdf-parse の page render hook を上書きして、各ページの text 配列を組み立てる
  // (pdfjs-dist Page#getTextContent と同等を内部で実行)
  type PdfPageProxy = {
    getTextContent(opts: {
      normalizeWhitespace: boolean;
      disableCombineTextItems: boolean;
    }): Promise<{ items: { str?: string; transform?: number[] }[] }>;
  };
  const pagerender = async (page: unknown): Promise<string> => {
    const textContent = await (page as PdfPageProxy).getTextContent({
      normalizeWhitespace: true,
      disableCombineTextItems: false,
    });
    type Item = { str?: string; transform?: number[] };
    const items = textContent.items as Item[];
    // y 座標で行を組み直す (pdf-parse のデフォルトは join " " で 1 行になりがち)
    const lines: { y: number; parts: { x: number; text: string }[] }[] = [];
    for (const it of items) {
      const text = it.str ?? "";
      if (!text) continue;
      const tx = it.transform?.[4] ?? 0;
      const ty = it.transform?.[5] ?? 0;
      const existing = lines.find((l) => Math.abs(l.y - ty) < 4);
      if (existing) {
        existing.parts.push({ x: tx, text });
      } else {
        lines.push({ y: ty, parts: [{ x: tx, text }] });
      }
    }
    // y 大きい (上の行) → 小さい (下の行) 順に並べる (PDF は左下原点)
    lines.sort((a, b) => b.y - a.y);
    const text = lines
      .map((l) => l.parts.sort((a, b) => a.x - b.x).map((p) => p.text).join(" "))
      .join("\n");
    pageTexts.push(text);
    return text;
  };

  await pdfParse(buffer, { pagerender });

  return pageTexts.map((text, i) => ({
    pageNumber: i + 1,
    text,
    items: [],
  }));
}
