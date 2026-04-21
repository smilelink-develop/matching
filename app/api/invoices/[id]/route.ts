import { prisma } from "@/lib/prisma";
import { AuthError, requireApiAccount } from "@/lib/auth";

type Params = Promise<{ id: string }>;

export async function PATCH(req: Request, { params }: { params: Params }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.dealId !== undefined) data.dealId = body.dealId ? Number(body.dealId) : null;
    if (body.unitPrice !== undefined) data.unitPrice = body.unitPrice ? String(body.unitPrice) : null;
    if (body.invoiceDate !== undefined) data.invoiceDate = body.invoiceDate ? new Date(String(body.invoiceDate)) : null;
    if (body.invoiceAmount !== undefined) data.invoiceAmount = body.invoiceAmount ? String(body.invoiceAmount) : null;
    if (body.invoiceNumber !== undefined) data.invoiceNumber = body.invoiceNumber ? String(body.invoiceNumber) : null;
    if (body.invoiceStatus !== undefined) data.invoiceStatus = body.invoiceStatus ? String(body.invoiceStatus) : "未送付";
    if (body.invoiceUrl !== undefined) data.invoiceUrl = body.invoiceUrl ? String(body.invoiceUrl) : null;
    if (body.channel !== undefined) data.channel = body.channel === "PA" ? "PA" : "自社";
    if (body.partnerId !== undefined) data.partnerId = body.partnerId ? Number(body.partnerId) : null;
    if (body.costAmount !== undefined) data.costAmount = body.costAmount ? String(body.costAmount) : null;
    if (body.paInvoiceUrl !== undefined) data.paInvoiceUrl = body.paInvoiceUrl ? String(body.paInvoiceUrl) : null;
    if (body.paPaid !== undefined) data.paPaid = Boolean(body.paPaid);
    if (body.paPaidAt !== undefined) data.paPaidAt = body.paPaidAt ? new Date(String(body.paPaidAt)) : null;
    if (body.notes !== undefined) data.notes = body.notes ? String(body.notes) : null;

    const invoice = await prisma.invoice.update({ where: { id: Number(id) }, data });
    return Response.json({ ok: true, invoice });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Params }) {
  try {
    await requireApiAccount();
    const { id } = await params;
    await prisma.invoice.delete({ where: { id: Number(id) } });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "error" },
      { status: error instanceof AuthError ? error.status : 500 }
    );
  }
}
