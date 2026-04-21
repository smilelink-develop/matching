import { GoogleGenAI } from "@google/genai";

export type ExtractedCandidate = {
  name?: string;
  englishName?: string;
  nationality?: string;
  residenceStatus?: string;
  visaExpiryDate?: string;
  birthDate?: string;
  gender?: string;
  phoneNumber?: string;
  postalCode?: string;
  address?: string;
  spouseStatus?: string;
  childrenCount?: string;
  japaneseLevel?: string;
  japaneseLevelDate?: string;
  licenseName?: string;
  licenseExpiryDate?: string;
  otherQualificationName?: string;
  otherQualificationExpiryDate?: string;
  traineeExperience?: string;
  highSchoolName?: string;
  highSchoolStartDate?: string;
  highSchoolEndDate?: string;
  universityName?: string;
  universityStartDate?: string;
  universityEndDate?: string;
  workExperiences?: {
    companyName?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
  }[];
  motivation?: string;
  selfIntroduction?: string;
  japanPurpose?: string;
  currentJob?: string;
  retirementReason?: string;
  preferenceNote?: string;
};

export type SourceFile = {
  fileName: string;
  mimeType: string;
  base64: string;
};

const EXTRACTION_SCHEMA_DESCRIPTION = `次のJSONスキーマに沿って、読み取れた情報のみを出力してください。読み取れない項目は省略(null/undefined/空文字列を含めない)。日付は YYYY-MM-DD 形式で正規化してください。workExperiences は配列で、古い順。

fields:
- name: 候補者のカナ表記(例: "グエン ヴァン アン")
- englishName: アルファベット表記
- nationality: 国名の日本語(例: "ベトナム", "インドネシア", "ミャンマー", "フィリピン", "タイ", "その他")
- residenceStatus: "技能実習", "特定技能1号", "特定技能2号", "技術・人文知識・国際業務" のいずれか
- visaExpiryDate: 在留資格の有効期限 YYYY-MM-DD
- birthDate: 生年月日 YYYY-MM-DD
- gender: "男性", "女性", "その他"
- phoneNumber: 電話番号
- postalCode: 郵便番号
- address: 住所(日本国内の住所があれば)
- spouseStatus: "有" or "無"
- childrenCount: 子供の人数を数字の文字列
- japaneseLevel: 日本語レベル(例: "JLPT N3")
- japaneseLevelDate: 取得日 YYYY-MM-DD
- licenseName: 免許の名前
- licenseExpiryDate: YYYY-MM-DD
- otherQualificationName: その他の資格名
- otherQualificationExpiryDate: YYYY-MM-DD
- traineeExperience: 実習経験の有無や内容
- highSchoolName: 高校名
- highSchoolStartDate / highSchoolEndDate: YYYY-MM-DD
- universityName: 大学名
- universityStartDate / universityEndDate: YYYY-MM-DD
- workExperiences: [{companyName, startDate, endDate, reason}]
- motivation: 志望動機
- selfIntroduction: 自己紹介
- japanPurpose: 来日目的
- currentJob: 現在の仕事
- retirementReason: 退職理由
- preferenceNote: 本人希望記入欄`;

const SYSTEM_PROMPT = `あなたは外国人人材の書類から候補者情報を抽出するアシスタントです。
日本語の履歴書、在留カード、パスポート、送り出し機関が作成した候補者プロフィールなどの画像やPDFから、構造化されたJSONを抽出してください。

以下の JSON オブジェクト 1つだけを返してください。コードブロックや説明文は不要です。
複数の書類から同じ項目が見つかった場合は、最も公式な書類(在留カード > パスポート > 履歴書)の値を優先してください。
自信のない値は含めないでください。

${EXTRACTION_SCHEMA_DESCRIPTION}`;

const SUPPORTED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function isSupported(mime: string) {
  return SUPPORTED_IMAGE_MIMES.has(mime) || mime === "application/pdf";
}

export async function extractCandidateFromFiles(files: SourceFile[]): Promise<ExtractedCandidate> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY が未設定です");
  }

  const supportedFiles = files.filter((file) => isSupported(file.mimeType));
  if (supportedFiles.length === 0) {
    throw new Error("対応形式の画像/PDFが含まれていません");
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const client = new GoogleGenAI({ apiKey });

  const parts: {
    text?: string;
    inlineData?: { mimeType: string; data: string };
  }[] = [
    { text: SYSTEM_PROMPT },
    ...supportedFiles.map((file) => ({
      inlineData: { mimeType: file.mimeType, data: file.base64 },
    })),
    {
      text: "添付した書類から候補者情報を抽出して、指定のスキーマに沿う JSON を一つだけ返してください。説明や Markdown コードブロックは一切不要です。",
    },
  ];

  const response = await client.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const text = response.text?.trim() ?? "";
  return parseJsonPayload(text);
}

function parseJsonPayload(raw: string): ExtractedCandidate {
  if (!raw) return {};
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as ExtractedCandidate;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as ExtractedCandidate;
      } catch {
        return {};
      }
    }
    return {};
  }
}
