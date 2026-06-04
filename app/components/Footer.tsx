import Link from "next/link";
import { serviceAreaCities } from "./site-data";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand-panel">
        <h2>T&A Contracting</h2>
        <p>Premium Contractor CMMS, AI quoting, work orders, maintenance plans, and customer portals for Arizona service teams.</p>
        <Link className="button" href="/request-estimate">Start Free</Link>
      </div>
      <div className="footer-grid">
        <section>
          <h3>Platform</h3>
          <Link href="/services">Features</Link>
          <Link href="/request-estimate">AI Quote Intake</Link>
          <Link href="/login">Portal Login</Link>
        </section>
        <section>
          <h3>Operations</h3>
          <p>Work orders, inventory, scheduling, maintenance plans, analytics, users, roles, and brand controls.</p>
        </section>
        <section>
          <h3>Service Area</h3>
          <p>{serviceAreaCities.join(", ")} and surrounding Arizona communities.</p>
        </section>
      </div>
      <p className="fine-print">Every AI-generated quote remains subject to contractor review, licensing, site conditions, and approval workflows before scheduling or invoicing.</p>
    </footer>
  );
}
