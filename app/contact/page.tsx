import type { Metadata } from "next";
import Link from "next/link";
import { serviceAreaCities } from "../components/site-data";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact T&A Contracting or request an estimate for Arizona repair, maintenance, installation, and improvement work.",
};

export default function ContactPage() {
  return (
    <section className="section-wrap page-top split">
      <div>
        <p className="eyebrow">Contact</p>
        <h1>Tell us what needs to be fixed, installed, repaired, or improved.</h1>
        <p className="lead">Phone and business email are not published yet, so the request form is the primary lead intake path for now.</p>
        <div className="button-row"><Link className="button" href="/request-estimate">Request Estimate</Link><Link className="button button-dark" href="/services">View Services</Link></div>
      </div>
      <aside className="contact-card">
        <h2>Current service area</h2>
        <p>{serviceAreaCities.join(", ")}, and surrounding Arizona communities.</p>
        <h3>Contact status</h3>
        <p>Phone number and business email are pending owner confirmation.</p>
      </aside>
    </section>
  );
}
