import type { Metadata } from "next";
import { jobStatuses, portalCards } from "../../components/data";

export const metadata: Metadata = { title: "Admin Portal", description: "Admin dashboard preview for T&A Contracting." };

export default function AdminPortalPage() {
  return (
    <section className="section-wrap page-top">
      <p className="eyebrow">Admin dashboard</p>
      <h1>Run jobs from lead to quote to invoice to paid.</h1>
      <div className="metrics-grid">{portalCards.map((card) => <article className={`metric metric-${card.tone}`} key={card.label}><span>{card.label}</span><strong>{card.value}</strong><p>{card.detail}</p></article>)}</div>
      <div className="panel"><h2>Job status pipeline</h2><div className="pipeline">{jobStatuses.map((status) => <span key={status}>{status}</span>)}</div></div>
    </section>
  );
}
