import Link from "next/link";
import { serviceAreaCities } from "./site-data";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand-panel">
        <h2>T&A Contracting</h2>
        <p>Repair, maintenance, installation, punch-list, and property improvement help for homeowners, landlords, property managers, and small businesses.</p>
        <Link className="button" href="/request-estimate">Request Estimate</Link>
      </div>
      <div className="footer-grid">
        <section>
          <h3>Customer Links</h3>
          <Link href="/services">Services</Link>
          <Link href="/request-estimate">Request Estimate</Link>
          <Link href="/login">Client Portal / Dashboard</Link>
        </section>
        <section>
          <h3>Work We Handle</h3>
          <p>Repairs, maintenance, installations, tenant improvements, commercial maintenance, and general property work.</p>
        </section>
        <section>
          <h3>Service Area</h3>
          <p>{serviceAreaCities.join(", ")} and surrounding Arizona communities.</p>
        </section>
      </div>
      <p className="fine-print">Estimate availability depends on project scope, site conditions, licensing requirements, and service area confirmation.</p>
    </footer>
  );
}
