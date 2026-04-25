import { AuthError, requireApiAccount } from "@/lib/auth";
import { extractJobPostingFromFiles, type SourceFile } from "@/lib/ai-extract";

type IncomingFile = {
  fileName: string;
  dataUrl: string;
};

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

export async function POST(req: Request) {
  try {
    await requireApiAccount();
    const body = await req.json();
    const files: IncomingFile[] = Array.isArray(body?.files) ? body.files : [];
    if (files.length === 0) {
      return Response.json({ ok: false, error: "ファイルを1つ以上アップロードしてください" }, { status: 400 });
    }
    const sourceFiles: SourceFile[] = [];
    for (const file of files) {
      const parsed = parseDataUrl(file.dataUrl);
      if (!parsed) continue;
      sourceFiles.push({ fileName: file.fileName, mimeType: parsed.mimeType, base64: parsed.base64 });
    }
    if (sourceFiles.length === 0) {
      return Response.json({ ok: false, error: "ファイルを読み取れません" }, { status: 400 });
    }
    const extracted = await extractJobPostingFromFiles(sourceFiles);
    const populated = Object.entries(extracted).filter(
      ([, v]) => typeof v === "string" && v.trim() !== ""
    );
    console.log(
      `[job-postings/extract] files=${sourceFiles.length} populated=${populated.length}`,
      populated.map(([k]) => k).join(",")
    );
    return Response.json({ ok: true, extracted, populatedCount: populated.length });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
