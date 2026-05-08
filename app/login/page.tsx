import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Client Login",
  description: "Portal preview for T&A Contracting clients, admins, and workers.",
};

const portals = [
  { href: "/portal/client", title: "Client Portal", text: "Requests, quotes, invoices, messages, and job history." },
  { href: "/portal/admin", title: "Admin Portal", text: "Job request inbox, quote builder, schedules, invoices, and reports." },
  { href: "/portal/worker", title: "Worker Portal", text: "Assigned jobs, notes, checklists, photos, and status updates." },
];

export default function LoginPage() {
  return (
    <section className="section-wrap page-top">
      <p className="eyebrow">Portal login</p>
      <h1>Portal structure ready for authentication.</h1>
      <p className="lead">This preview shows the planned client, admin, and worker entry points. Secure login, registration, password reset, and role permissions will be connected in the next backend phase.</p>
      <div className="card-grid three">
        {portals.map((portal) => (
          <Link className="card portal-link" href={portal.href} key={portal.href}>
            <h2>{portal.title}</h2>
            <p>{portal.text}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
