import type { Metadata } from "next";
import { jobStatuses } from "../../components/site-data";

export const metadata: Metadata = {
  title: "Admin Portal Preview",
  description: "Admin dashboard preview for T&A Contracting.",
};

const metrics = ["New requests", "Quotes awaiting response", "Accepted quotes", "Jobs this week", "Overdue invoices", "Recent payments"];

export default function AdminPortalPage() {
  return (
    <section className="section-wrap page-top">
      <p className="eyebrow">Admin dashboard preview</p>
      <h1>Run jobs from lead to quote to invoice to paid.</h1>
      <div className="metrics-grid">{metrics.map((metric, index) => <article className="metric" key={metric}><span>{metric}</span><strong>{index + 2}</strong><p>Preview data</p></article>)}</div>
      <div className="panel"><h2>Job status pipeline</h2><div className="pipeline">{jobStatuses.map((status) => <span key={status}>{status}</span>)}</div></div>
    </section>
  );
}
