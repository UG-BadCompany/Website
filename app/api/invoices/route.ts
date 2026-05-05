import { NextResponse } from "next/server";
import { getSession, makeId } from "../../lib/auth";
import { addAudit, moneyFromForm, nowIso, updateDatabase, upsertInvoice } from "../../lib/database";
import { queueEmail } from "../../lib/email";
import type { Invoice } from "../../lib/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.redirect(new URL("/login?role=admin", request.url), { status: 303 });
  const form = await request.formData();
  const invoice: Invoice = { id: makeId("invoice"), invoiceNumber: `INV-${Date.now().toString().slice(-6)}`, quoteId: form.get("quoteId")?.toString() || "manual", clientName: form.get("clientName")?.toString() || "Client", clientEmail: form.get("clientEmail")?.toString() || undefined, amountDue: moneyFromForm(form.get("amountDue")), amountPaid: 0, dueAt: form.get("dueAt")?.toString() || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), status: "Sent", createdAt: nowIso() };
  updateDatabase((database) => {
    upsertInvoice(database, invoice);
    queueEmail(database, { to: invoice.clientEmail, event: "invoice_sent", subject: `T&A Contracting invoice ${invoice.invoiceNumber}`, body: `Invoice ${invoice.invoiceNumber} is ready for ${invoice.amountDue}.` });
    addAudit(database, { actor: "admin", action: "send_invoice", entityType: "Invoice", entityId: invoice.id, details: invoice.invoiceNumber });
  });
  return NextResponse.redirect(new URL("/portal/admin?invoice=sent", request.url), { status: 303 });
}
