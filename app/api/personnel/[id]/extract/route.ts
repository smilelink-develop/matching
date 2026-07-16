import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";
import {
  classifyFilesByAi,
  extractCandidateFromFiles,
  extractCandidateFromText,
  type AiFileClassification,
  type SourceFile,
} from "@/lib/ai-extract";
import {
  buildPersonAssetName,
  buildPersonFolderName,
  ensurePersonDriveFolder,
  uploadDataUrlToDrive,
} from "@/lib/google-docs";
import mammoth from "mammoth";
import { toDriveThumbUrl, extractDriveFileId } from "@/lib/drive-url";
import { classifyByFileName, getDocumentKindLabel } from "@/lib/file-classifier";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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
        photoUrl: true,
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
    const personForName = {
      id: person.id,
      englishName: person.onboarding?.englishName ?? null,
      name: person.name,
    };

    // AI に渡すために base64 を抜き出す
    // docx は mammoth でテキスト化、それ以外は Gemini multimodal にそのまま
    const sourceFiles: SourceFile[] = [];
    const docxTexts: string[] = [];
    for (const file of files) {
      const parsed = parseDataUrl(file.dataUrl);
      if (!parsed) continue;
      if (parsed.mimeType === DOCX_MIME) {
        try {
          const buf = Buffer.from(parsed.base64, "base64");
          const { value: text } = await mammoth.extractRawText({ buffer: buf });
          if (text?.trim()) docxTexts.push(text);
        } catch {
          // docx 解析失敗 → 当該ファイルは無視
        }
      } else {
        sourceFiles.push({
          fileName: file.fileName,
          mimeType: parsed.mimeType,
          base64: parsed.base64,
        });
      }
    }

    if (sourceFiles.length === 0 && docxTexts.length === 0) {
      return Response.json({ ok: false, error: "アップロードされたファイルを読み取れません" }, { status: 400 });
    }

    // PDF/画像 が混じってる場合は multimodal を優先、docx のみなら text 抽出
    const extracted = sourceFiles.length > 0
      ? await extractCandidateFromFiles(sourceFiles)
      : await extractCandidateFromText(docxTexts.join("\n\n"));

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
        personId: person.id,
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

    // 各ファイルを分類: まずファイル名 → 判定できないものだけ AI で分類
    const suggestions: Array<{
      kind: string;
      label: string;
      confidence: "high" | "medium" | "low";
      source: "filename" | "ai" | "unknown";
    }> = files.map((file) => {
      const bynn = classifyByFileName(file.fileName);
      if (bynn) {
        return {
          kind: bynn.kind,
          label: bynn.label,
          confidence: bynn.confidence,
          source: "filename" as const,
        };
      }
      return {
        kind: "other",
        label: getDocumentKindLabel("other"),
        confidence: "low" as const,
        source: "unknown" as const,
      };
    });

    // ファイル名で判定できなかった (source=unknown) ものを AI で分類
    const aiTargets: { fileIndex: number; source: SourceFile }[] = [];
    for (let i = 0; i < files.length; i++) {
      if (suggestions[i].source !== "unknown") continue;
      const parsed = parseDataUrl(files[i].dataUrl);
      if (!parsed) continue;
      if (parsed.mimeType === DOCX_MIME) continue; // docx は AI 分類対象外 (テキストのみ)
      aiTargets.push({
        fileIndex: i,
        source: {
          fileName: files[i].fileName,
          mimeType: parsed.mimeType,
          base64: parsed.base64,
        },
      });
    }
    if (aiTargets.length > 0) {
      try {
        const aiResults: AiFileClassification[] = await classifyFilesByAi(
          aiTargets.map((t) => t.source),
        );
        // aiResults の index は aiTargets 配列上の index。ファイル配列にマッピングし直す
        for (const r of aiResults) {
          if (r.index < 0 || r.index >= aiTargets.length) continue;
          const fileIndex = aiTargets[r.index].fileIndex;
          suggestions[fileIndex] = {
            kind: r.kind,
            label: getDocumentKindLabel(r.kind),
            confidence: r.confidence,
            source: "ai",
          };
        }
      } catch (err) {
        console.warn("[extract] AI 分類失敗:", err instanceof Error ? err.message : err);
      }
    }

    const uploadedFiles: {
      fileName: string;
      originalFileName: string;
      fileUrl: string;
      fileId: string | null;
      mimeType: string;
      suggestedKind: string;
      suggestedLabel: string;
      confidence: "high" | "medium" | "low";
      source: "filename" | "ai" | "unknown";
    }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const suggestion = suggestions[i];
      try {
        const ext = file.fileName.match(/\.[^.]+$/)?.[0] ?? "";
        // 分類の label でファイル名を組み立て。unknown なら元のファイル名を採用
        const assetName =
          suggestion.source === "unknown"
            ? file.fileName.replace(/\.[^.]+$/, "")
            : suggestion.label;
        const uploaded = await uploadDataUrlToDrive({
          dataUrl: file.dataUrl,
          fileName: `${buildPersonAssetName({ person: personForName, assetName })}${ext}`,
          folderUrl: folderUrl!,
        });
        const fileId = extractDriveFileId(uploaded.fileUrl);
        uploadedFiles.push({
          fileName: file.fileName,
          originalFileName: file.fileName,
          fileUrl: uploaded.fileUrl,
          fileId,
          mimeType: uploaded.mimeType,
          suggestedKind: suggestion.kind,
          suggestedLabel: suggestion.label,
          confidence: suggestion.confidence,
          source: suggestion.source,
        });

        // PortalDocument に upsert (suggestion の kind で保存)
        // unknown の場合はいったん kind="other" として保存する
        if (suggestion.source !== "unknown") {
          try {
            await prisma.portalDocument.upsert({
              where: { personId_kind: { personId, kind: suggestion.kind } },
              create: {
                personId,
                kind: suggestion.kind,
                fileName: file.fileName,
                fileUrl: uploaded.fileUrl,
                mimeType: uploaded.mimeType,
                autoJudgeStatus: "pending_review",
                autoJudgeNote: `AI 分類 (${suggestion.source}, ${suggestion.confidence})`,
              },
              update: {
                fileName: file.fileName,
                fileUrl: uploaded.fileUrl,
                mimeType: uploaded.mimeType,
                autoJudgeStatus: "pending_review",
                autoJudgeNote: `AI 分類 (${suggestion.source}, ${suggestion.confidence})`,
              },
            });
          } catch {
            // PortalDocument 保存失敗はサイレント (画面確認で後追い可能)
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        driveFailures.push(`${file.fileName}: ${message}`);
      }
    }

    // 履歴書ファイル本体の URL を ResumeProfile.resumeFileUrl に保存。
    // 優先順位: ファイル名に "履歴書" を含むもの → 最初のアップロードファイル。
    // 同時に Person.photoUrl が未設定なら、Drive サムネ URL を photoUrl に設定。
    // (PDF はページ 1 サムネ、画像は画像そのまま — bulk-add と同じ挙動)
    if (uploadedFiles.length > 0) {
      const resumeFile =
        uploadedFiles.find((f) => /履歴書|resume|cv/i.test(f.fileName)) ?? uploadedFiles[0];
      try {
        await prisma.resumeProfile.upsert({
          where: { personId },
          create: { personId, resumeFileUrl: resumeFile.fileUrl },
          update: { resumeFileUrl: resumeFile.fileUrl },
        });
      } catch {
        // resumeFileUrl の保存失敗は致命ではないのでサイレント
      }
      // Person.photoUrl が空ならサムネ URL を設定 (既存の写真は上書きしない)
      if (!person.photoUrl) {
        const thumb = toDriveThumbUrl(resumeFile.fileUrl);
        if (thumb) {
          try {
            await prisma.person.update({
              where: { id: personId },
              data: { photoUrl: thumb },
            });
          } catch {
            // photoUrl 保存失敗もサイレント
          }
        }
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
