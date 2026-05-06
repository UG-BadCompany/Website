import { Resend } from "resend";
import { addNotification } from "./database";

export async function sendEmail(input: { to?: string; subject: string; body: string; event: string; attachments?: Array<{ filename: string; content: Buffer | string }> }) {
  if (!input.to) {
    await addNotification({ event: input.event, to: "pending-contact", subject: input.subject, body: input.body, status: "skipped" });
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    await addNotification({ event: input.event, to: input.to, subject: input.subject, body: input.body, status: "queued" });
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "T&A Contracting <onboarding@resend.dev>",
    to: input.to,
    subject: input.subject,
    text: input.body,
    attachments: input.attachments,
  });

  await addNotification({ event: input.event, to: input.to, subject: input.subject, body: input.body, status: error ? "failed" : "sent", providerId: data?.id });
  if (error) throw error;
}

export const queueEmail = sendEmail;
