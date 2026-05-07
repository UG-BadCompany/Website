import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Worker Portal Preview",
  description: "Worker dashboard preview for T&A Contracting assigned jobs.",
};

const tasks = ["Review scope and access notes", "Upload before photos", "Complete checklist", "Add material and time notes", "Upload completion photos", "Flag issues for admin review"];

export default function WorkerPortalPage() {
  return (
    <section className="section-wrap page-top">
      <p className="eyebrow">Worker dashboard preview</p>
      <h1>Mobile-first job details for field work.</h1>
      <article className="panel"><h2>Assigned job checklist</h2>{tasks.map((task) => <label className="task" key={task}><input type="checkbox" />{task}</label>)}</article>
    </section>
  );
}
