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
