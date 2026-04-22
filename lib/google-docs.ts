import { google } from "googleapis";

const DOC_URL_RE = /\/document\/d\/([a-zA-Z0-9_-]+)/;
const DRIVE_FOLDER_RE = /\/folders\/([a-zA-Z0-9_-]+)/;

// 候補者・企業のルートフォルダ (env で上書き可能、未設定時はこの既定値を使用)
const DEFAULT_PERSON_ROOT_FOLDER_URL =
  "https://drive.google.com/drive/folders/1Pmv-hFyk8DKIuu24mtMS5c26DWXmjqXr";
const DEFAULT_COMPANY_ROOT_FOLDER_URL =
  "https://drive.google.com/drive/folders/1TEqGDtoQZlLU8bg8c4cWZSNDp7mRwbin";

export function parseGoogleDocId(urlOrId: string) {
  const value = urlOrId.trim();
  const match = value.match(DOC_URL_RE);
  return match?.[1] ?? value;
}

export function parseGoogleDriveFolderId(urlOrId: string) {
  const value = urlOrId.trim();
  const match = value.match(DRIVE_FOLDER_RE);
  return match?.[1] ?? value;
}

function getGooglePrivateKey() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  if (!raw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY が未設定です");
  }
  return raw.replace(/\\n/g, "\n");
}

function getGoogleClientEmail() {
  const value = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  if (!value) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL が未設定です");
  }
  return value;
}

