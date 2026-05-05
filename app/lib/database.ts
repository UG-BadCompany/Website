import { randomUUID } from "crypto";
import { createSupabaseServiceClient } from "./supabase";
import type { AppDatabase, AuditLog, Invoice, JobRequest, Message, Notification, Payment, Quote, ScheduleItem, UploadedFile, User } from "./types";

export function nowIso() {
  return new Date().toISOString();
}

export function makeId() {
  return randomUUID();
}

export function moneyFromForm(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

export function calculateQuote(lineItems: Quote["lineItems"], tax = 0, discount = 0) {
  const lineTotal = lineItems.reduce((sum, item) => {
    const value = item.quantity * item.unitPrice;
    return item.type === "Discount" ? sum - value : sum + value;
  }, 0);
  const subtotal = Math.max(0, Math.round(lineTotal * 100) / 100);
  const total = Math.max(0, Math.round((subtotal + tax - discount) * 100) / 100);
  return { subtotal, total };
}

const emptyDatabase = (): AppDatabase => ({
  users: [],
  properties: [],
  jobRequests: [],
  quotes: [],
  invoices: [],
  payments: [],
  schedule: [],
  messages: [],
  files: [],
  notifications: [],
  auditLogs: [],
});

function profileFromRow(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    role: row.role as User["role"],
    name: String(row.name ?? "Portal User"),
    email: row.email ? String(row.email) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    createdAt: String(row.created_at),
  };
}

