import type { Metadata } from "next";
import { serviceCategories } from "../components/site-data";

export const metadata: Metadata = {
  title: "Services",
  description: "T&A Contracting service categories for Arizona home repairs, property maintenance, painting, fixture work, installations, and improvements.",
};

export default function ServicesPage() {
  return (
    <section className="section-wrap page-top">
      <p className="eyebrow">Services</p>
      <h1>Contractor-grade repair, maintenance, and improvement services.</h1>
      <p className="lead">Services are organized around common customer needs for homes, rentals, properties, and small businesses.</p>
      <div className="service-list">
        {serviceCategories.map((service) => (
          <article className="wide-card" key={service.title}>
            <div>
              <h2>{service.title}</h2>
              <p>{service.summary}</p>
            </div>
            <ul>
              {service.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
        ))}
      </div>
      <aside className="notice">Service availability depends on project scope and licensing requirements. T&A Contracting will confirm whether a requested job is within scope before quoting or scheduling work.</aside>
    </section>
  );
}
