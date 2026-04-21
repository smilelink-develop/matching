import { google } from "googleapis";

const DOC_URL_RE = /\/document\/d\/([a-zA-Z0-9_-]+)/;
const DRIVE_FOLDER_RE = /\/folders\/([a-zA-Z0-9_-]+)/;

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
}: {
  templateUrl: string;
  folderUrl: string;
  title: string;
  replacements: Record<string, string>;
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

export async function ensurePersonDriveFolder({
  existingFolderUrl,
  personName,
  rootFolderUrl,
}: {
  existingFolderUrl?: string | null;
  personName: string;
  rootFolderUrl?: string | null;
}) {
  if (existingFolderUrl?.trim()) {
    return {
      folderId: parseGoogleDriveFolderId(existingFolderUrl),
      folderUrl: existingFolderUrl,
    };
  }

  const parentFolderUrl = rootFolderUrl?.trim() || process.env.GOOGLE_CANDIDATE_FILES_FOLDER_URL?.trim();
  if (!parentFolderUrl) {
    throw new Error("GOOGLE_CANDIDATE_FILES_FOLDER_URL が未設定です");
  }

  const { drive } = await getGoogleClients();
  return getOrCreateFolder({
    drive,
    parentFolderUrl,
    folderName: personName,
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