function jobRequestFromRow(row: Record<string, unknown>, files: UploadedFile[] = []): JobRequest {
  return {
    id: String(row.id),
    clientId: row.client_id ? String(row.client_id) : undefined,
    propertyId: row.property_id ? String(row.property_id) : undefined,
    name: String(row.name),
    email: row.email ? String(row.email) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    propertyAddress: String(row.property_address),
    serviceCategory: String(row.service_category),
    desiredTimeframe: String(row.desired_timeframe),
    priority: row.priority as JobRequest["priority"],
    description: String(row.description),
    preferredContactMethod: row.preferred_contact_method as JobRequest["preferredContactMethod"],
    accessNotes: row.access_notes ? String(row.access_notes) : undefined,
    specialInstructions: row.special_instructions ? String(row.special_instructions) : undefined,
    files,
    status: row.status as JobRequest["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function fileFromRow(row: Record<string, unknown>): UploadedFile {
  return {
    id: String(row.id),
    jobRequestId: row.job_request_id ? String(row.job_request_id) : undefined,
    originalName: String(row.original_name),
    storedName: String(row.stored_name),
    contentType: String(row.content_type),
    size: Number(row.size),
    url: String(row.url),
    createdAt: String(row.created_at),
  };
}

function quoteFromRow(row: Record<string, unknown>, lineItems: Quote["lineItems"] = []): Quote {
  return {
    id: String(row.id),
    quoteNumber: String(row.quote_number),
    jobRequestId: String(row.job_request_id ?? ""),
    clientName: String(row.client_name),
    clientEmail: row.client_email ? String(row.client_email) : undefined,
    propertyAddress: String(row.property_address),
    scopeOfWork: String(row.scope_of_work),
    includedWork: String(row.included_work),
    excludedWork: String(row.excluded_work),
    terms: String(row.terms),
    lineItems,
    subtotal: Number(row.subtotal),
    tax: Number(row.tax),
    discount: Number(row.discount),
    total: Number(row.total),
    depositRequired: Number(row.deposit_required),
    expiresAt: String(row.expires_at),
    status: row.status as Quote["status"],
    version: Number(row.version),
    acceptedAt: row.accepted_at ? String(row.accepted_at) : undefined,
    declinedAt: row.declined_at ? String(row.declined_at) : undefined,
    declineReason: row.decline_reason ? String(row.decline_reason) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function lineItemFromRow(row: Record<string, unknown>): Quote["lineItems"][number] {
  return {
    id: String(row.id),
    quoteId: row.quote_id ? String(row.quote_id) : undefined,
    description: String(row.description),
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    type: row.type as Quote["lineItems"][number]["type"],
  };
}

function invoiceFromRow(row: Record<string, unknown>): Invoice {
  return {
    id: String(row.id),
    invoiceNumber: String(row.invoice_number),
    quoteId: String(row.quote_id ?? ""),
    clientName: String(row.client_name),
    clientEmail: row.client_email ? String(row.client_email) : undefined,
    amountDue: Number(row.amount_due),
    amountPaid: Number(row.amount_paid),
    dueAt: String(row.due_at),
    status: row.status as Invoice["status"],
    stripeCheckoutSessionId: row.stripe_checkout_session_id ? String(row.stripe_checkout_session_id) : undefined,
    createdAt: String(row.created_at),
  };
}

function paymentFromRow(row: Record<string, unknown>): Payment {
  return {
    id: String(row.id),
    invoiceId: String(row.invoice_id),
    provider: row.provider as Payment["provider"],
    providerSessionId: row.provider_session_id ? String(row.provider_session_id) : undefined,
    paymentIntentId: row.payment_intent_id ? String(row.payment_intent_id) : undefined,
    amount: Number(row.amount),
    status: row.status as Payment["status"],
    receiptUrl: row.receipt_url ? String(row.receipt_url) : undefined,
    createdAt: String(row.created_at),
  };
}

function scheduleFromRow(row: Record<string, unknown>): ScheduleItem {
  return {
    id: String(row.id),
    jobRequestId: String(row.job_request_id),
    workerId: row.worker_id ? String(row.worker_id) : undefined,
    startsAt: String(row.starts_at),
    endsAt: row.ends_at ? String(row.ends_at) : undefined,
    status: row.status as ScheduleItem["status"],
    notes: row.notes ? String(row.notes) : undefined,
  };
}

function messageFromRow(row: Record<string, unknown>): Message {
  return {
    id: String(row.id),
    jobRequestId: String(row.job_request_id),
    authorRole: row.author_role as Message["authorRole"],
    authorName: String(row.author_name),
    body: String(row.body),
    internalOnly: Boolean(row.internal_only),
    createdAt: String(row.created_at),
  };
}

export async function readDatabase(): Promise<AppDatabase> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return emptyDatabase();
  const supabase = createSupabaseServiceClient();
  const [profiles, jobRequests, files, quotes, lineItems, invoices, payments, schedule, messages] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("job_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("files").select("*").order("created_at", { ascending: false }),
    supabase.from("quotes").select("*").order("created_at", { ascending: false }),
    supabase.from("quote_line_items").select("*").order("created_at", { ascending: true }),
    supabase.from("invoices").select("*").order("created_at", { ascending: false }),
    supabase.from("payments").select("*").order("created_at", { ascending: false }),
    supabase.from("schedule_items").select("*").order("created_at", { ascending: false }),
    supabase.from("messages").select("*").order("created_at", { ascending: false }),
  ]);
  const fileRows = (files.data ?? []).map(fileFromRow);
  const itemRows = (lineItems.data ?? []).map(lineItemFromRow);
  return {
    ...emptyDatabase(),
    users: (profiles.data ?? []).map(profileFromRow),
    jobRequests: (jobRequests.data ?? []).map((row) => jobRequestFromRow(row, fileRows.filter((file) => file.jobRequestId === row.id))),
    files: fileRows,
    quotes: (quotes.data ?? []).map((row) => quoteFromRow(row, itemRows.filter((item) => item.quoteId === row.id))),
    invoices: (invoices.data ?? []).map(invoiceFromRow),
    payments: (payments.data ?? []).map(paymentFromRow),
    schedule: (schedule.data ?? []).map(scheduleFromRow),
    messages: (messages.data ?? []).map(messageFromRow),
  };
}

export async function getProfile(id?: string | null) {
  if (!id) return null;
  const { data } = await createSupabaseServiceClient().from("profiles").select("*").eq("id", id).maybeSingle();
  return data ? profileFromRow(data) : null;
}

export async function addAudit(log: Omit<AuditLog, "id" | "createdAt">) {
  await createSupabaseServiceClient().from("audit_logs").insert({ actor: log.actor, action: log.action, entity_type: log.entityType, entity_id: log.entityId, details: log.details });
}

export async function addNotification(notification: Omit<Notification, "id" | "createdAt" | "status"> & { status?: Notification["status"]; providerId?: string }) {
  await createSupabaseServiceClient().from("notifications").insert({ event: notification.event, recipient: notification.to, subject: notification.subject, body: notification.body, status: notification.status ?? "queued", provider_id: notification.providerId });
}

export async function createProfile(profile: Omit<User, "createdAt">) {
  await createSupabaseServiceClient().from("profiles").upsert({ id: profile.id, role: profile.role, name: profile.name, email: profile.email, phone: profile.phone });
}

export async function createJobRequest(request: JobRequest) {
  await createSupabaseServiceClient().from("job_requests").insert({ id: request.id, client_id: request.clientId, name: request.name, email: request.email, phone: request.phone, property_address: request.propertyAddress, service_category: request.serviceCategory, desired_timeframe: request.desiredTimeframe, priority: request.priority, description: request.description, preferred_contact_method: request.preferredContactMethod, access_notes: request.accessNotes, special_instructions: request.specialInstructions, status: request.status });
}

export async function addFile(file: UploadedFile, jobRequestId?: string) {
  await createSupabaseServiceClient().from("files").insert({ id: file.id, job_request_id: jobRequestId, original_name: file.originalName, stored_name: file.storedName, content_type: file.contentType, size: file.size, url: file.url });
}

export async function createQuote(quote: Quote) {
  const supabase = createSupabaseServiceClient();
  await supabase.from("quotes").insert({ id: quote.id, quote_number: quote.quoteNumber, job_request_id: quote.jobRequestId === "manual" ? null : quote.jobRequestId, client_name: quote.clientName, client_email: quote.clientEmail, property_address: quote.propertyAddress, scope_of_work: quote.scopeOfWork, included_work: quote.includedWork, excluded_work: quote.excludedWork, terms: quote.terms, subtotal: quote.subtotal, tax: quote.tax, discount: quote.discount, total: quote.total, deposit_required: quote.depositRequired, expires_at: quote.expiresAt, status: quote.status, version: quote.version });
  if (quote.lineItems.length) await supabase.from("quote_line_items").insert(quote.lineItems.map((item) => ({ id: item.id, quote_id: quote.id, description: item.description, quantity: item.quantity, unit_price: item.unitPrice, type: item.type })));
}

export async function updateJobStatus(jobRequestId: string, status: JobRequest["status"]) {
  await createSupabaseServiceClient().from("job_requests").update({ status, updated_at: nowIso() }).eq("id", jobRequestId);
}

export async function getQuote(id: string) {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const { data: items } = await supabase.from("quote_line_items").select("*").eq("quote_id", id).order("created_at", { ascending: true });
  return quoteFromRow(data, (items ?? []).map(lineItemFromRow));
}

export async function updateQuoteResponse(id: string, values: Partial<Pick<Quote, "status" | "acceptedAt" | "declinedAt" | "declineReason">>) {
  await createSupabaseServiceClient().from("quotes").update({ status: values.status, accepted_at: values.acceptedAt, declined_at: values.declinedAt, decline_reason: values.declineReason, updated_at: nowIso() }).eq("id", id);
}

export async function createInvoice(invoice: Invoice) {
  await createSupabaseServiceClient().from("invoices").insert({ id: invoice.id, invoice_number: invoice.invoiceNumber, quote_id: invoice.quoteId === "manual" ? null : invoice.quoteId, client_name: invoice.clientName, client_email: invoice.clientEmail, amount_due: invoice.amountDue, amount_paid: invoice.amountPaid, due_at: invoice.dueAt, status: invoice.status });
}

export async function getInvoice(id: string) {
  const { data } = await createSupabaseServiceClient().from("invoices").select("*").eq("id", id).maybeSingle();
  return data ? invoiceFromRow(data) : null;
}

export async function updateInvoicePaid(invoiceId: string, amountPaid: number, sessionId: string) {
  await createSupabaseServiceClient().from("invoices").update({ amount_paid: amountPaid, status: "Paid", stripe_checkout_session_id: sessionId }).eq("id", invoiceId);
}

export async function createPayment(payment: Payment) {
  await createSupabaseServiceClient().from("payments").insert({ id: payment.id, invoice_id: payment.invoiceId, provider: payment.provider, provider_session_id: payment.providerSessionId, payment_intent_id: payment.paymentIntentId, amount: payment.amount, status: payment.status, receipt_url: payment.receiptUrl });
}

export async function updatePaymentStatus(sessionId: string, status: Payment["status"], paymentIntentId?: string) {
  await createSupabaseServiceClient().from("payments").update({ status, payment_intent_id: paymentIntentId }).eq("provider_session_id", sessionId);
}

export async function addSchedule(item: ScheduleItem) {
  await createSupabaseServiceClient().from("schedule_items").insert({ id: item.id, job_request_id: item.jobRequestId === "manual" ? null : item.jobRequestId, worker_id: item.workerId, starts_at: item.startsAt, ends_at: item.endsAt, status: item.status, notes: item.notes });
}

export async function addMessage(message: Message) {
  await createSupabaseServiceClient().from("messages").insert({ id: message.id, job_request_id: message.jobRequestId === "general" ? null : message.jobRequestId, author_role: message.authorRole, author_name: message.authorName, body: message.body, internal_only: message.internalOnly });
}

export function findCurrentUser(database: AppDatabase, session: { id: string } | null): User | null {
  if (!session) return null;
  return database.users.find((user) => user.id === session.id) ?? null;
}
