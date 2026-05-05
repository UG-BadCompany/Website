import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { makeId } from "./auth";
import type { AppDatabase, AuditLog, Invoice, JobRequest, Message, Notification, Payment, Quote, ScheduleItem, UploadedFile, User } from "./types";

const dataPath = process.env.TA_DATA_FILE ?? join(process.cwd(), ".data", "ta-contracting.json");

function emptyDatabase(): AppDatabase {
  return {
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
  };
}

export function readDatabase(): AppDatabase {
  if (!existsSync(dataPath)) return emptyDatabase();
  return { ...emptyDatabase(), ...JSON.parse(readFileSync(dataPath, "utf8")) };
}

export function writeDatabase(database: AppDatabase) {
  mkdirSync(dirname(dataPath), { recursive: true });
  writeFileSync(dataPath, JSON.stringify(database, null, 2));
}

export function updateDatabase(mutator: (database: AppDatabase) => void) {
  const database = readDatabase();
  mutator(database);
  writeDatabase(database);
  return database;
}

export function nowIso() {
  return new Date().toISOString();
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

export function addAudit(database: AppDatabase, log: Omit<AuditLog, "id" | "createdAt">) {
  database.auditLogs.unshift({ id: makeId("audit"), createdAt: nowIso(), ...log });
}

export function addNotification(database: AppDatabase, notification: Omit<Notification, "id" | "createdAt" | "status"> & { status?: Notification["status"] }) {
  database.notifications.unshift({ id: makeId("note"), createdAt: nowIso(), status: notification.status ?? "queued", ...notification });
}

export function findCurrentUser(database: AppDatabase, session: { id: string } | null): User | null {
  if (!session) return null;
  return database.users.find((user) => user.id === session.id) ?? null;
}

export function upsertJobRequest(database: AppDatabase, request: JobRequest) {
  const index = database.jobRequests.findIndex((item) => item.id === request.id);
  if (index === -1) database.jobRequests.unshift(request);
  else database.jobRequests[index] = request;
}

export function upsertQuote(database: AppDatabase, quote: Quote) {
  const index = database.quotes.findIndex((item) => item.id === quote.id);
  if (index === -1) database.quotes.unshift(quote);
  else database.quotes[index] = quote;
}

export function upsertInvoice(database: AppDatabase, invoice: Invoice) {
  const index = database.invoices.findIndex((item) => item.id === invoice.id);
  if (index === -1) database.invoices.unshift(invoice);
  else database.invoices[index] = invoice;
}

export function upsertPayment(database: AppDatabase, payment: Payment) {
  const index = database.payments.findIndex((item) => item.id === payment.id);
  if (index === -1) database.payments.unshift(payment);
  else database.payments[index] = payment;
}

export function addSchedule(database: AppDatabase, item: ScheduleItem) {
  database.schedule.unshift(item);
}

export function addMessage(database: AppDatabase, message: Message) {
  database.messages.unshift(message);
}

export function addFile(database: AppDatabase, file: UploadedFile) {
  database.files.unshift(file);
}
