import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Login",
  description: "Portal entry point for T&A Contracting clients, admins, and workers.",
};

export default function LoginPage() {
  return (
    <section className="section-wrap page-top">
      <p className="eyebrow">Portal login</p>
      <h1>Choose your portal.</h1>
      <div className="card-grid">
        <Link className="card portal-link" href="/portal/client"><h2>Client Portal</h2><p>Requests, quotes, invoices, payments, messages, and job history.</p></Link>
        <Link className="card portal-link" href="/portal/admin"><h2>Admin Portal</h2><p>Clients, job inbox, quotes, schedules, invoices, payments, workers, and reports.</p></Link>
        <Link className="card portal-link" href="/portal/worker"><h2>Worker Portal</h2><p>Assigned jobs, notes, checklists, photos, materials, time notes, and status updates.</p></Link>
      </div>
    </section>
  );
}
