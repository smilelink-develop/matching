import { prisma } from "@/lib/prisma";
import {
  buildPersonAssetName,
  buildPersonFolderName,
  ensurePersonDriveFolder,
  uploadDataUrlToDrive,
} from "@/lib/google-docs";

type Params = Promise<{ personId: string }>;

export async function GET(_: Request, { params }: { params: Params }) {
  try {
    const { personId } = await params;
    const questions = await prisma.personCustomQuestion.findMany({
      where: { personId: Number(personId), active: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: {
        id: true,
        label: true,
        type: true,
        required: true,
        answer: true,
        fileName: true,
        fileUrl: true,
      },
    });
    return Response.json({ ok: true, questions });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "error" }, { status: 500 });
  }
}

type AnswerPayload = {
  id: number;
  type: string;
  answer?: string | null;
  fileDataUrl?: string | null;
  fileName?: string | null;
};

export async function POST(req: Request, { params }: { params: Params }) {
  try {
    const { personId } = await params;
    const personIdNum = Number(personId);
    const body = await req.json();
    const answers = Array.isArray(body?.answers) ? (body.answers as AnswerPayload[]) : [];

    const person = await prisma.person.findUnique({
      where: { id: personIdNum },
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

    // ファイル添付があるときのみ Drive フォルダを確保（無い場合は一切触らない）
    let folderUrl: string | null = person.driveFolderUrl ?? null;
    const hasFileUpload = answers.some(
      (a) => a?.type === "file" && typeof a.fileDataUrl === "string" && a.fileDataUrl.startsWith("data:")
    );
    if (hasFileUpload) {
      const folder = await ensurePersonDriveFolder({
        existingFolderUrl: person.driveFolderUrl,
        personId: person.id,
        personName: folderName,
      });
      folderUrl = folder.folderUrl;
      if (!person.driveFolderUrl) {
        await prisma.person.update({ where: { id: personIdNum }, data: { driveFolderUrl: folderUrl } });
      }
    }

    for (const item of answers) {
      if (!item?.id) continue;
      if (item.type === "file") {
        if (typeof item.fileDataUrl === "string" && item.fileDataUrl.startsWith("data:") && folderUrl) {
          const assetName = (item.fileName || `custom-${item.id}`).replace(/\.[^.]+$/, "");
          const ext = (item.fileName ?? "").match(/\.[^.]+$/)?.[0] ?? "";
          const uploaded = await uploadDataUrlToDrive({
            dataUrl: item.fileDataUrl,
            fileName: `${buildPersonAssetName({
              person: {
                id: person.id,
                englishName: person.onboarding?.englishName ?? null,
                name: person.name,
              },
              assetName,
            })}${ext}`,
            folderUrl,
          });
          await prisma.personCustomQuestion.update({
            where: { id: item.id },
            data: {
              fileName: item.fileName ?? null,
              fileUrl: uploaded.fileUrl,
              mimeType: uploaded.mimeType,
              answer: null,
            },
          });
        }
      } else {
        await prisma.personCustomQuestion.update({
          where: { id: item.id },
          data: { answer: typeof item.answer === "string" ? item.answer : null },
        });
      }
    }

    // 対応タスクを完了にする
    await prisma.portalTask.updateMany({
      where: { personId: personIdNum, type: "custom-questions", status: "pending" },
      data: { status: "completed", completedAt: new Date() },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "error" }, { status: 500 });
  }
}
