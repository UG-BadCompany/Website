"use client";

import { useMemo, useState } from "react";
import { serviceCategories } from "../components/site-data";

type OptionalQuestion = { label?: string; prompt?: string; optional?: boolean };

type SubmitResult = {
  request?: { id?: string };
  intakeAnalysis?: {
    informationCompletenessScore?: number;
    confidenceScores?: { overall?: number; labor?: number; material?: number; scope?: number };
    missingInformation?: string[];
    optionalQuestions?: OptionalQuestion[];
    optionalCollectionMessage?: string;
  };
  optionalInformation?: { message?: string; buttons?: string[]; questions?: OptionalQuestion[] };
  message?: string;
};

const progressSteps = [
  "Submitting Request...",
  "Analyzing Project...",
  "Reviewing Information...",
  "Generating Estimate Intake...",
  "Checking Estimate Confidence...",
];

const optionalPreferenceFields = [
  ["preferredBrand", "Preferred Brand", "Example: Mitsubishi, Rheem, Moen"],
  ["preferredManufacturer", "Preferred Manufacturer", "Any manufacturer you prefer"],
  ["preferredModel", "Preferred Model", "Model number if you already know it"],
  ["preferredProduct", "Preferred Product", "Specific product or fixture"],
  ["preferredFeatures", "Preferred Features", "Energy efficient, quiet, cheapest, premium, smart controls..."],
  ["budgetRange", "Budget Range", "Example: cheapest option, under $1,500, premium option"],
  ["upgradePreferences", "Upgrade Preferences", "Anything you want improved or upgraded"],
  ["additionalNotes", "Additional Notes", "Anything else you want the estimator to know"],
];

export default function SmartEstimateForm() {
  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [additionalAnswers, setAdditionalAnswers] = useState<Record<string, string>>({});
  const questions = useMemo(() => result?.optionalInformation?.questions || result?.intakeAnalysis?.optionalQuestions || [], [result]);

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const timer = window.setInterval(() => setStepIndex((value) => Math.min(value + 1, progressSteps.length - 1)), 550);
    setSubmitting(true);
    setStepIndex(0);
    setResult(null);

    const payload = Object.fromEntries(formData.entries());
    payload.photosProvided = String(payload.photosProvided || "") === "on";

    try {
      const response = await fetch("/api/job-requests", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) throw new Error(data.message || "Request could not be submitted.");
      setResult(data);
      form.reset();
    } catch (error) {
      setResult({ message: error instanceof Error ? error.message : "Request saved fallback unavailable. Please call or email us." });
    } finally {
      window.clearInterval(timer);
      setStepIndex(progressSteps.length - 1);
      setSubmitting(false);
    }
  }

  const score = result?.intakeAnalysis?.informationCompletenessScore;

  return (
    <div className="smart-intake-shell">
      <form className="form-card smart-intake-form" onSubmit={submitRequest}>
        <div className="intake-note">
          <strong>You can submit even if you do not know technical details.</strong>
          <span>Make, model, serial number, tonnage, voltage, breaker size, pipe size, refrigerant, age, manufacturer, and material specs are optional.</span>
        </div>
        <label>Name<input name="name" placeholder="Your name" /></label>
        <label>Email, if available<input name="email" type="email" placeholder="you@example.com" /></label>
        <label>Phone, if available<input name="phone" type="tel" placeholder="(000) 000-0000" /></label>
        <label>Property address<input name="streetAddress" placeholder="Street address" /></label>
        <label>City<input name="city" placeholder="City" /></label>
        <label>Service category<select name="service">{serviceCategories.map((service) => <option key={service.title}>{service.title}</option>)}</select></label>
        <label>Work scope<select name="workScope"><option>Not sure</option><option>Repair / troubleshoot</option><option>Replace existing</option><option>New installation</option><option>Maintenance</option><option>Work order request</option></select></label>
        <label>Desired timeframe<select name="timeframe"><option>Flexible</option><option>This week</option><option>Next 2 weeks</option><option>Urgent review requested</option></select></label>
        <label>Description<textarea name="description" rows={6} placeholder="Describe the work needed in your own words. Technical details are optional." /></label>
        <label className="checkbox-line"><input name="photosProvided" type="checkbox" /> I uploaded or can provide photos</label>
        <details>
          <summary>Optional preferences</summary>
          <div className="client-request-form-grid">
            {optionalPreferenceFields.map(([name, label, placeholder]) => (
              <label key={name}>{label}<input name={name} placeholder={placeholder} /></label>
            ))}
          </div>
        </details>
        <button className="button" type="submit" disabled={submitting}>{submitting ? progressSteps[stepIndex] : "Submit Request"}</button>
        {submitting && <p className="session-status">{progressSteps[stepIndex]}</p>}
      </form>

      {result && (
        <aside className="form-card smart-intake-result" aria-live="polite">
          <span className="eyebrow">Request saved</span>
          <h2>Your request was submitted.</h2>
          <p>{result.message || "The request is visible to admin now. Optional information below can improve estimate accuracy, but you may skip anything."}</p>
          {typeof score === "number" && <strong>{score}% information complete</strong>}
          <p>Additional information may improve estimate accuracy. Answer any questions you know. Skip anything you are unsure about.</p>
          <div className="client-request-form-actions">
            <button className="btn btn-primary" type="button">Continue</button>
            <button className="btn btn-soft" type="button" onClick={() => setResult(null)}>Skip For Now</button>
            <button className="btn btn-soft" type="button">Submit Additional Information</button>
          </div>
          {questions.length > 0 && (
            <div className="smart-optional-questions">
              {questions.map((question, index) => {
                const label = question.label || question.prompt || `Question ${index + 1}`;
                return (
                  <label key={`${label}-${index}`}>{label}<input value={additionalAnswers[label] || ""} onChange={(event) => setAdditionalAnswers((answers) => ({ ...answers, [label]: event.target.value }))} placeholder="Optional — skip if unsure" /></label>
                );
              })}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
