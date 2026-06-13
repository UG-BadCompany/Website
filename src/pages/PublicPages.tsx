import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { PublicLayout } from '../components/Layout';
import { Link, useRouter } from '../components/Router';
import { serviceCategories } from '../data/foundation';
import { pageTitle, useBranding, useHomepageSettings } from '../lib/branding';
import { ActionCard, BrandLogo, Button, LoadingState, PageHeader, SectionHeader, StatusBadge } from '../components/ui';
import { HomepageRenderer } from '../components/HomepageRenderer';
import { createPremiumHomepageDraft, type HomepageDraft } from '../lib/homepage-builder';

type EstimateDraft = {
  firstName: string; lastName: string; email: string; phone: string; preferredContact: string; existingCustomer: string;
  serviceAddress: string; city: string; state: string; zip: string; propertyType: string; accessNotes: string;
  serviceCategory: string; requestType: string; urgency: string;
  title: string; description: string; problemStartedDate: string; workedOnBefore: string; budgetRange: string; preferredDate: string; measurements: string; brandMakeModel: string; tradeNotes: string;
  files: UploadedFile[]; confirmed: boolean;
};
type UploadedFile = { id: string; fileName: string; mimeType: string; size: number; dataUrl: string; progress: number };

const initialEstimate: EstimateDraft = {
  firstName: '', lastName: '', email: '', phone: '', preferredContact: 'Phone', existingCustomer: 'no',
  serviceAddress: '', city: '', state: '', zip: '', propertyType: 'Residential', accessNotes: '',
  serviceCategory: 'HVAC', requestType: 'Troubleshooting', urgency: 'Flexible',
  title: '', description: '', problemStartedDate: '', workedOnBefore: 'no', budgetRange: '', preferredDate: '', measurements: '', brandMakeModel: '', tradeNotes: '', files: [], confirmed: false,
};
const ESTIMATE_DRAFT_KEY = 'contractoros.requestEstimate.draft';
const requestTypes = ['Troubleshooting','Repair','Replacement','New Install','Maintenance','Quote Only'];
const urgencyOptions = ['Emergency','This week','Flexible','Planning ahead'];
const propertyTypes = ['Residential','Commercial','Multi-family','Industrial','Other'];
const contactMethods = ['Phone','Email','Text'];
const wizardSteps = ['Contact Info','Property Info','Service Needed','Details','Photos / Files','Review & Submit'];


function usePublicServiceNames() {
  const [names, setNames] = useState(serviceCategories);
  useEffect(() => {
    fetch('/api/public/service-catalog', { headers: { accept: 'application/json' }, cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload) => { const next = payload?.services?.map((service: { name: string }) => service.name).filter(Boolean); if (next?.length) setNames(next); })
      .catch(() => undefined);
  }, []);
  return names;
}

function usePageTitle(title: string) {
  const branding = useBranding();
  useEffect(() => { document.title = pageTitle(title, branding); }, [title, branding.companyDisplayName, branding.displayName, branding.companyName]);
}

export function HomePage() {
  const { homepage, isLoading } = useHomepageSettings();
  const [publishedHomepage, setPublishedHomepage] = useState<HomepageDraft | null>(null);
  const [publicHomepageChecked, setPublicHomepageChecked] = useState(false);
  const branding = useBranding();
  const defaultDraft = useMemo(() => createPremiumHomepageDraft(branding, homepage), [branding.companyDisplayName, branding.displayName, branding.companyName, homepage.contactPhone, homepage.serviceArea, homepage.yearsExperience, homepage.financingAvailableEnabled, homepage.emergencyServiceEnabled, homepage.presetId]);

  useEffect(() => {
    fetch('/api/public/homepage', { headers: { accept: 'application/json' }, cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (payload?.published?.sections?.length) setPublishedHomepage(payload.published); })
      .catch(() => undefined)
      .finally(() => setPublicHomepageChecked(true));
  }, []);

  useEffect(() => {
    document.title = pageTitle(undefined, branding);
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]') ?? document.head.appendChild(document.createElement('meta'));
    description.name = 'description';
    description.content = homepage.seoDescription || 'Request a service estimate from a trusted local contractor.';
  }, [branding.companyDisplayName, branding.displayName, branding.companyName, homepage.seoDescription, homepage.seoTitle]);

  if (publishedHomepage?.sections?.length) return <PublicLayout><HomepageRenderer draft={publishedHomepage}/></PublicLayout>;

  return <PublicLayout>
    {!publicHomepageChecked && !isLoading && <section className="section narrow"><LoadingState title="Preparing premium homepage…" lines={1}/></section>}
    <HomepageRenderer draft={defaultDraft}/>
  </PublicLayout>;
}

