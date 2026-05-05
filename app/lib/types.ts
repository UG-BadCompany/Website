export type Role = "client" | "admin" | "worker";
export type JobStatus =
  | "New request"
  | "Needs review"
  | "Quote in progress"
  | "Quote sent"
  | "Awaiting client response"
  | "Quote accepted"
  | "Deposit paid"
  | "Scheduled"
  | "In progress"
  | "Waiting on materials"
  | "Waiting on client"
  | "Completed"
  | "Invoiced"
  | "Paid"
  | "Closed"
  | "Canceled";

export type User = {
  id: string;
  role: Role;
  name: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
};

export type Property = {
  id: string;
  clientId: string;
  label: string;
  street: string;
  city: string;
  zip: string;
  accessNotes?: string;
};

export type JobRequest = {
  id: string;
  clientId?: string;
  propertyId?: string;
  name: string;
  email?: string;
  phone?: string;
  propertyAddress: string;
  serviceCategory: string;
  desiredTimeframe: string;
  priority: "Flexible" | "Standard" | "Urgent review requested";
  description: string;
  preferredContactMethod: "Portal" | "Phone" | "Email";
  accessNotes?: string;
  specialInstructions?: string;
  files: UploadedFile[];
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
};

export type QuoteLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  type: "Labor" | "Materials" | "Fee" | "Discount";
};

export type Quote = {
  id: string;
  quoteNumber: string;
  jobRequestId: string;
  clientName: string;
  clientEmail?: string;
  propertyAddress: string;
  scopeOfWork: string;
  includedWork: string;
  excludedWork: string;
  terms: string;
  lineItems: QuoteLineItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  depositRequired: number;
  expiresAt: string;
  status: "Draft" | "Sent" | "Accepted" | "Declined" | "Changes requested";
  version: number;
  acceptedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  quoteId: string;
  clientName: string;
  clientEmail?: string;
  amountDue: number;
  amountPaid: number;
  dueAt: string;
  status: "Draft" | "Sent" | "Partially paid" | "Paid" | "Refunded" | "Canceled";
  createdAt: string;
};

export type Payment = {
  id: string;
  invoiceId: string;
  provider: "Stripe" | "Manual";
  providerSessionId?: string;
  amount: number;
  status: "Pending" | "Paid" | "Failed" | "Refunded";
  receiptUrl?: string;
  createdAt: string;
};

export type ScheduleItem = {
  id: string;
  jobRequestId: string;
  workerId?: string;
  startsAt: string;
  endsAt?: string;
  status: "Scheduled" | "Rescheduled" | "Completed" | "Canceled";
  notes?: string;
};

export type Message = {
  id: string;
  jobRequestId: string;
  authorRole: Role;
  authorName: string;
  body: string;
  internalOnly: boolean;
  createdAt: string;
};

export type UploadedFile = {
  id: string;
  originalName: string;
  storedName: string;
  contentType: string;
  size: number;
  url: string;
  createdAt: string;
};

export type Notification = {
  id: string;
  event: string;
  to: string;
  subject: string;
  body: string;
  status: "queued" | "sent" | "skipped" | "failed";
  createdAt: string;
};

export type AuditLog = {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
};

export type AppDatabase = {
  users: User[];
  properties: Property[];
  jobRequests: JobRequest[];
  quotes: Quote[];
  invoices: Invoice[];
  payments: Payment[];
  schedule: ScheduleItem[];
  messages: Message[];
  files: UploadedFile[];
  notifications: Notification[];
  auditLogs: AuditLog[];
};
