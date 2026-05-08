import Link from "next/link";
import { serviceAreaCities } from "./site-data";

export function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <h2>T&A Contracting</h2>
        <p>Arizona-native maintenance, repairs, and improvements done right.</p>
      </div>
      <div className="footer-grid">
        <section>
          <h3>Quick Links</h3>
          <Link href="/services">Services</Link>
          <Link href="/request-estimate">Request Estimate</Link>
          <Link href="/login">Client Login</Link>
        </section>
        <section>
          <h3>Service Area</h3>
          <p>{serviceAreaCities.join(", ")} and surrounding Arizona communities.</p>
        </section>
        <section>
          <h3>Contact</h3>
          <p>Phone number and business email are pending. Use the request form until contact details are confirmed.</p>
        </section>
      </div>
      <p className="fine-print">Service availability depends on project scope and licensing requirements. T&A Contracting will confirm whether a requested job is within scope before quoting or scheduling work.</p>
    </footer>
  );
}
