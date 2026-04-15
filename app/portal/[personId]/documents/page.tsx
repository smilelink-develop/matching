import PortalFrame from "../../_components/PortalFrame";
import { getPortalOnboarding, getPortalPerson } from "../../_components/portal-data";

export const dynamic = "force-dynamic";

export default async function PortalDocumentsPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  const person = await getPortalPerson(personId);
  const { documents } = await getPortalOnboarding(personId);

  const requests = [
    {
      title: "在留カード",
      description: "カード全体が見えるように、明るい場所で撮影してください。",
      record: documents.find((document) => document.kind === "residence-card"),
    },
    {
      title: "合格書",
      description: "合格証明書や修了証明書を画像またはPDFで提出します。",
      record: documents.find((document) => document.kind === "certificate"),
    },
  ];

  return (
    <PortalFrame person={person}>
      <div className="space-y-4">
        {requests.map((request) => (
          <section
            key={request.title}
            className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.08)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-[#0F172A]">{request.title}</p>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">{request.description}</p>
              </div>
              <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#2563EB]">
                {request.record ? "提出済み" : "提出待ち"}
              </span>
            </div>

            <div className="mt-4 rounded-2xl bg-[#F8FAFC] p-4">
              {request.record ? (
                <>
                  <p className="text-sm font-medium text-[#0F172A]">提出ファイル</p>
                  <p className="mt-2 text-sm text-[#64748B]">{request.record.fileName}</p>
                  <p className="mt-2 text-sm text-[#64748B]">
                    自動判定: {request.record.autoJudgeStatus}
                  </p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    コメント: {request.record.autoJudgeNote ?? "判定待ち"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-[#0F172A]">まだ提出されていません</p>
                  <p className="mt-2 text-sm text-[#64748B]">
                    初期登録タブからアップロードすると、ここに判定結果が表示されます。
                  </p>
                </>
              )}
            </div>
          </section>
        ))}
      </div>
    </PortalFrame>
  );
}
