import { NextResponse } from "next/server";
import { getQuote } from "../../../../lib/database";
import { renderQuotePdf } from "../../../../lib/pdf";

export async function GET(_request: Request, context: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await context.params;
  const quote = await getQuote(quoteId);
  if (!quote) return new NextResponse("Quote not found", { status: 404 });
  const body = await renderQuotePdf(quote);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quote.quoteNumber}.pdf"`,
    },
  });
}
