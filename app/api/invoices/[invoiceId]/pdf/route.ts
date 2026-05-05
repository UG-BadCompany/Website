import { NextResponse } from "next/server";
import { readDatabase } from "../../../../lib/database";
import { invoicePdfText, textToPdfBuffer } from "../../../../lib/pdf";

export async function GET(_request: Request, context: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await context.params;
  const invoice = readDatabase().invoices.find((item) => item.id === invoiceId);
  if (!invoice) return new NextResponse("Invoice not found", { status: 404 });
  return new NextResponse(textToPdfBuffer(invoice.invoiceNumber, invoicePdfText(invoice)), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
