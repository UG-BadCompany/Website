import Link from "next/link";
import { galleryProjects, portalCards, serviceCategories } from "./components/data";

export default function Home() {
  return (
    <>
      <section className="hero section-wrap">
        <div className="hero-copy">
          <p className="eyebrow">Arizona-native contracting & maintenance</p>
          <h1>More Than a Handyman. Arizona Contracting & Maintenance Done Right.</h1>
          <p className="hero-text">
            T&A Contracting helps Arizona homeowners, landlords, property managers, and businesses handle repairs, maintenance, installations, improvements, and punch-list work with professional communication from quote to completion.
          </p>
          <div className="button-row">
            <Link className="button" href="/request-estimate">Request an Estimate</Link>
            <Link className="button button-secondary" href="/services">View Services</Link>
          </div>
        </div>
        <div className="hero-panel" aria-label="T&A Contracting service highlights">
          <span className="sun" />
          <h2>Maintenance. Anything. Everything.</h2>
          <p>Reliable repair, maintenance, and improvement support with a contractor-grade process.</p>
          <ul>
            <li>Request jobs online</li>
            <li>Review and approve quotes</li>
            <li>Track job status</li>
            <li>Pay deposits and invoices</li>
          </ul>
        </div>
      </section>

      <section className="trust-bar" aria-label="Trust highlights">
        {['Arizona Native', 'Locally Owned', 'Residential & Commercial', 'Maintenance / Anything / Everything'].map((item) => <strong key={item}>{item}</strong>)}
      </section>

      <section className="section-wrap">
        <div className="section-heading">
          <p className="eyebrow">Services</p>
          <h2>Repairs, maintenance, installations, and improvements under one organized roof.</h2>
        </div>
        <div className="card-grid">
          {serviceCategories.slice(0, 4).map((service) => (
            <article className="card" key={service.title}>
              <h3>{service.title}</h3>
              <p>{service.summary}</p>
              <Link href="/services">Explore services →</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="split section-wrap rust-panel">
        <div>
          <p className="eyebrow">Why choose us</p>
          <h2>Built for better communication, better systems, and higher standards.</h2>
        </div>
        <div className="check-list">
          <p>Clear scopes before work begins.</p>
          <p>Quote, approval, payment, and job status workflows designed for busy property owners.</p>
          <p>Professional process for homeowners, rentals, businesses, and property managers.</p>
        </div>
      </section>

      <section className="section-wrap">
        <div className="section-heading">
          <p className="eyebrow">Online portal preview</p>
          <h2>Request, approve, pay, and track work online.</h2>
        </div>
        <div className="metrics-grid">
          {portalCards.map((card) => (
            <article className={`metric metric-${card.tone}`} key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>
        <div className="button-row center">
          <Link className="button" href="/portal/client">View Client Portal</Link>
          <Link className="button button-secondary" href="/portal/admin">View Admin Portal</Link>
        </div>
      </section>

      <section className="section-wrap">
        <div className="section-heading">
          <p className="eyebrow">Recent work</p>
          <h2>Gallery-ready layouts for before/after project photos.</h2>
        </div>
        <div className="gallery-grid">
          {galleryProjects.slice(0, 3).map((project) => (
            <article className="gallery-card" key={project.title}>
              <div className="photo-placeholder">Before / After</div>
              <p>{project.category}</p>
              <h3>{project.title}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <h2>Need something fixed, installed, repaired, or improved?</h2>
        <p>Let’s get it handled with a clear request, quote, approval, and completion process.</p>
        <Link className="button" href="/request-estimate">Start a Request</Link>
      </section>
    </>
  );
}
