import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    await requireApiAccount();
    const { searchParams } = new URL(req.url);
    const personId = searchParams.get("personId");
    const invoices = await prisma.invoice.findMany({
      where: personId ? { personId: Number(personId) } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        person: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true, company: { select: { name: true } } } },
      },
    });
    return Response.json({ ok: true, invoices });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireApiAccount();
    const body = await req.json();
    const personId = Number(body?.personId);
    if (!Number.isFinite(personId)) {
      return Response.json({ ok: false, error: "personId が必要です" }, { status: 400 });
    }

    const invoice = await prisma.invoice.create({
      data: {
        personId,
        dealId: body.dealId ? Number(body.dealId) : null,
        unitPrice: body.unitPrice ? String(body.unitPrice) : null,
        invoiceDate: body.invoiceDate ? new Date(String(body.invoiceDate)) : null,
        invoiceAmount: body.invoiceAmount ? String(body.invoiceAmount) : null,
        invoiceNumber: body.invoiceNumber ? String(body.invoiceNumber) : null,
        invoiceStatus: body.invoiceStatus ? String(body.invoiceStatus) : "未送付",
        invoiceUrl: body.invoiceUrl ? String(body.invoiceUrl) : null,
        channel: body.channel === "PA" ? "PA" : "自社",
        partnerId: body.partnerId ? Number(body.partnerId) : null,
        costAmount: body.costAmount ? String(body.costAmount) : null,
        paInvoiceUrl: body.paInvoiceUrl ? String(body.paInvoiceUrl) : null,
        paPaid: Boolean(body.paPaid),
        paPaidAt: body.paPaidAt ? new Date(String(body.paPaidAt)) : null,
        notes: body.notes ? String(body.notes) : null,
      },
    });
    return Response.json({ ok: true, invoice });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
