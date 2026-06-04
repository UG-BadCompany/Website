import Link from "next/link";
import { estimateWorkTypes, galleryProjects, serviceAreaCities, serviceCategories } from "./components/site-data";

const portalItems = ["Requests", "Quotes", "Approvals", "Invoices", "Job updates"];

const processSteps = [
  ["Tell us what you need", "Share the property, work type, photos if available, and a short description."],
  ["We review the scope", "T&A Contracting confirms the right next step, service fit, and any needed follow-up details."],
  ["Receive an estimate", "Review the quote, approve the work, and track updates through the client portal."],
];

export default function Home() {
  return (
    <>
      <section className="hero section-wrap customer-hero">
        <div className="hero-copy">
          <p className="eyebrow">T&A Contracting • Arizona property services</p>
          <h1>Contracting help without the runaround.</h1>
          <p className="hero-text">T&A Contracting helps homeowners, landlords, property managers, and small businesses handle repairs, maintenance, installations, punch lists, and property improvements.</p>
          <p className="service-area">Serving {serviceAreaCities.join(", ")} and nearby Arizona communities.</p>
          <div className="button-row">
            <Link className="button" href="/request-estimate">Request Estimate</Link>
            <Link className="button button-dark" href="/services">View Services</Link>
          </div>
        </div>
        <aside className="hero-card customer-help-card" aria-label="How T&A Contracting helps customers">
          <span className="eyebrow">Simple next steps</span>
          <h2>One request starts the conversation.</h2>
          <div className="check-list">
            <p>Repair, troubleshooting, maintenance, and installation requests.</p>
            <p>Property punch lists, rental turns, tenant improvements, and commercial maintenance.</p>
            <p>Clear quotes, approvals, invoices, and job updates through the client portal.</p>
          </div>
        </aside>
      </section>

      <section className="trust-bar customer-trust" aria-label="Customer service highlights">
        <strong>Home repairs</strong><strong>Property maintenance</strong><strong>Installations</strong><strong>Commercial support</strong>
      </section>

      <section className="section-wrap" id="services">
        <div className="section-heading centered">
          <p className="eyebrow">Services</p>
          <h2>Repair, maintenance, installation, and property work made easier to request.</h2>
          <p className="lead">Choose the closest category when you request an estimate. If you are not sure, select Other / Not Sure and describe the issue.</p>
        </div>
        <div className="card-grid three service-card-grid">
          {serviceCategories.map((service) => <article className="card service-card" key={service.title}><h3>{service.title}</h3><p>{service.summary}</p></article>)}
        </div>
      </section>

      <section className="section-wrap">
        <div className="section-heading">
          <p className="eyebrow">Recent job photos</p>
          <h2>Project photo gallery prepared for real job updates.</h2>
          <p className="lead">Recent work cards keep completed repairs, maintenance visits, and improvements easy for customers to understand.</p>
        </div>
        <div className="gallery-grid homepage-gallery">
          {galleryProjects.map((project) => (
            <article className="gallery-card" key={project.title}>
              <div className="photo-placeholder">Job Photo</div>
              <p>{project.category}</p>
              <h3>{project.title}</h3>
              <span>{project.detail}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="section-wrap split-panel portal-panel">
        <div>
          <p className="eyebrow">Client portal</p>
          <h2>Track requests, quotes, approvals, invoices, and job updates in one place.</h2>
          <p>After your request is submitted, the client portal gives you a simple place to follow the work without digging through texts or emails.</p>
        </div>
        <div className="pipeline portal-pills">
          {portalItems.map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>

      <section className="section-wrap">
        <div className="section-heading centered">
          <p className="eyebrow">How to request an estimate</p>
          <h2>A short form is enough to get started.</h2>
        </div>
        <div className="steps-grid">
          {processSteps.map(([title, text], index) => <article className="card" key={title}><strong className="step-number">{index + 1}</strong><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="section-wrap estimate-preview" id="estimate">
        <div className="section-heading centered">
          <p className="eyebrow">Type of work</p>
          <h2>Common request categories.</h2>
        </div>
        <div className="service-chip-grid">
          {estimateWorkTypes.map((type) => <span key={type}>{type}</span>)}
        </div>
      </section>

      <section className="final-cta customer-cta">
        <h2>Need repair, maintenance, installation, or property work?</h2>
        <p>Send a few details and T&A Contracting will review your estimate request.</p>
        <div className="button-row centered-buttons"><Link className="button" href="/request-estimate">Request Estimate</Link><Link className="button button-dark" href="/services">Explore Services</Link></div>
      </section>
    </>
  );
}
