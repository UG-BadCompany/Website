import { PublicLayout } from '../components/Layout';
import { Link } from '../components/Router';
import { defaultSections, serviceCategories } from '../data/foundation';
import { loadJson } from '../lib/storage';
import type { PageSection } from '../types/domain';

function RenderSections() {
  const sections = loadJson<PageSection[]>('contractoros.homepage.sections.published', defaultSections);
  return <>{sections.map((section) => <section key={section.id} className={`section section-${section.type}`}><p className="eyebrow">{section.type}</p><h1>{section.title}</h1><p>{section.body}</p>{section.cta && <Link href={section.cta.toLowerCase().includes('dashboard') ? '/dashboard' : '/request-estimate'} className="button">{section.cta}</Link>}</section>)}</>;
}
export function HomePage() { return <PublicLayout><RenderSections/><section className="grid cards">{serviceCategories.map((s) => <article className="card" key={s}><h3>{s}</h3><p>Editable service category ready for estimates, requests, jobs, and future AI add-ons.</p></article>)}</section></PublicLayout>; }
export function AboutPage() { return <PublicLayout><section className="section"><p className="eyebrow">About</p><h1>A complete v1 Foundation, not disconnected modules.</h1><p>ContractorOS ships System, Auth, Website, CRM, Operations, Estimating, Financial, Payments, CMMS, Communications, Service Catalog, and Media as one installed product.</p></section></PublicLayout>; }
export function ServicesPage() { return <PublicLayout><section className="section"><p className="eyebrow">Services</p><h1>Service catalog foundation</h1><div className="grid cards">{serviceCategories.map((s) => <article className="card" key={s}><h3>{s}</h3><p>Owners can rename, disable, edit, and add service categories after installation.</p></article>)}</div></section></PublicLayout>; }
export function ContactPage() { return <PublicLayout><section className="section narrow"><p className="eyebrow">Contact</p><h1>Contact the office</h1><form className="form"><input placeholder="Name"/><input placeholder="Email"/><textarea placeholder="How can we help?"/><Link href="/thank-you" className="button">Send message</Link></form></section></PublicLayout>; }
export function RequestEstimatePage() { return <PublicLayout><section className="section narrow"><p className="eyebrow">Request estimate</p><h1>Start a work request</h1><form className="form"><input placeholder="Name"/><input placeholder="Email"/><input placeholder="Property address"/><select>{serviceCategories.map((s) => <option key={s}>{s}</option>)}</select><textarea placeholder="Describe the work"/><input type="file" multiple/><Link href="/thank-you" className="button">Submit request</Link></form></section></PublicLayout>; }
export function ThankYouPage() { return <PublicLayout><section className="section narrow"><h1>Thank you</h1><p>Your request has been received. The office can review it, create a quote, and invite you into the client portal by magic link.</p><Link href="/portal" className="button">Open portal</Link></section></PublicLayout>; }
