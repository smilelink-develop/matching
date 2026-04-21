import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";
import { extractCandidateFromFiles, type SourceFile } from "@/lib/ai-extract";
import { ensurePersonDriveFolder, uploadDataUrlToDrive } from "@/lib/google-docs";

type Params = Promise<{ id: string }>;

type IncomingFile = {
  fileName: string;
  dataUrl: string;
};

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

export async function POST(req: Request, { params }: { params: Params }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    const personId = Number(id);
    const body = await req.json();
    const files: IncomingFile[] = Array.isArray(body?.files) ? body.files : [];

    if (files.length === 0) {
      return Response.json({ ok: false, error: "ファイルを1つ以上アップロードしてください" }, { status: 400 });
    }

    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: { id: true, name: true, driveFolderUrl: true },
    });
    if (!person) {
      return Response.json({ ok: false, error: "候補者が見つかりません" }, { status: 404 });
    }

    // AI に渡すために base64 を抜き出す
    const sourceFiles: SourceFile[] = [];
    for (const file of files) {
      const parsed = parseDataUrl(file.dataUrl);
      if (!parsed) continue;
      sourceFiles.push({
        fileName: file.fileName,
        mimeType: parsed.mimeType,
        base64: parsed.base64,
      });
    }

    if (sourceFiles.length === 0) {
      return Response.json({ ok: false, error: "アップロードされたファイルを読み取れません" }, { status: 400 });
    }

    const extracted = await extractCandidateFromFiles(sourceFiles);

    // Google Drive の候補者フォルダへアップロード
    const folder = await ensurePersonDriveFolder({
      existingFolderUrl: person.driveFolderUrl,
      personName: person.name,
    });
    if (!person.driveFolderUrl) {
      await prisma.person.update({ where: { id: personId }, data: { driveFolderUrl: folder.folderUrl } });
    }

    const uploadedFiles: { fileName: string; fileUrl: string; mimeType: string }[] = [];
    for (const file of files) {
      try {
        const uploaded = await uploadDataUrlToDrive({
          dataUrl: file.dataUrl,
          fileName: file.fileName,
          folderUrl: folder.folderUrl,
        });
        uploadedFiles.push({
          fileName: file.fileName,
          fileUrl: uploaded.fileUrl,
          mimeType: uploaded.mimeType,
        });
      } catch (error) {
        // 1ファイルの Drive アップロード失敗で全体を止めない
        console.warn("Drive upload failed", file.fileName, error);
      }
    }

    return Response.json({
      ok: true,
      extracted,
      uploadedFiles,
      driveFolderUrl: folder.folderUrl,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
