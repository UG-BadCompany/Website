import { NextResponse } from "next/server";
import { getSession, makeId } from "../../lib/auth";
import { addAudit, createInvoice, moneyFromForm, nowIso } from "../../lib/database";
import { sendEmail } from "../../lib/email";
import type { Invoice } from "../../lib/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.redirect(new URL("/login?role=admin", request.url), { status: 303 });
  const form = await request.formData();
  const invoice: Invoice = { id: makeId(), invoiceNumber: `INV-${Date.now().toString().slice(-6)}`, quoteId: form.get("quoteId")?.toString() || "manual", clientName: form.get("clientName")?.toString() || "Client", clientEmail: form.get("clientEmail")?.toString() || undefined, amountDue: moneyFromForm(form.get("amountDue")), amountPaid: 0, dueAt: form.get("dueAt")?.toString() || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), status: "Sent", createdAt: nowIso() };
  await createInvoice(invoice);
  await sendEmail({ to: invoice.clientEmail, event: "invoice_sent", subject: `T&A Contracting invoice ${invoice.invoiceNumber}`, body: `Invoice ${invoice.invoiceNumber} is ready for ${invoice.amountDue}.` });
  await addAudit({ actor: session.id, action: "send_invoice", entityType: "Invoice", entityId: invoice.id, details: invoice.invoiceNumber });
  return NextResponse.redirect(new URL("/portal/admin?invoice=sent", request.url), { status: 303 });
}
