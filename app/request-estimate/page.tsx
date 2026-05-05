import type { Metadata } from "next";
import { serviceAreaCities } from "../lib/config";

export const metadata: Metadata = {
  title: "Request Estimate",
  description: "Submit a repair, maintenance, installation, or improvement estimate request to T&A Contracting.",
};

export default function RequestEstimatePage() {
  return (
    <section className="section-wrap page-top">
      <p className="eyebrow">Estimate request</p>
      <h1>Start a new job request.</h1>
      <p className="lead">Submissions create a backend job request record, store uploaded files, queue admin/client email notifications, and appear in the portal dashboards. Current service area: {serviceAreaCities.join(", ")}.</p>
      <form className="form-card" action="/api/job-requests" method="post" encType="multipart/form-data">
        <label>Name<input name="name" placeholder="Your name" required /></label>
        <label>Email, if available<input name="email" type="email" placeholder="you@example.com" /></label>
        <label>Phone, if available<input name="phone" type="tel" placeholder="(000) 000-0000" /></label>
        <label>Property address<input name="address" placeholder="Street, city, ZIP" required /></label>
        <label>Service category<select name="category"><option>Home Repairs</option><option>Property Maintenance</option><option>Painting & Finishing</option><option>Fixture Work</option><option>Installations & Improvements</option></select></label>
        <label>Desired timeframe<select name="timeframe"><option>Flexible</option><option>This week</option><option>Next 2 weeks</option><option>Urgent review requested</option></select></label>
        <label>Priority<select name="priority"><option>Standard</option><option>Flexible</option><option>Urgent review requested</option></select></label>
        <label>Preferred contact method<select name="preferredContactMethod"><option>Portal</option><option>Phone</option><option>Email</option></select></label>
        <label>Photos or files<input name="files" type="file" multiple /></label>
        <label>Access notes<textarea name="accessNotes" rows={3} placeholder="Gate codes, lockbox, tenant notes, parking, pets, or access windows." /></label>
        <label>Special instructions<textarea name="specialInstructions" rows={3} placeholder="Any special requirements or details." /></label>
        <label>Description<textarea name="description" rows={6} placeholder="Describe the work needed and what a successful result looks like." required /></label>
        <button className="button" type="submit">Submit Job Request</button>
      </form>
    </section>
  );
}
