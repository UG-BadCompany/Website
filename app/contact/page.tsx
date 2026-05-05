import type { Metadata } from "next";
import Link from "next/link";
import { companyProfile, serviceAreaCities } from "../lib/config";

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
        <div className="button-row"><Link className="button" href="/request-estimate">Request Estimate</Link><Link className="button button-secondary" href="/login">Open Portal</Link></div>
      </div>
      <aside className="contact-card">
        <h2>Current service area</h2>
        <p>{serviceAreaCities.join(", ")}, and surrounding Arizona communities.</p>
        <h3>Contact status</h3>
        <p>{companyProfile.publicContactNote}</p>
        <p className="lead">Use the estimate request page to send project details, property notes, preferred timeframe, and contact preferences.</p>
        <div className="button-row"><Link className="button" href="/request-estimate">Request Estimate</Link><a className="button button-secondary" href="tel:+10000000000">Call Now</a></div>
      </div>
      <aside className="contact-card">
        <h2>Business contact placeholders</h2>
        <p>Phone number: pending owner confirmation</p>
        <p>Email: pending owner confirmation</p>
        <p>Service areas: Arizona cities pending confirmation</p>
      </aside>
    </section>
  );
}