async function getGoogleClients() {
  const auth = new google.auth.JWT({
    email: getGoogleClientEmail(),
    key: getGooglePrivateKey(),
    scopes: [
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  await auth.authorize();

  return {
    drive: google.drive({ version: "v3", auth }),
    docs: google.docs({ version: "v1", auth }),
  };
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("アップロード用データが不正です");
  }
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

async function getOrCreateFolder({
  drive,
  parentFolderUrl,
  folderName,
}: {
  drive: Awaited<ReturnType<typeof getGoogleClients>>["drive"];
  parentFolderUrl: string;
  folderName: string;
}) {
  const parentId = parseGoogleDriveFolderId(parentFolderUrl);
  const created = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id,webViewLink",
  });

  if (!created.data.id) {
    throw new Error("Google Drive フォルダの作成に失敗しました");
  }

  return {
    folderId: created.data.id,
    folderUrl: created.data.webViewLink ?? `https://drive.google.com/drive/folders/${created.data.id}`,
  };
}

export async function createResumeDocumentFromTemplate({
  templateUrl,
  folderUrl,
  title,
  replacements,
  photoUrl,
}: {
  templateUrl: string;
  folderUrl: string;
  title: string;
  replacements: Record<string, string>;
  /** {{顔写真}} 部分に挿入する画像の URL。http(s) の公開URL推奨 (data:/drive直リンク不可) */
  photoUrl?: string | null;
}) {
  const templateId = parseGoogleDocId(templateUrl);
  const folderId = parseGoogleDriveFolderId(folderUrl);
  const { drive, docs } = await getGoogleClients();

  try {
    await drive.files.get({
      fileId: templateId,
      fields: "id,name,mimeType",
      supportsAllDrives: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(
      `テンプレートの Google Docs にアクセスできません。サービスアカウントへ共有されているか、ファイルIDが正しいかを確認してください。詳細: ${message}`
    );
  }

  if (folderId) {
    try {
      await drive.files.get({
        fileId: folderId,
        fields: "id,name,mimeType",
        supportsAllDrives: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      throw new Error(
        `保存先の Google Drive フォルダにアクセスできません。サービスアカウントへ共有されているか、Shared Drive のルートではなく実際のフォルダURLを指定しているかを確認してください。詳細: ${message}`
      );
    }
  }

  const copied = await drive.files.copy({
    fileId: templateId,
    supportsAllDrives: true,
    requestBody: {
      name: title,
      parents: folderId ? [folderId] : undefined,
    },
    fields: "id,webViewLink",
  });

  const documentId = copied.data.id;
  if (!documentId) {
    throw new Error("Google Docs の複製に失敗しました");
  }

  // まず {{顔写真}} の位置を画像に置換できるよう、photoUrl が指定されていれば先に処理する
  // text 置換の前に実行することで、テンプレ上の placeholder 文字列を目印にして位置を特定できる
  if (photoUrl && /^https?:\/\//.test(photoUrl)) {
    try {
      await insertInlineImageAtPlaceholder({
        docs,
        documentId,
        placeholder: "{{顔写真}}",
        photoUrl,
      });
    } catch (error) {
      // 画像挿入の失敗は履歴書作成全体をブロックしない (テキスト置換で空文字になるだけ)
      console.warn("insertInlineImageAtPlaceholder failed:", error);
    }
  }

  const requests = Object.entries(replacements).map(([key, value]) => ({
    replaceAllText: {
      containsText: {
        text: `{{${key}}}`,
        matchCase: true,
      },
      replaceText: value,
    },
  }));

  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });
  }

  return {
    documentId,
    documentUrl: copied.data.webViewLink ?? `https://docs.google.com/document/d/${documentId}/edit`,
  };
}

type DocsClient = ReturnType<typeof google.docs>;

/**
 * Google Docs 内で指定の placeholder 文字列を見つけ、そこに画像を挿入する。
 * placeholder テキストは削除してから画像が同じ位置に入る。
 */
async function insertInlineImageAtPlaceholder({
  docs,
  documentId,
  placeholder,
  photoUrl,
}: {
  docs: DocsClient;
  documentId: string;
  placeholder: string;
  photoUrl: string;
}) {
  const doc = await docs.documents.get({ documentId });
  const body = doc.data.body;
  if (!body?.content) return;

  type Hit = { startIndex: number; endIndex: number };
  const hits: Hit[] = [];

  const walkTextRuns = (elements: unknown[] | null | undefined) => {
    if (!elements) return;
    for (const el of elements as Record<string, unknown>[]) {
      const paragraph = el.paragraph as { elements?: Record<string, unknown>[] } | undefined;
      if (paragraph?.elements) {
        for (const run of paragraph.elements) {
          const tr = run.textRun as { content?: string } | undefined;
          const start = typeof run.startIndex === "number" ? run.startIndex : null;
          if (!tr?.content || start === null) continue;
          let idx = 0;
          while (true) {
            const found = tr.content.indexOf(placeholder, idx);
            if (found === -1) break;
            hits.push({
              startIndex: start + found,
              endIndex: start + found + placeholder.length,
            });
            idx = found + placeholder.length;
          }
        }
      }
      const table = el.table as { tableRows?: Record<string, unknown>[] } | undefined;
      if (table?.tableRows) {
        for (const row of table.tableRows) {
          const cells = row.tableCells as Record<string, unknown>[] | undefined;
          if (!cells) continue;
          for (const cell of cells) {
            walkTextRuns((cell.content as unknown[]) ?? []);
          }
        }
      }
    }
  };

  walkTextRuns(body.content);

  if (hits.length === 0) return;

  // 後ろから処理しないと startIndex がずれる
  hits.sort((a, b) => b.startIndex - a.startIndex);

  for (const hit of hits) {
    const requests: Record<string, unknown>[] = [
      {
        deleteContentRange: {
          range: { startIndex: hit.startIndex, endIndex: hit.endIndex },
        },
      },
      {
        insertInlineImage: {
          location: { index: hit.startIndex },
          uri: photoUrl,
          objectSize: {
            height: { magnitude: 120, unit: "PT" },
            width: { magnitude: 100, unit: "PT" },
          },
        },
      },
    ];
    await docs.documents.batchUpdate({ documentId, requestBody: { requests } });
  }
}

export function formatPersonIdPrefix(id: number) {
  return String(id).padStart(4, "0");
}

export function buildPersonFolderName(person: { id: number; englishName?: string | null; name: string }) {
  const prefix = formatPersonIdPrefix(person.id);
  const label = (person.englishName?.trim() || person.name.trim() || "候補者")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim();
  return `${prefix}_${label}`;
}

/**
 * 候補者に紐づくファイル名を {ID4桁}_{英語名 or カナ名}_{書類名} の形で組み立てる。
 * 例: 0001_KODAI TSUCHIDA_履歴書
 */
export function buildPersonAssetName({
  person,
  assetName,
}: {
  person: { id: number; englishName?: string | null; name: string };
  assetName: string;
}) {
  const prefix = formatPersonIdPrefix(person.id);
  const label = (person.englishName?.trim() || person.name.trim() || "候補者")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim();
  const safeAsset = (assetName ?? "").replace(/[\\/:*?"<>|]/g, "").trim() || "書類";
  return `${prefix}_${label}_${safeAsset}`;
}

// 親フォルダ内で指定の名前プレフィックスで始まるフォルダを検索
async function findFolderByPrefix({
  parentFolderUrl,
  namePrefix,
}: {
  parentFolderUrl: string;
  namePrefix: string;
}): Promise<{ folderId: string; folderUrl: string } | null> {
  const parentId = parseGoogleDriveFolderId(parentFolderUrl);
  if (!parentId) return null;
  const { drive } = await getGoogleClients();
  const escaped = namePrefix.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name contains '${escaped}' and trashed = false`,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: "files(id, name, webViewLink)",
    pageSize: 20,
  });
  const files = res.data.files ?? [];
  // 厳密に namePrefix で始まるものを優先
  const match = files.find((f) => (f.name ?? "").startsWith(namePrefix)) ?? files[0];
  if (!match || !match.id) return null;
  return {
    folderId: match.id,
    folderUrl: match.webViewLink ?? `https://drive.google.com/drive/folders/${match.id}`,
  };
}

export async function ensurePersonDriveFolder({
  existingFolderUrl,
  personName,
  personId,
  rootFolderUrl,
}: {
  existingFolderUrl?: string | null;
  personName: string;
  personId?: number;
  rootFolderUrl?: string | null;
}) {
  if (existingFolderUrl?.trim()) {
    return {
      folderId: parseGoogleDriveFolderId(existingFolderUrl),
      folderUrl: existingFolderUrl,
    };
  }

  const parentFolderUrl =
    rootFolderUrl?.trim() ||
    process.env.GOOGLE_CANDIDATE_FILES_FOLDER_URL?.trim() ||
    DEFAULT_PERSON_ROOT_FOLDER_URL;
  if (!parentFolderUrl) {
    throw new Error("候補者ルートフォルダの URL が解決できません");
  }

  // Drive 上に "0033_" で始まるフォルダが既にあれば再利用
  if (personId !== undefined) {
    const prefix = formatPersonIdPrefix(personId) + "_";
    const found = await findFolderByPrefix({ parentFolderUrl, namePrefix: prefix });
    if (found) return found;
  }

  const { drive } = await getGoogleClients();
  return getOrCreateFolder({
    drive,
    parentFolderUrl,
    folderName: personName,
  });
}

// 企業フォルダ (externalId_会社名 で検索 or 新規作成)
export async function ensureCompanyDriveFolder({
  existingFolderUrl,
  externalId,
  companyName,
  rootFolderUrl,
}: {
  existingFolderUrl?: string | null;
  externalId?: string | null;
  companyName: string;
  rootFolderUrl?: string | null;
}) {
  if (existingFolderUrl?.trim()) {
    return {
      folderId: parseGoogleDriveFolderId(existingFolderUrl),
      folderUrl: existingFolderUrl,
    };
  }
  const parentFolderUrl =
    rootFolderUrl?.trim() ||
    process.env.GOOGLE_COMPANY_FILES_FOLDER_URL?.trim() ||
    DEFAULT_COMPANY_ROOT_FOLDER_URL;
  if (!parentFolderUrl) {
    throw new Error("企業ルートフォルダの URL が解決できません");
  }

  // externalId で始まる企業フォルダを検索
  if (externalId) {
    const found = await findFolderByPrefix({ parentFolderUrl, namePrefix: externalId });
    if (found) return found;
  }

  const { drive } = await getGoogleClients();
  const folderName = externalId ? `${externalId}_${companyName}` : companyName;
  return getOrCreateFolder({
    drive,
    parentFolderUrl,
    folderName,
  });
}

export async function uploadDataUrlToDrive({
  dataUrl,
  fileName,
  folderUrl,
}: {
  dataUrl: string;
  fileName: string;
  folderUrl: string;
}) {
  const { drive } = await getGoogleClients();
  const { mimeType, buffer } = parseDataUrl(dataUrl);
  const folderId = parseGoogleDriveFolderId(folderUrl);

  const created = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: fileName,
      parents: folderId ? [folderId] : undefined,
    },
    media: {
      mimeType,
      body: Buffer.from(buffer),
    },
    fields: "id,webViewLink",
  });

  if (!created.data.id) {
    throw new Error("Google Drive へのファイル保存に失敗しました");
  }

  return {
    fileId: created.data.id,
    fileUrl: created.data.webViewLink ?? `https://drive.google.com/file/d/${created.data.id}/view`,
    mimeType,
  };
}
