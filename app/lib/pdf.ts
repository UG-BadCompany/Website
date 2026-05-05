import type { Invoice, Quote } from "./types";
import { companyProfile } from "./config";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function quotePdfText(quote: Quote) {
  const lines = quote.lineItems.map((item) => `${item.type}: ${item.description} — ${item.quantity} x ${currency(item.unitPrice)}`).join("\n");
  return `${companyProfile.name}\n${companyProfile.tagline}\n\nQuote ${quote.quoteNumber}\nClient: ${quote.clientName}\nProperty: ${quote.propertyAddress}\nExpires: ${quote.expiresAt}\n\nScope of Work\n${quote.scopeOfWork}\n\nIncluded Work\n${quote.includedWork}\n\nExcluded Work\n${quote.excludedWork}\n\nLine Items\n${lines}\n\nSubtotal: ${currency(quote.subtotal)}\nTax: ${currency(quote.tax)}\nDiscount: ${currency(quote.discount)}\nTotal: ${currency(quote.total)}\nDeposit Required: ${currency(quote.depositRequired)}\n\nTerms\n${quote.terms}\n`;
}

export function invoicePdfText(invoice: Invoice) {
  return `${companyProfile.name}\nInvoice ${invoice.invoiceNumber}\nClient: ${invoice.clientName}\nAmount due: ${currency(invoice.amountDue)}\nAmount paid: ${currency(invoice.amountPaid)}\nDue: ${invoice.dueAt}\nStatus: ${invoice.status}\n`;
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function textToPdfBuffer(title: string, body: string) {
  const safeLines = [`T&A Contracting - ${title}`, ...body.split("\n")].slice(0, 80);
  const content = [
    "BT",
    "/F1 10 Tf",
    "50 760 Td",
    "14 TL",
    ...safeLines.map((line) => `(${escapePdfText(line.slice(0, 100))}) Tj T*`),
    "ET",
  ].join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(content)} >> stream\n${content}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${object}\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n");
  pdf += `\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
}
