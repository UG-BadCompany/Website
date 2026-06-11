import { useEffect, useState } from 'react';
import { PublicLayout } from '../components/Layout';
import { Link } from '../components/Router';
import { serviceCategories } from '../data/foundation';
import { fetchPublicSiteSettings, getBasicHomepage, getBranding } from '../lib/branding';

export function HomePage() {
  const [homepage, setHomepage] = useState(() => getBasicHomepage());
  const [branding, setBranding] = useState(() => getBranding());
  useEffect(() => { fetchPublicSiteSettings().then((settings) => { setHomepage((current) => ({ ...current, ...settings.homepage })); setBranding((current) => ({ ...current, ...settings.branding })); }).catch(() => undefined); }, []);
  const services = homepage.services.length > 0 ? homepage.services : serviceCategories.map((name) => ({ id: name, name, description: 'Editable service category ready for estimates, requests, jobs, and future AI add-ons.', icon: 'Service' }));

  useEffect(() => {
    document.title = homepage.seoTitle || `${branding.displayName} | Contractor Services`;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]') ?? document.head.appendChild(document.createElement('meta'));
    description.name = 'description';
    description.content = homepage.seoDescription || 'Request a service estimate from a trusted local contractor.';
  }, [branding.displayName, homepage.seoDescription, homepage.seoTitle]);

  return <PublicLayout>
    <section className="section section-hero"><p className="eyebrow">{branding.tagline || 'ContractorOS-powered'}</p><h1>{homepage.heroHeadline}</h1><p>{homepage.heroSubheadline}</p><div className="actions"><Link href={homepage.primaryCtaLink || '/request-estimate'} className="button">{homepage.primaryCtaLabel || 'Request Estimate'}</Link><Link href={homepage.secondaryCtaLink || '/services'} className="button secondary">{homepage.secondaryCtaLabel || 'View Services'}</Link></div></section>
    <section className="section"><p className="eyebrow">About</p><h1>{branding.displayName}</h1><p>{homepage.aboutText}</p></section>
    <section className="section"><p className="eyebrow">Services</p><h1>How we can help</h1><p>{homepage.servicesIntro}</p><div className="grid cards">{services.map((service) => <article className="card" key={service.id}><p className="eyebrow">{service.icon || 'Service'}</p><h3>{service.name}</h3><p>{service.description}</p></article>)}</div></section>
    <section className="section"><p className="eyebrow">Contact</p><h1>Ready to get started?</h1><div className="grid cards"><article className="card"><h3>Contact block</h3><p>{homepage.contactPhone || 'Phone coming soon'}</p><p>{homepage.contactEmail || 'Email coming soon'}</p><p>{homepage.contactAddress || 'Address coming soon'}</p></article><article className="card"><h3>Service area</h3><p>{homepage.serviceArea || 'Service area coming soon'}</p><p>{homepage.businessHours || 'Business hours coming soon'}</p></article><article className="card"><h3>Trust</h3><p>{homepage.trustText}</p>{homepage.yearsExperience && <p>{homepage.yearsExperience} years of experience</p>}{homepage.emergencyServiceEnabled && <p>Emergency service available</p>}{homepage.financingAvailableEnabled && <p>Financing available</p>}</article></div></section>
  </PublicLayout>;
}

export function AboutPage() { return <PublicLayout><section className="section"><p className="eyebrow">About</p><h1>A complete v1 Foundation, not disconnected modules.</h1><p>ContractorOS ships System, Auth, Website, CRM, Operations, Estimating, Financial, Payments, CMMS, Communications, Service Catalog, and Media as one installed product.</p></section></PublicLayout>; }
export function ServicesPage() { return <PublicLayout><section className="section"><p className="eyebrow">Services</p><h1>Service catalog foundation</h1><div className="grid cards">{serviceCategories.map((s) => <article className="card" key={s}><h3>{s}</h3><p>Owners can rename, disable, edit, and add service categories after installation.</p></article>)}</div></section></PublicLayout>; }
export function ContactPage() { return <PublicLayout><section className="section narrow"><p className="eyebrow">Contact</p><h1>Contact the office</h1><form className="form"><input placeholder="Name"/><input placeholder="Email"/><textarea placeholder="How can we help?"/><Link href="/thank-you" className="button">Send message</Link></form></section></PublicLayout>; }
export function RequestEstimatePage() { return <PublicLayout><section className="section narrow"><p className="eyebrow">Request estimate</p><h1>Start a work request</h1><form className="form"><input placeholder="Name"/><input placeholder="Email"/><input placeholder="Property address"/><select>{serviceCategories.map((s) => <option key={s}>{s}</option>)}</select><textarea placeholder="Describe the work"/><input type="file" multiple/><Link href="/thank-you" className="button">Submit request</Link></form></section></PublicLayout>; }
export function ThankYouPage() { return <PublicLayout><section className="section narrow"><h1>Thank you</h1><p>Your request has been received. The office can review it, create a quote, and invite you into the client portal by magic link.</p><Link href="/portal" className="button">Open portal</Link></section></PublicLayout>; }
