import { useEffect } from 'react';
import { PublicLayout } from '../components/Layout';
import { Link } from '../components/Router';
import { serviceCategories } from '../data/foundation';
import { useBranding, useHomepageSettings } from '../lib/branding';
import { ActionCard, LoadingState, PageHeader, SectionHeader, StatusBadge } from '../components/ui';

export function HomePage() {
  const { homepage, isLoading } = useHomepageSettings();
  const branding = useBranding();
  const services = homepage.services.length > 0 ? homepage.services : serviceCategories.map((name) => ({ id: name, name, description: 'Editable service category ready for estimates, requests, jobs, and future AI add-ons.', icon: 'Service' }));

  useEffect(() => {
    document.title = homepage.seoTitle || `${branding.displayName} | Contractor Services`;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]') ?? document.head.appendChild(document.createElement('meta'));
    description.name = 'description';
    description.content = homepage.seoDescription || 'Request a service estimate from a trusted local contractor.';
  }, [branding.displayName, homepage.seoDescription, homepage.seoTitle]);

  return <PublicLayout>
    <section className="section section-hero"><div className="hero-copy"><p className="eyebrow">{branding.tagline || 'ContractorOS-powered'}</p>{isLoading ? <LoadingState title="Loading homepage" lines={2}/> : <><h1>{homepage.heroHeadline}</h1><p>{homepage.heroSubheadline}</p><div className="actions"><Link href={homepage.primaryCtaLink || '/request-estimate'} className="button">{homepage.primaryCtaLabel || 'Request Estimate'}</Link><Link href={homepage.secondaryCtaLink || '/services'} className="button secondary">{homepage.secondaryCtaLabel || 'View Services'}</Link></div></>}</div><div className="hero-panel"><StatusBadge status="Ready for dispatch"/><h3>Premium contractor operations</h3><p>Requests, quotes, jobs, invoices, payments, CMMS, and messaging in one branded workspace.</p></div></section>
    <section className="section"><SectionHeader eyebrow="About" title={branding.displayName} description={homepage.aboutText}/></section>
    <section className="section"><SectionHeader eyebrow="Services" title="How we can help" description={homepage.servicesIntro}/><div className="grid cards">{services.map((service) => <ActionCard key={service.id} title={service.name} description={service.description}><span className="pill">{service.icon || 'Service'}</span></ActionCard>)}</div></section>
    <section className="section"><SectionHeader eyebrow="Contact" title="Ready to get started?"/><div className="grid cards"><ActionCard title="Contact block" description={homepage.contactPhone || 'Phone coming soon'}><p>{homepage.contactEmail || 'Email coming soon'}</p><p>{homepage.contactAddress || 'Address coming soon'}</p></ActionCard><ActionCard title="Service area" description={homepage.serviceArea || 'Service area coming soon'}><p>{homepage.businessHours || 'Business hours coming soon'}</p></ActionCard><ActionCard title="Trust" description={homepage.trustText}>{homepage.yearsExperience && <p>{homepage.yearsExperience} years of experience</p>}{homepage.emergencyServiceEnabled && <p>Emergency service available</p>}{homepage.financingAvailableEnabled && <p>Financing available</p>}</ActionCard></div></section>
  </PublicLayout>;
}

export function AboutPage() { return <PublicLayout><section className="section"><PageHeader eyebrow="About" title="A complete v1 Foundation, not disconnected modules." description="ContractorOS ships System, Auth, Website, CRM, Operations, Estimating, Financial, Payments, CMMS, Communications, Service Catalog, and Media as one installed product."/></section></PublicLayout>; }
export function ServicesPage() { return <PublicLayout><section className="section"><SectionHeader eyebrow="Services" title="Service catalog foundation"/><div className="grid cards">{serviceCategories.map((s) => <ActionCard key={s} title={s} description="Owners can rename, disable, edit, and add service categories after installation."/>)}</div></section></PublicLayout>; }
export function ContactPage() { return <PublicLayout><section className="section narrow"><PageHeader eyebrow="Contact" title="Contact the office"/><form className="form"><input placeholder="Name"/><input placeholder="Email"/><textarea placeholder="How can we help?"/><Link href="/thank-you" className="button">Send message</Link></form></section></PublicLayout>; }
export function RequestEstimatePage() { return <PublicLayout><section className="section narrow"><PageHeader eyebrow="Request estimate" title="Start a work request" description="Tell us what you need, attach photos, and the office can convert your request into a quote or scheduled job."/><form className="form"><input placeholder="Name"/><input placeholder="Email"/><input placeholder="Property address"/><select>{serviceCategories.map((s) => <option key={s}>{s}</option>)}</select><textarea placeholder="Describe the work"/><input type="file" multiple/><Link href="/thank-you" className="button">Submit request</Link></form></section></PublicLayout>; }
export function ThankYouPage() { return <PublicLayout><section className="section narrow"><PageHeader title="Thank you" description="Your request has been received. The office can review it, create a quote, and invite you into the client portal by magic link." action={<Link href="/portal" className="button">Open portal</Link>}/></section></PublicLayout>; }
