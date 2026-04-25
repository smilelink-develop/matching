import { readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAdmin } from "@/lib/auth";

/**
 * data/candidates-master.json を読んで、既存 Person の欠損フィールドだけを埋める。
 * - 既に値が入っているフィールドは絶対に上書きしない
 * - DB に居ない ID はスキップ (sync-candidates-from-drive で先に作成しておく)
 *
 * クエリ:
 *   ?ids=90,91,...   ... 指定 ID のみ対象
 *   ?onlyMissing=1   ... デフォルト動作 (空欄のみ埋める)
 *   ?overwrite=1     ... 既に値があっても上書きする (注意)
 */

type MasterRow = {
  id: number;
  englishName: string | null;
  katakanaName: string | null;
  partner: string | null;
  nationality: string | null;
  residenceStatus: string | null;
  birthDate: string | null;
  postalCode: string | null;
  prefecture: string | null;
  address: string | null;
  driveFolderUrl: string | null;
  gender: string | null;
  visaExpiryDate: string | null;
  japaneseLevel: string | null;
  traineeExperience: string | null;
  preferenceNote: string | null;
  field: string | null;
};

type FormRow = {
  katakanaName: string | null;
  englishName: string | null;
  birthDate: string | null;
  gender: string | null;
  spouseStatus: string | null;
  childrenCount: string | null;
  postalCode: string | null;
  address: string | null;
  phoneNumber: string | null;
  email: string | null;
  highSchoolName: string | null;
  highSchoolStartDate: string | null;
  highSchoolEndDate: string | null;
  licenseName: string | null;
  licenseExpiryDate: string | null;
  qualification1: string | null;
  qualificationDate1: string | null;
  motivation: string | null;
  selfIntroduction: string | null;
  japanPurpose: string | null;
  currentJob: string | null;
  retirementReason: string | null;
  workExperiences: { companyName: string; startDate: string; endDate: string; reason: string }[];
  photoUrl: string | null;
  driveFolderUrl: string | null;
};

function loadMaster(): { master: MasterRow[]; formByKana: Record<string, FormRow> } {
  const file = path.join(process.cwd(), "data", "candidates-master.json");
  const raw = readFileSync(file, "utf-8");
  return JSON.parse(raw);
}

function normalizeNationality(value: string | null) {
  if (!value) return null;
  const known = ["ベトナム", "インドネシア", "ミャンマー", "フィリピン", "タイ", "韓国", "ネパール", "カンボジア"];
  for (const n of known) if (value.includes(n)) return n;
  return value;
}

function normalizeResidenceStatus(value: string | null) {
  if (!value) return null;
  if (value.includes("技能実習")) return "技能実習";
  if (value.includes("特定技能1") || value.includes("特定技能一")) return "特定技能1号";
  if (value.includes("特定技能2") || value.includes("特定技能二")) return "特定技能2号";
  if (value.includes("技術") || value.includes("技人国")) return "技術・人文知識・国際業務";
  return value;
}

