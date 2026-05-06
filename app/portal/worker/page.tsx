import type { Metadata } from "next";
import { getSession } from "../../lib/auth";
import { readDatabase } from "../../lib/database";
import { jobStatuses } from "../../components/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Worker Portal", description: "Worker dashboard for assigned T&A Contracting jobs." };

const tasks = ["Review scope and access notes", "Upload before photos", "Complete checklist", "Add material and time notes", "Upload completion photos", "Flag issues for admin review"];

export default async function WorkerPortalPage() {
  const database = await readDatabase();
  const session = await getSession();
  const assignedSchedule = database.schedule.filter((item) => !session || item.workerId === session.id || !item.workerId);
  const assignedJobs = assignedSchedule.map((item) => database.jobRequests.find((job) => job.id === item.jobRequestId)).filter(Boolean);

  return (
    <section className="section-wrap page-top">
      <p className="eyebrow">Worker dashboard</p>
      <h1>Mobile-first job details for field work.</h1>
      <div className="dashboard-layout">
        <article className="panel"><h2>Assigned job checklist</h2>{tasks.map((task) => <label className="task" key={task}><input type="checkbox" />{task}</label>)}</article>
        <article className="panel"><h2>Status update</h2><form action="/api/worker/jobs" method="post"><label>Job request<select name="jobRequestId">{assignedJobs.map((job) => job && <option key={job.id} value={job.id}>{job.serviceCategory} — {job.propertyAddress}</option>)}</select></label><label>Status<select name="status">{jobStatuses.map((status) => <option key={status}>{status}</option>)}</select></label><button className="button" type="submit">Update Status</button></form></article>
      </div>
      <div className="portal-section"><h2>Assigned jobs</h2>{assignedJobs.map((job) => job && <article className="wide-card" key={job.id}><div><h3>{job.serviceCategory}</h3><p>{job.propertyAddress}</p></div><div><strong>{job.status}</strong><p>{job.description}</p></div></article>)}</div>
    </section>
  );
}
