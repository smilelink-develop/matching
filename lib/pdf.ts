/**
 * PDF からページ単位でテキストを抽出する。
 *
 * 使うライブラリは pdfjs-dist (pure-JS / OS 依存なし / Vercel/Railway で動く)。
 * 注意:
 * - スキャン画像 PDF にはこのままでは効かない。テキストレイヤー付き PDF が前提。
 * - 後で Cloud Vision OCR を差し込めるよう、入出力は素朴な配列にしておく。
 *
 * 出力例:
 *   [
 *     { pageNumber: 1, text: "...", items: [{ text, x, y, width, height }] },
 *     { pageNumber: 2, text: "...", items: [...] },
 *   ]
 *
 * x, y は PDF 座標系 (左下原点) ではなく、こちらでは ↑→ y 増加に正規化済み。
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
  items: PdfTextItem[];
};

/**
 * Buffer / Uint8Array の PDF から全ページのテキストを抽出。
 */
export async function extractPdfPages(input: Buffer | Uint8Array): Promise<PdfPage[]> {
  // pdfjs-dist は legacy build を使う (Node 環境用)
  // TypeScript の型は legacy entry に対しては弱いので動的 import
  const pdfjsModule = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // pdfjs-dist は worker 設定を要求するが、legacy build では disable で OK
  const data = input instanceof Buffer ? new Uint8Array(input) : input;
  const loadingTask = pdfjsModule.getDocument({
    data,
    verbosity: 0,
    disableFontFace: true,
    useWorkerFetch: false,
    useSystemFonts: false,
  });

  const pdfDocument = await loadingTask.promise;
  const pages: PdfPage[] = [];

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const content = await page.getTextContent();

    type TextItemLike = {
      str?: string;
      transform?: number[];
      width?: number;
      height?: number;
    };

    const items: PdfTextItem[] = [];
    for (const raw of content.items as TextItemLike[]) {
      const text = raw.str ?? "";
      if (!text) continue;
      // PDF transform: [a, b, c, d, e, f] → x = e, y = f (テキストの基準点)
      const tx = raw.transform?.[4] ?? 0;
      const ty = raw.transform?.[5] ?? 0;
      // PDF は左下原点なので、上原点に変換
      const yTop = viewport.height - ty;
      items.push({
        text,
        x: tx,
        y: yTop,
        width: raw.width ?? 0,
        height: raw.height ?? 12,
      });
    }

    // y, x の順に並べて行を再構築
    items.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 4) return a.y - b.y;
      return a.x - b.x;
    });

    // 同じ y (許容 4px) を 1 行とみなして連結
    const lines: string[] = [];
    let currentY: number | null = null;
    let currentLine: string[] = [];
    for (const item of items) {
      if (currentY === null || Math.abs(item.y - currentY) > 4) {
        if (currentLine.length > 0) lines.push(currentLine.join(" ").trim());
        currentLine = [item.text];
        currentY = item.y;
      } else {
        currentLine.push(item.text);
      }
    }
    if (currentLine.length > 0) lines.push(currentLine.join(" ").trim());

    pages.push({
      pageNumber: pageNum,
      text: lines.join("\n"),
      items,
    });

    // メモリ解放
    page.cleanup();
  }

  await pdfDocument.cleanup();
  await pdfDocument.destroy();
  return pages;
}
