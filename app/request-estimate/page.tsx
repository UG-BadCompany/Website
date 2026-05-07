import type { Metadata } from "next";
import { serviceAreaCities, serviceCategories } from "../components/site-data";

export const metadata: Metadata = {
  title: "Request Estimate",
  description: "Submit a repair, maintenance, installation, or improvement estimate request to T&A Contracting.",
};

export default function RequestEstimatePage() {
  return (
    <section className="section-wrap page-top">
      <p className="eyebrow">Estimate request</p>
      <h1>Start a new job request.</h1>
      <p className="lead">This launch-safe form captures the planned job request fields. Backend storage, uploads, emails, and account workflows will be connected in later phases. Current service area: {serviceAreaCities.join(", ")}.</p>
      <form className="form-card">
        <label>Name<input name="name" placeholder="Your name" /></label>
        <label>Email, if available<input name="email" type="email" placeholder="you@example.com" /></label>
        <label>Phone, if available<input name="phone" type="tel" placeholder="(000) 000-0000" /></label>
        <label>Property address<input name="address" placeholder="Street, city, ZIP" /></label>
        <label>Service category<select name="category">{serviceCategories.map((service) => <option key={service.title}>{service.title}</option>)}</select></label>
        <label>Desired timeframe<select name="timeframe"><option>Flexible</option><option>This week</option><option>Next 2 weeks</option><option>Urgent review requested</option></select></label>
        <label>Priority<select name="priority"><option>Standard</option><option>Flexible</option><option>Urgent review requested</option></select></label>
        <label>Preferred contact method<select name="contact"><option>Portal</option><option>Phone</option><option>Email</option></select></label>
        <label>Access notes<textarea name="accessNotes" rows={3} placeholder="Gate codes, parking, tenant notes, pets, or access windows." /></label>
        <label>Special instructions<textarea name="specialInstructions" rows={3} placeholder="Any special requirements or details." /></label>
        <label>Description<textarea name="description" rows={6} placeholder="Describe the work needed and what a successful result looks like." /></label>
        <button className="button" type="button">Submit Request Preview</button>
      </form>
    </section>
  );
}
