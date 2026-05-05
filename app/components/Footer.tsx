import Link from "next/link";
import { companyProfile, serviceAreaCities } from "../lib/config";

export function Footer() {
  return (
    <footer className="site-footer">
      <section>
        <h2>{companyProfile.name}</h2>
        <h2>T&A Contracting</h2>
        <p>Arizona-native maintenance, repairs, and improvements done right for homeowners, landlords, property managers, and small businesses.</p>
      </section>
      <section className="footer-grid">
        <div>
          <h3>Quick Links</h3>
          <Link href="/services">Services</Link>
          <Link href="/request-estimate">Request Estimate</Link>
          <Link href="/portal/client">Client Portal</Link>
        </div>
        <div>
          <h3>Service Area</h3>
          <p>{serviceAreaCities.join(", ")} and surrounding Arizona communities.</p>
        </div>
        <div>
          <h3>Contact</h3>
          <p>{companyProfile.publicContactNote}</p>
          <Link href="/request-estimate">Use the online estimate form</Link>
          <p>Arizona service areas to be finalized by owner before production launch.</p>
        </div>
        <div>
          <h3>Contact</h3>
          <p><a href="tel:+10000000000">Phone number pending</a></p>
          <p><a href="mailto:info@example.com">Business email pending</a></p>
        </div>
      </section>
      <p className="fine-print">Service availability depends on project scope and licensing requirements. T&A Contracting will confirm whether a requested job is within scope before quoting or scheduling work.</p>
    </footer>
  );
}