async function resolvePartnerId(partnerName: string | null): Promise<number | null> {
  if (!partnerName) return null;
  const needle = partnerName.trim();
  let p = await prisma.partner.findFirst({
    where: { OR: [{ name: needle }, { name: { contains: needle } }] },
    select: { id: true },
  });
  if (!p) {
    p = await prisma.partner.create({ data: { name: needle }, select: { id: true } });
  }
  return p.id;
}

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    await requireApiAdmin();
    const url = new URL(req.url);
    const overwrite = url.searchParams.get("overwrite") === "1";
    const idsParam = url.searchParams.get("ids");
    const targetIds = idsParam
      ? idsParam.split(",").map((v) => Number(v.trim())).filter((n) => Number.isFinite(n))
      : null;

    const { master, formByKana } = loadMaster();
    const targets = targetIds ? master.filter((m) => targetIds.includes(m.id)) : master;

    const log: string[] = [];
    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    // 既存 Person を一括取得
    const existing = await prisma.person.findMany({
      where: { id: { in: targets.map((t) => t.id) } },
      include: { onboarding: true, resumeProfile: true },
    });
    const byId = new Map(existing.map((p) => [p.id, p]));

    for (const row of targets) {
      const person = byId.get(row.id);
      if (!person) {
        notFound++;
        log.push(`⚠️ id=${row.id}: 候補者が DB に居ません (sync-candidates-from-drive を先に実行)`);
        continue;
      }

      // master シートからの基本情報
      const partnerId = await resolvePartnerId(row.partner);
      const personUpdate: Record<string, unknown> = {};
      const setIfEmpty = (key: keyof typeof person, value: unknown) => {
        if (value === null || value === undefined || value === "") return;
        const current = person[key];
        if (overwrite || !current) {
          personUpdate[key] = value;
        }
      };
      setIfEmpty("name", row.katakanaName ?? row.englishName);
      setIfEmpty("nationality", normalizeNationality(row.nationality));
      setIfEmpty("residenceStatus", normalizeResidenceStatus(row.residenceStatus));
      if (partnerId !== null && (overwrite || person.partnerId === null)) {
        personUpdate.partnerId = partnerId;
      }
      if (row.driveFolderUrl && (overwrite || !person.driveFolderUrl)) {
        personUpdate.driveFolderUrl = row.driveFolderUrl;
      }
      // photoUrl は backfill-photos で別途扱うのでここでは触らない

      if (Object.keys(personUpdate).length > 0) {
        await prisma.person.update({ where: { id: person.id }, data: personUpdate });
      }

      // onboarding (基本住所等)
      const address = [row.prefecture, row.address].filter(Boolean).join(" ").trim() || null;
      const onboarding = person.onboarding;
      const onboardingUpdate: Record<string, unknown> = {};
      const setOnboardingIfEmpty = (key: string, value: unknown) => {
        if (value === null || value === undefined || value === "") return;
        const current = onboarding ? (onboarding as unknown as Record<string, unknown>)[key] : null;
        if (overwrite || !current) {
          onboardingUpdate[key] = value;
        }
      };
      setOnboardingIfEmpty("englishName", row.englishName);
      setOnboardingIfEmpty("birthDate", row.birthDate);
      setOnboardingIfEmpty("address", address);
      setOnboardingIfEmpty("postalCode", row.postalCode);

      // resumeProfile (基本情報の続き + master の派生)
      const resume = person.resumeProfile;
      const resumeUpdate: Record<string, unknown> = {};
      const setResumeIfEmpty = (key: string, value: unknown) => {
        if (value === null || value === undefined || value === "") return;
        const current = resume ? (resume as unknown as Record<string, unknown>)[key] : null;
        if (overwrite || !current) {
          resumeUpdate[key] = value;
        }
      };
      setResumeIfEmpty("gender", row.gender);
      setResumeIfEmpty("country", normalizeNationality(row.nationality));
      setResumeIfEmpty("visaType", normalizeResidenceStatus(row.residenceStatus));
      setResumeIfEmpty("visaExpiryDate", row.visaExpiryDate);
      setResumeIfEmpty("japaneseLevel", row.japaneseLevel);
      setResumeIfEmpty("traineeExperience", row.traineeExperience);
      if (row.preferenceNote) {
        setResumeIfEmpty("preferenceNote", `現職の手取り額: ${row.preferenceNote}`);
      }
      if (row.field) {
        setResumeIfEmpty("remarks", `分野: ${row.field}`);
      }

      // 履歴書フォーム (カタカナ名で照合) からの追加情報
      const kanaForLookup = row.katakanaName ?? person.name;
      const formKey = Array.from(Object.keys(formByKana)).find(
        (k) => k && kanaForLookup && (k === kanaForLookup || k.includes(kanaForLookup.slice(0, 3)))
      );
      const form = formKey ? formByKana[formKey] : null;
      if (form) {
        setOnboardingIfEmpty("phoneNumber", form.phoneNumber);
        setIfEmpty("email", form.email);
        setResumeIfEmpty("spouseStatus", form.spouseStatus);
        setResumeIfEmpty("childrenCount", form.childrenCount);
        setResumeIfEmpty("highSchoolName", form.highSchoolName);
        setResumeIfEmpty("highSchoolStartDate", form.highSchoolStartDate);
        setResumeIfEmpty("highSchoolEndDate", form.highSchoolEndDate);
        setResumeIfEmpty("licenseName", form.licenseName);
        setResumeIfEmpty("licenseExpiryDate", form.licenseExpiryDate);
        setResumeIfEmpty("otherQualificationName", form.qualification1);
        setResumeIfEmpty("otherQualificationExpiryDate", form.qualificationDate1);
        setResumeIfEmpty("motivation", form.motivation);
        setResumeIfEmpty("selfIntroduction", form.selfIntroduction);
        setResumeIfEmpty("japanPurpose", form.japanPurpose);
        setResumeIfEmpty("currentJob", form.currentJob);
        setResumeIfEmpty("retirementReason", form.retirementReason);
        if (form.workExperiences && form.workExperiences.length > 0) {
          setResumeIfEmpty("workExperiences", form.workExperiences);
        }
      }

      // email を Person 本体に書く処理は setIfEmpty で済ませてあるので personUpdate を再適用
      if (Object.keys(personUpdate).length > 0) {
        await prisma.person.update({ where: { id: person.id }, data: personUpdate });
      }
      if (Object.keys(onboardingUpdate).length > 0) {
        if (onboarding) {
          await prisma.personOnboarding.update({
            where: { personId: person.id },
            data: onboardingUpdate,
          });
        } else {
          await prisma.personOnboarding.create({
            data: {
              personId: person.id,
              status: "submitted",
              ...onboardingUpdate,
            },
          });
        }
      }
      if (Object.keys(resumeUpdate).length > 0) {
        if (resume) {
          await prisma.resumeProfile.update({
            where: { personId: person.id },
            data: resumeUpdate,
          });
        } else {
          await prisma.resumeProfile.create({
            data: {
              personId: person.id,
              ...resumeUpdate,
            },
          });
        }
      }

      const total =
        Object.keys(personUpdate).length +
        Object.keys(onboardingUpdate).length +
        Object.keys(resumeUpdate).length;
      if (total === 0) {
        skipped++;
        log.push(`= id=${row.id}: 既に揃っているのでスキップ`);
      } else {
        updated++;
        log.push(`✅ id=${row.id} ${row.katakanaName ?? row.englishName ?? ""}: ${total} 項目を補完`);
      }
    }

    return Response.json({
      ok: true,
      summary: {
        total: targets.length,
        updated,
        skipped,
        notFound,
        overwrite,
      },
      log,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "error" },
      { status: err instanceof AuthError ? err.status : 500 }
    );
  }
}
