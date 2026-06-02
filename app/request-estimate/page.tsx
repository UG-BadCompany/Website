import type { Metadata } from "next";
import { serviceAreaCities } from "../components/site-data";
import SmartEstimateForm from "./SmartEstimateForm";

export const metadata: Metadata = {
  title: "Request Estimate",
  description: "Submit a repair, maintenance, installation, or improvement estimate request to T&A Contracting.",
};

export default function RequestEstimatePage() {
  return (
    <section className="section-wrap page-top">
      <p className="eyebrow">Estimate request</p>
      <h1>Start a new job request.</h1>
      <p className="lead">Submit the request first. Technical details are optional and the estimate intake assistant will only ask follow-up questions that may improve accuracy. Current service area: {serviceAreaCities.join(", ")}.</p>
      <SmartEstimateForm />
    </section>
  );
}
