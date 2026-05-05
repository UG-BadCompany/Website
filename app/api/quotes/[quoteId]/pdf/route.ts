import { NextResponse } from "next/server";
import { readDatabase } from "../../../../lib/database";
import { quotePdfText, textToPdfBuffer } from "../../../../lib/pdf";

export async function GET(_request: Request, context: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await context.params;
  const quote = readDatabase().quotes.find((item) => item.id === quoteId);
  if (!quote) return new NextResponse("Quote not found", { status: 404 });
  return new NextResponse(textToPdfBuffer(quote.quoteNumber, quotePdfText(quote)), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quote.quoteNumber}.pdf"`,
    },
  });
}
