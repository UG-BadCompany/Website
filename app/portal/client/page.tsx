import type { Metadata } from "next";

export const metadata: Metadata = { title: "Client Portal", description: "Client dashboard preview for T&A Contracting." };

const rows = ["Open job requests", "Quotes waiting for review", "Scheduled jobs", "Unpaid invoices", "Recent messages"];

export default function ClientPortalPage() {
  return (
    <section className="section-wrap page-top">
      <p className="eyebrow">Client dashboard</p>
      <h1>Request, review, approve, pay, and track jobs.</h1>
      <div className="dashboard-layout">
        <aside className="panel"><h2>Quick action</h2><button className="button" type="button">Request New Job</button><p>Backend connection will create request records, emails, uploads, and dashboard updates.</p></aside>
        <div className="panel"><h2>Overview</h2>{rows.map((row, index) => <div className="status-row" key={row}><span>{row}</span><strong>{index + 1}</strong></div>)}</div>
      </div>
    </section>
  );
}
