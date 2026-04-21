import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";
import { extractCandidateFromFiles, type SourceFile } from "@/lib/ai-extract";
import {
  buildPersonFolderName,
  ensurePersonDriveFolder,
  formatPersonIdPrefix,
  uploadDataUrlToDrive,
} from "@/lib/google-docs";

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

function isDriveConfigured() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim()
  );
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
      select: {
        id: true,
        name: true,
        driveFolderUrl: true,
        onboarding: { select: { englishName: true } },
      },
    });
    if (!person) {
      return Response.json({ ok: false, error: "候補者が見つかりません" }, { status: 404 });
    }
    const folderName = buildPersonFolderName({
      id: person.id,
      englishName: person.onboarding?.englishName ?? null,
      name: person.name,
    });
    const idPrefix = formatPersonIdPrefix(person.id);

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

    // Google Drive は任意設定。未設定なら抽出結果のみ返す
    if (!isDriveConfigured()) {
      return Response.json({
        ok: true,
        extracted,
        uploadedFiles: [],
        driveFolderUrl: person.driveFolderUrl,
        driveWarning:
          "Google Drive 連携が未設定のためファイルは保管されませんでした。Railway の環境変数 GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_CANDIDATE_FILES_FOLDER_URL を設定してください。",
      });
    }

    // Google Drive の候補者フォルダへアップロード
    let folderUrl: string | null = person.driveFolderUrl ?? null;
    const driveFailures: string[] = [];

    try {
      const folder = await ensurePersonDriveFolder({
        existingFolderUrl: person.driveFolderUrl,
        personName: folderName,
      });
      folderUrl = folder.folderUrl;
      if (!person.driveFolderUrl) {
        await prisma.person.update({ where: { id: personId }, data: { driveFolderUrl: folderUrl } });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "フォルダ作成失敗";
      driveFailures.push(`フォルダ: ${message}`);
      return Response.json({
        ok: true,
        extracted,
        uploadedFiles: [],
        driveFolderUrl: null,
        driveWarning: `Google Drive のフォルダ作成に失敗しました: ${message}`,
      });
    }

    const uploadedFiles: { fileName: string; fileUrl: string; mimeType: string }[] = [];
    for (const file of files) {
      try {
        const uploaded = await uploadDataUrlToDrive({
          dataUrl: file.dataUrl,
          fileName: `${idPrefix}_${file.fileName}`,
          folderUrl: folderUrl!,
        });
        uploadedFiles.push({
          fileName: file.fileName,
          fileUrl: uploaded.fileUrl,
          mimeType: uploaded.mimeType,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        driveFailures.push(`${file.fileName}: ${message}`);
      }
    }

    return Response.json({
      ok: true,
      extracted,
      uploadedFiles,
      driveFolderUrl: folderUrl,
      driveWarning:
        driveFailures.length > 0 ? `一部のファイルの保存に失敗しました:\n${driveFailures.join("\n")}` : undefined,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
