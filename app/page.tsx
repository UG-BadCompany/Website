import Link from "next/link";
import { galleryProjects, portalSteps, serviceAreaCities, serviceCategories } from "./components/site-data";

const trustItems = ["Arizona Native", "Locally Owned", "Residential & Commercial", "Maintenance / Anything / Everything"];

export default function Home() {
  return (
    <>
      <section className="hero section-wrap">
        <div className="hero-copy">
          <p className="eyebrow">Arizona-native contracting & maintenance</p>
          <h1>More Than a Handyman. Arizona Contracting & Maintenance Done Right.</h1>
          <p className="hero-text">T&A Contracting helps Arizona homeowners, landlords, property managers, and businesses handle repairs, maintenance, installations, improvements, and punch-list work with professional communication from quote to completion.</p>
          <p className="service-area">Serving {serviceAreaCities.join(", ")} and surrounding communities.</p>
          <div className="button-row">
            <Link className="button" href="/request-estimate">Request an Estimate</Link>
            <Link className="button button-dark" href="/services">View Services</Link>
          </div>
        </div>
        <aside className="hero-card">
          <div className="sun-mark" />
          <h2>Maintenance. Anything. Everything.</h2>
          <p>Clear requests, organized quotes, and a simple path from approval to completion.</p>
        </aside>
      </section>

      <section className="trust-bar" aria-label="Trust highlights">
        {trustItems.map((item) => <strong key={item}>{item}</strong>)}
      </section>

      <section className="section-wrap">
        <div className="section-heading">
          <p className="eyebrow">Services</p>
          <h2>Reliable repairs, maintenance, installations, and improvements under one organized roof.</h2>
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

      <section className="section-wrap split-panel">
        <div>
          <p className="eyebrow">Why choose T&A</p>
          <h2>Better communication, better systems, and higher standards than a basic handyman.</h2>
        </div>
        <div className="check-list">
          <p>Professional scopes before work begins.</p>
          <p>Built for homeowners, rentals, small businesses, and property managers.</p>
          <p>Designed to grow into a full request, quote, approval, payment, and status portal.</p>
        </div>
      </section>

      <section className="section-wrap">
        <div className="section-heading centered">
          <p className="eyebrow">Portal preview</p>
          <h2>Clients will be able to request, approve, pay, and track jobs online.</h2>
        </div>
        <div className="steps-grid">
          {portalSteps.map((step, index) => <div className="step-card" key={step}><span>{index + 1}</span><strong>{step}</strong></div>)}
        </div>
      </section>

      <section className="section-wrap">
        <div className="section-heading">
          <p className="eyebrow">Recent work</p>
          <h2>Before/after gallery structure ready for real project photos.</h2>
        </div>
        <div className="gallery-grid">
          {galleryProjects.map((project) => (
            <article className="gallery-card" key={project.title}>
              <div className="photo-placeholder">Project Photo</div>
              <p>{project.category}</p>
              <h3>{project.title}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <h2>Need something fixed, installed, repaired, or improved?</h2>
        <p>Let’s get it handled with a professional process from request to completion.</p>
        <Link className="button" href="/request-estimate">Start a Request</Link>
      </section>
    </>
  );
}
