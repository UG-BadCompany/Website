import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Client Portal Preview",
  description: "Client dashboard preview for T&A Contracting.",
};

const rows = ["Open job requests", "Quotes waiting for review", "Accepted quotes", "Scheduled jobs", "Completed jobs", "Unpaid invoices", "Recent messages"];

export default function ClientPortalPage() {
  return (
    <section className="section-wrap page-top">
      <p className="eyebrow">Client dashboard preview</p>
      <h1>Request, review, approve, pay, and track jobs.</h1>
      <div className="dashboard-layout">
        <aside className="panel"><h2>Quick action</h2><Link className="button" href="/request-estimate">Request New Job</Link><p>Future backend phase: saved profiles, properties, job history, quotes, invoices, payments, and messages.</p></aside>
        <div className="panel"><h2>Dashboard modules</h2>{rows.map((row, index) => <div className="status-row" key={row}><span>{row}</span><strong>{index + 1}</strong></div>)}</div>
      </div>
    </section>
  );
}
