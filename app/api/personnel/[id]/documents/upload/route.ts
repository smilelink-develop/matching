import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";
import {
  ensurePersonDriveFolder,
  buildPersonFolderName,
  buildPersonAssetName,
} from "@/lib/google-docs";
import { google } from "googleapis";
import { Readable } from "node:stream";
import { getDocumentDefinitions } from "@/lib/candidate-profile";
import { toDriveThumbUrl, extractDriveFileId } from "@/lib/drive-url";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireApiAccount();
    const { id } = await ctx.params;
    const personId = Number(id);
    if (!Number.isFinite(personId)) {
      return Response.json({ ok: false, error: "personId が不正です" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const kind = String(formData.get("kind") ?? "").trim();
    if (!(file instanceof File) || !kind) {
      return Response.json({ ok: false, error: "file と kind が必要です" }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return Response.json({ ok: false, error: "ファイルは 20MB 以下にしてください" }, { status: 413 });
    }

    const person = await prisma.person.findUnique({
      where: { id: personId },
      select: { id: true, name: true, residenceStatus: true, driveFolderUrl: true, onboarding: { select: { englishName: true } } },
    });
    if (!person) {
      return Response.json({ ok: false, error: "候補者が見つかりません" }, { status: 404 });
    }

    // 候補者 Drive フォルダを確保 (無ければ ID プレフィックスで検索 → 新規作成)
    // フォルダ名は "0192_DAO VAN HOANG" の形式に統一 (4桁ID prefix で見つけやすく)
    const folder = await ensurePersonDriveFolder({
      existingFolderUrl: person.driveFolderUrl,
      personName: buildPersonFolderName({
        id: person.id,
        englishName: person.onboarding?.englishName ?? null,
        name: person.name,
      }),
      personId: person.id,
    });
    if (!folder.folderId) {
      return Response.json({ ok: false, error: "Drive フォルダ ID を解決できません" }, { status: 500 });
    }

    // フォルダ URL が DB 未保存なら更新
    if (!person.driveFolderUrl && folder.folderUrl) {
      await prisma.person.update({ where: { id: person.id }, data: { driveFolderUrl: folder.folderUrl } });
    }

    // 書類サブフォルダ "書類" を確保
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      key: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    await auth.authorize();
    const drive = google.drive({ version: "v3", auth });

    const subFolderName = "書類";
    let docFolderId: string | null = null;
    {
      const list = await drive.files.list({
        q: `name = '${subFolderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and '${folder.folderId}' in parents and trashed = false`,
        fields: "files(id,name)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });
      const found = list.data.files?.[0];
      if (found?.id) {
        docFolderId = found.id;
      } else {
        const created = await drive.files.create({
          supportsAllDrives: true,
          requestBody: {
            name: subFolderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [folder.folderId],
          },
          fields: "id",
        });
        docFolderId = created.data.id ?? null;
      }
    }
    if (!docFolderId) {
      return Response.json({ ok: false, error: "Drive 書類フォルダの確保に失敗しました" }, { status: 500 });
    }

    // ファイル名: "{4桁ID}_{englishName または name}_{書類名}{元拡張子}"
    //   例: "0192_DAO VAN HOANG_在留カード (表面).jpg"
    //   全アップロード書類で共通の命名規約。
    const docDef = getDocumentDefinitions(person.residenceStatus).find((d) => d.kind === kind);
    const docLabel = docDef?.label ?? kind;
    const ext = file.name.match(/\.[^.]+$/)?.[0] ?? "";
    const fileName = buildPersonAssetName({
      person: {
        id: person.id,
        name: person.name,
        englishName: person.onboarding?.englishName ?? null,
      },
      assetName: docLabel,
    }) + ext;

    // 既存 PortalDocument から旧 Drive ファイル ID を取り出して、新規アップロード成功後に削除する
    const existing = await prisma.portalDocument.findUnique({
      where: { personId_kind: { personId, kind } },
      select: { fileUrl: true },
    });
    const oldFileId = existing?.fileUrl ? extractDriveFileId(existing.fileUrl) : null;

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";

    const created = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: fileName,
        parents: [docFolderId],
      },
      media: { mimeType, body: Readable.from(buffer) },
      fields: "id,webViewLink,webContentLink,thumbnailLink,name,mimeType",
    });
    if (!created.data.id) {
      return Response.json({ ok: false, error: "Drive アップロードに失敗しました" }, { status: 500 });
    }

    const fileUrl =
      created.data.webViewLink ?? `https://drive.google.com/file/d/${created.data.id}/view`;

    // PortalDocument に upsert (kind 単位で 1 件)
    await prisma.portalDocument.upsert({
      where: { personId_kind: { personId, kind } },
      create: {
        personId,
        kind,
        fileName: created.data.name ?? fileName,
        fileUrl,
        mimeType: created.data.mimeType ?? mimeType,
        autoJudgeStatus: "accepted",
        autoJudgeNote: "Drive アップロード",
      },
      update: {
        fileName: created.data.name ?? fileName,
        fileUrl,
        mimeType: created.data.mimeType ?? mimeType,
        autoJudgeStatus: "accepted",
        autoJudgeNote: "Drive アップロード",
      },
    });

    // 「顔写真」が新規/差し替えされたら Person.photoUrl もサムネ URL に更新
    if (kind === "photo") {
      const thumb = toDriveThumbUrl(fileUrl) ?? fileUrl;
      await prisma.person.update({
        where: { id: personId },
        data: { photoUrl: thumb },
      });
    }

    // 旧ファイルを Drive から削除 (差し替え)
    //   方針:
    //     - Drive の name contains クエリは日本語 + カッコで誤動作するため、
    //       書類サブフォルダ内 を全件 list して JS 側でプレフィックス一致判定
    //     - files.delete は権限が無いと失敗するので、files.update({trashed:true})
    //       でゴミ箱に移動 (Service Account の編集権限さえあれば成功)
    //     - 削除失敗時は応答に warning として返し、Railway ログにも console.error
    const deleteFailures: string[] = [];
    const idsToDelete = new Set<string>();
    if (oldFileId && oldFileId !== created.data.id) idsToDelete.add(oldFileId);

    const namePrefix = buildPersonAssetName({
      person: {
        id: person.id,
        name: person.name,
        englishName: person.onboarding?.englishName ?? null,
      },
      assetName: docLabel,
    });

    try {
      // 書類サブフォルダ内の全ファイルを取得 (created.data.id 以外で
      // namePrefix で始まるファイルを削除対象に)
      const listed = await drive.files.list({
        q: `'${docFolderId}' in parents and trashed = false`,
        fields: "files(id,name)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 1000,
      });
      for (const f of listed.data.files ?? []) {
        if (!f.id || f.id === created.data.id) continue;
        if (typeof f.name === "string" && f.name.startsWith(namePrefix)) {
          idsToDelete.add(f.id);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "list error";
      deleteFailures.push(`list: ${msg}`);
      console.error("documents/upload list error:", msg);
    }

    for (const fileId of idsToDelete) {
      try {
        // files.delete だと所有権が必要なケースで失敗するので
        // files.update({trashed: true}) でゴミ箱送り (編集権限のみでOK)
        await drive.files.update({
          fileId,
          requestBody: { trashed: true },
          supportsAllDrives: true,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error";
        deleteFailures.push(`${fileId}: ${msg}`);
        console.error(`documents/upload delete failed for ${fileId}:`, msg);
      }
    }

    return Response.json({
      ok: true,
      kind,
      fileId: created.data.id,
      fileName: created.data.name ?? fileName,
      fileUrl,
      mimeType: created.data.mimeType ?? mimeType,
      driveFolderUrl: folder.folderUrl,
      deletedOld: idsToDelete.size,
      deleteWarning: deleteFailures.length > 0 ? deleteFailures.join(" / ") : undefined,
    });
  } catch (error) {
    console.error("documents/upload error:", error);
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}