export function AboutPage() { usePageTitle('About'); return <PublicLayout><section className="section"><PageHeader eyebrow="About" title="A complete v1 Foundation, not disconnected modules." description="Website, CRM, operations, estimating, financial, payments, CMMS, communications, service catalog, and media in one installed product."/></section></PublicLayout>; }
export function ServicesPage() { usePageTitle('Services'); const names = usePublicServiceNames(); return <PublicLayout><section className="section"><SectionHeader eyebrow="Services" title="Service catalog foundation"/><div className="grid cards">{names.map((s) => <ActionCard key={s} title={s} description="This service comes from the enabled database-backed Service Catalog."/>)}</div></section></PublicLayout>; }
export function ContactPage() { usePageTitle('Contact'); return <PublicLayout><section className="section narrow"><PageHeader eyebrow="Contact" title="Contact the office"/><form className="form"><input placeholder="Name"/><input placeholder="Email"/><textarea placeholder="How can we help?"/><Link href="/request-estimate/thank-you" className="button">Send message</Link></form></section></PublicLayout>; }

export function RequestEstimatePage() {
  usePageTitle('Request Estimate');
  const serviceOptions = usePublicServiceNames();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<EstimateDraft>(() => {
    try { return { ...initialEstimate, ...JSON.parse(sessionStorage.getItem(ESTIMATE_DRAFT_KEY) || '{}') }; } catch { return initialEstimate; }
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { sessionStorage.setItem(ESTIMATE_DRAFT_KEY, JSON.stringify(draft)); }, [draft]);
  const update = (patch: Partial<EstimateDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const fullName = `${draft.firstName} ${draft.lastName}`.trim();

  const validateStep = (target = step) => {
    const next: string[] = [];
    const emailOk = !draft.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email);
    const phoneOk = !draft.phone || /^[+]?[(]?[0-9][0-9()\-\s.]{6,}$/.test(draft.phone);
    if (target >= 0 && !fullName) next.push('First and last name are required.');
    if (target >= 0 && !draft.email && !draft.phone) next.push('Enter an email or phone number.');
    if (target >= 0 && !emailOk) next.push('Enter a valid email address.');
    if (target >= 0 && !phoneOk) next.push('Enter a valid phone number.');
    if (target >= 1 && !draft.serviceAddress.trim()) next.push('Service address is required.');
    if (target >= 2 && !draft.serviceCategory) next.push('Choose a service category.');
    if (target >= 3 && !draft.description.trim()) next.push('Detailed description is required.');
    if (target >= 5 && !draft.confirmed) next.push('Confirm the information is accurate.');
    setErrors(next);
    return next.length === 0;
  };
  const nextStep = () => { if (validateStep(step)) setStep((current) => Math.min(current + 1, wizardSteps.length - 1)); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateStep(5)) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/public/request-estimate', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(draft) });
      const result = response.ok ? await response.json() : { requestNumber: `REQ-${Date.now().toString().slice(-6)}` };
      sessionStorage.removeItem(ESTIMATE_DRAFT_KEY);
      sessionStorage.setItem('contractoros.lastRequestNumber', result.requestNumber || result.id || `REQ-${Date.now().toString().slice(-6)}`);
      router.push('/request-estimate/thank-you');
    } finally { setSubmitting(false); }
  };

  return <PublicLayout><section className="section estimate-shell"><PageHeader eyebrow="Request estimate" title="Tell us what you need" description="A guided, mobile-first intake wizard helps our team quote or schedule the right work quickly."/>
    <div className="wizard-progress">{wizardSteps.map((label, index) => <button key={label} className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => index <= step && setStep(index)}><span>{index + 1}</span>{label}</button>)}</div>
    <form className="card estimate-card" onSubmit={submit}>{errors.length > 0 && <div className="notice warning">{errors.map((error) => <p key={error}>{error}</p>)}</div>}
      {step === 0 && <WizardSection title="Contact Info"><div className="form-grid"><input placeholder="First name" value={draft.firstName} onChange={(e) => update({ firstName: e.target.value })}/><input placeholder="Last name" value={draft.lastName} onChange={(e) => update({ lastName: e.target.value })}/><input type="email" placeholder="Email" value={draft.email} onChange={(e) => update({ email: e.target.value })}/><input placeholder="Phone" value={draft.phone} onChange={(e) => update({ phone: e.target.value })}/><Select label="Preferred contact method" value={draft.preferredContact} options={contactMethods} onChange={(preferredContact) => update({ preferredContact })}/><Select label="Existing customer?" value={draft.existingCustomer} options={['yes','no']} onChange={(existingCustomer) => update({ existingCustomer })}/></div></WizardSection>}
      {step === 1 && <WizardSection title="Property Info"><div className="form-grid"><input className="span-2" placeholder="Service address" value={draft.serviceAddress} onChange={(e) => update({ serviceAddress: e.target.value })}/><input placeholder="City" value={draft.city} onChange={(e) => update({ city: e.target.value })}/><input placeholder="State" value={draft.state} onChange={(e) => update({ state: e.target.value })}/><input placeholder="ZIP" value={draft.zip} onChange={(e) => update({ zip: e.target.value })}/><Select label="Property type" value={draft.propertyType} options={propertyTypes} onChange={(propertyType) => update({ propertyType })}/><textarea className="span-2" placeholder="Access notes (optional)" value={draft.accessNotes} onChange={(e) => update({ accessNotes: e.target.value })}/></div></WizardSection>}
      {step === 2 && <WizardSection title="Service Needed"><div className="choice-grid"><Select label="Service category" value={draft.serviceCategory} options={serviceOptions} onChange={(serviceCategory) => update({ serviceCategory })}/><Select label="Request type" value={draft.requestType} options={requestTypes} onChange={(requestType) => update({ requestType })}/><Select label="Urgency" value={draft.urgency} options={urgencyOptions} onChange={(urgency) => update({ urgency })}/></div></WizardSection>}
      {step === 3 && <WizardSection title="Details"><div className="form-grid"><input className="span-2" placeholder="Short title" value={draft.title} onChange={(e) => update({ title: e.target.value })}/><textarea className="span-2" placeholder="Detailed description" value={draft.description} onChange={(e) => update({ description: e.target.value })}/><input type="date" value={draft.problemStartedDate} onChange={(e) => update({ problemStartedDate: e.target.value })}/><Select label="Worked on before?" value={draft.workedOnBefore} options={['yes','no']} onChange={(workedOnBefore) => update({ workedOnBefore })}/><input className="span-2" placeholder="Budget range (optional)" value={draft.budgetRange} onChange={(e) => update({ budgetRange: e.target.value })}/><label><span className="field-label">Preferred date</span><input type="date" value={draft.preferredDate} onChange={(e) => update({ preferredDate: e.target.value })}/></label><input placeholder="Measurements (optional)" value={draft.measurements} onChange={(e) => update({ measurements: e.target.value })}/><input className="span-2" placeholder="Brand / make / model if applicable" value={draft.brandMakeModel} onChange={(e) => update({ brandMakeModel: e.target.value })}/><textarea className="span-2" placeholder="Electrical / plumbing / HVAC notes if applicable" value={draft.tradeNotes} onChange={(e) => update({ tradeNotes: e.target.value })}/></div></WizardSection>}
      {step === 4 && <WizardSection title="Photos / Files"><FileUploader files={draft.files} onChange={(files) => update({ files })}/><p className="muted">You can skip this step if files are not available right now.</p></WizardSection>}
      {step === 5 && <WizardSection title="Review & Submit"><Review draft={draft}/><label className="check"><input type="checkbox" checked={draft.confirmed} onChange={(e) => update({ confirmed: e.target.checked })}/> I confirm this information is accurate.</label></WizardSection>}
      <div className="wizard-actions"><Button type="button" variant="secondary" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>Back</Button>{step < wizardSteps.length - 1 ? <Button type="button" onClick={nextStep}>Continue</Button> : <Button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit request'}</Button>}</div>
    </form>
  </section></PublicLayout>;
}

