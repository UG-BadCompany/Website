import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Request Estimate",
  description: "Submit a repair, maintenance, installation, or improvement estimate request to T&A Contracting.",
};

export default function RequestEstimatePage() {
  return (
    <section className="section-wrap page-top">
      <p className="eyebrow">Estimate request</p>
      <h1>Start a new job request.</h1>
      <p className="lead">This front-end form is ready to connect to account creation, file uploads, admin notifications, and confirmation emails in the backend phase.</p>
      <form className="form-card">
        <label>Name<input name="name" placeholder="Your name" /></label>
        <label>Email<input name="email" type="email" placeholder="you@example.com" /></label>
        <label>Phone<input name="phone" type="tel" placeholder="(000) 000-0000" /></label>
        <label>Property address<input name="address" placeholder="Street, city, ZIP" /></label>
        <label>Service category<select name="category"><option>Home Repairs</option><option>Property Maintenance</option><option>Painting & Finishing</option><option>Fixture Work</option><option>Installations & Improvements</option></select></label>
        <label>Desired timeframe<select name="timeframe"><option>Flexible</option><option>This week</option><option>Next 2 weeks</option><option>Urgent review requested</option></select></label>
        <label>Description<textarea name="description" rows={6} placeholder="Describe the work needed, access notes, special instructions, and anything we should know." /></label>
        <button className="button" type="button">Submit Request Preview</button>
      </form>
    </section>
  );
}
