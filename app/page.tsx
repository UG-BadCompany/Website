import Link from "next/link";

const stats = [
  ["48K+", "Quotes Generated"],
  ["112K+", "Jobs Managed"],
  ["$38M", "Revenue Tracked"],
  ["19K+", "AI Estimates Created"],
];

const features = [
  ["AI Quoting", "Analyze customer requests, generate scopes, surface risks, and prepare reviewer-ready estimates."],
  ["Work Orders", "Convert approved quotes into schedules, assignments, notes, photos, closeout, and invoices."],
  ["Inventory", "Track materials, low-stock alerts, supplier costs, and truck/warehouse availability."],
  ["Maintenance Plans", "Manage recurring service agreements, renewals, visits, and customer communications."],
  ["Scheduling", "Coordinate technicians, job windows, priority work, and dispatch visibility."],
  ["Client Portal", "Give customers a polished place to request, approve, pay, and track work."],
  ["Technician Portal", "Field crews can see jobs, materials, notes, photos, and AI troubleshooting."],
  ["Analytics", "Watch revenue, quote velocity, technician activity, open jobs, and AI performance."],
  ["Role Management", "Owner, admin, manager, worker, and client access stays clean and permission-safe."],
];

const comparison = [
  ["AI estimate drafting", "Included", "Manual add-ons"],
  ["CMMS + quoting workflow", "Unified", "Split tools"],
  ["Client + technician portals", "Included", "Limited"],
  ["White-label branding", "Built in", "Enterprise only"],
];

export default function Home() {
  return (
    <>
      <section className="hero section-wrap premium-hero">
        <div className="hero-copy">
          <p className="eyebrow">Contractor CMMS + AI Quoting Platform</p>
          <h1>Run Your Entire Contracting Business From One Platform</h1>
          <p className="hero-text">Manage clients, estimates, work orders, inventory, technicians, maintenance plans, invoices, and AI-powered quoting from one premium operating system.</p>
          <div className="button-row">
            <Link className="button" href="/request-estimate">Start Free</Link>
            <Link className="button button-dark" href="/contact">Request Demo</Link>
          </div>
          <div className="hero-stats" aria-label="Platform statistics">
            {stats.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
          </div>
        </div>
        <aside className="dashboard-preview" aria-label="Dashboard preview">
          <div className="preview-top"><span /> <span /> <span /></div>
          <div className="preview-kpis">
            <div><small>Revenue</small><strong>$128k</strong></div>
            <div><small>Open Jobs</small><strong>42</strong></div>
            <div><small>AI Confidence</small><strong>94%</strong></div>
          </div>
          <div className="preview-chart"><span style={{ height: "42%" }} /><span style={{ height: "64%" }} /><span style={{ height: "56%" }} /><span style={{ height: "82%" }} /><span style={{ height: "74%" }} /></div>
          <div className="preview-list"><p><b>AI quote ready</b><span>Kitchen remodel scope</span></p><p><b>Technician dispatched</b><span>HVAC preventive maintenance</span></p><p><b>Inventory alert</b><span>Low stock: shutoff valves</span></p></div>
        </aside>
      </section>

      <section className="trust-bar" aria-label="Trust highlights">
        <strong>AI-powered estimates</strong><strong>CMMS operations</strong><strong>White-label branding</strong><strong>Mobile-first portals</strong>
      </section>

      <section className="section-wrap">
        <div className="section-heading centered">
          <p className="eyebrow">Premium platform modules</p>
          <h2>Everything contractors need to quote faster, operate cleaner, and scale with confidence.</h2>
        </div>
        <div className="card-grid three feature-grid">
          {features.map(([title, text]) => <article className="card" key={title}><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="section-wrap split-panel ai-panel">
        <div>
          <p className="eyebrow">Flagship AI</p>
          <h2>Reviewer-ready AI quoting and troubleshooting built for field reality.</h2>
        </div>
        <div className="check-list">
          <p>Identifies trade, scope, labor, materials, equipment, permits, code concerns, risk flags, confidence, and follow-up questions.</p>
          <p>Creates troubleshooting plans with likely causes, tests, repair recommendations, safety warnings, and next diagnostic steps.</p>
          <p>Explains confidence with scope, photo, trade, material, pricing, regional, and data-completeness signals.</p>
        </div>
      </section>

      <section className="section-wrap">
        <div className="metrics-grid stats-grid">
          {stats.map(([value, label]) => <article className="metric" key={label}><span>{label}</span><strong>{value}</strong><p>Production workflow capacity for growing contractor teams.</p></article>)}
        </div>
      </section>

      <section className="section-wrap comparison-section">
        <div className="section-heading">
          <p className="eyebrow">Comparison</p>
          <h2>A unified platform instead of disconnected point tools.</h2>
        </div>
        <div className="comparison-table" role="table" aria-label="Feature comparison">
          <div role="row"><strong>Capability</strong><strong>This platform</strong><strong>Typical tools</strong></div>
          {comparison.map((row) => <div role="row" key={row[0]}>{row.map((cell) => <span key={cell}>{cell}</span>)}</div>)}
        </div>
      </section>

      <section className="section-wrap testimonials">
        <article className="card"><p>“The dashboard finally gives our office, field, and customers the same source of truth.”</p><strong>Operations Manager</strong></article>
        <article className="card"><p>“AI quote drafts cut back-and-forth while still keeping admin approval in control.”</p><strong>General Contractor</strong></article>
        <article className="card"><p>“Mobile work orders, notes, and materials made technician handoffs dramatically cleaner.”</p><strong>Service Lead</strong></article>
      </section>

      <section className="final-cta premium-cta">
        <h2>Ready to run quoting, jobs, inventory, and customer updates from one branded platform?</h2>
        <p>Launch a premium contractor CMMS and AI estimating experience for owners, admins, technicians, and clients.</p>
        <div className="button-row centered-buttons"><Link className="button" href="/request-estimate">Start Free</Link><Link className="button button-dark" href="/contact">Request Demo</Link></div>
      </section>
    </>
  );
}