function WizardSection({ title, children }: { title: string; children: ReactNode }) { return <section className="wizard-section"><h2>{title}</h2>{children}</section>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label><span className="field-label">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function FileUploader({ files, onChange }: { files: UploadedFile[]; onChange: (files: UploadedFile[]) => void }) {
  const addFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const loaded = await Promise.all(Array.from(fileList).map((file) => new Promise<UploadedFile>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ id: crypto.randomUUID(), fileName: file.name, mimeType: file.type, size: file.size, dataUrl: String(reader.result), progress: 100 });
      reader.readAsDataURL(file);
    })));
    onChange([...files, ...loaded]);
  };
  return <div className="upload-drop"><input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx" onChange={(e) => addFiles(e.target.files)}/>{files.map((file) => <div className="upload-row" key={file.id}><span>{file.fileName}</span><progress value={file.progress} max="100"/><button type="button" onClick={() => onChange(files.filter((item) => item.id !== file.id))}>Remove</button></div>)}</div>;
}
function Review({ draft }: { draft: EstimateDraft }) { const rows = [['Name', `${draft.firstName} ${draft.lastName}`], ['Contact', `${draft.email || 'No email'} · ${draft.phone || 'No phone'} · ${draft.preferredContact}`], ['Address', `${draft.serviceAddress}, ${draft.city} ${draft.state} ${draft.zip}`], ['Property', draft.propertyType], ['Service', `${draft.serviceCategory} · ${draft.requestType} · ${draft.urgency}`], ['Description', draft.description], ['Measurements / model', `${draft.measurements || '—'} ${draft.brandMakeModel || ''}`], ['Trade notes', draft.tradeNotes || '—'], ['Files', `${draft.files.length} attached`]]; return <div className="review-grid">{rows.map(([label, value]) => <div key={label}><strong>{label}</strong><p>{value}</p></div>)}</div>; }

export function ThankYouPage() {
  usePageTitle('Request Received');
  const branding = useBranding();
  const requestNumber = sessionStorage.getItem('contractoros.lastRequestNumber') || 'REQ-PENDING';
  return <PublicLayout><section className="section narrow thank-you"><BrandLogo /><PageHeader title="Thank you — request received" description={`Your request number is ${requestNumber}. Our team will review the details, confirm any missing information, and follow up with next steps.`}/><div className="grid cards"><ActionCard title="What happens next" description="The office reviews your request, attaches uploaded media, and can convert it into a quote or scheduled job."/><ActionCard title="Request number" description={requestNumber}/></div><div className="actions"><Link href="/" className="button secondary">Return home</Link><Link href="/login" className="button">Login / check portal</Link></div></section></PublicLayout>;
}
