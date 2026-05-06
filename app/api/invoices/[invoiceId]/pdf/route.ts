import { NextResponse } from "next/server";
import { getInvoice } from "../../../../lib/database";
import { renderInvoicePdf } from "../../../../lib/pdf";

export async function GET(_request: Request, context: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await context.params;
  const invoice = await getInvoice(invoiceId);
  if (!invoice) return new NextResponse("Invoice not found", { status: 404 });
  const body = await renderInvoicePdf(invoice);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
