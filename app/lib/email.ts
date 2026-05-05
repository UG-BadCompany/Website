import type { AppDatabase } from "./types";
import { addNotification } from "./database";

export function queueEmail(database: AppDatabase, input: { to?: string; subject: string; body: string; event: string }) {
  if (!input.to) {
    addNotification(database, {
      event: input.event,
      to: "pending-contact",
      subject: input.subject,
      body: input.body,
      status: "skipped",
    });
    return;
  }

  addNotification(database, {
    event: input.event,
    to: input.to,
    subject: input.subject,
    body: input.body,
    status: process.env.RESEND_API_KEY ? "sent" : "queued",
  });
}
