import { useEffect, useMemo, useState } from 'react';
import { PublicLayout } from '../components/Layout';
import { foundationComponents, permissions, serviceCategories } from '../data/foundation';
import { getTheme, saveTheme, themePresets, type ThemePalette, type ThemePresetId, type ThemeVariableKey, type ThemeSettings } from '../lib/theme';
import { saveJson } from '../lib/storage';
import { notifyBrandingUpdated } from '../lib/branding';
import { homepageStylePresets, type HomepageStylePresetId } from '../lib/homepage-builder';
import type { DatabaseProvider, HostingProvider, PaymentProvider, ThemeMode } from '../types/domain';

const asArray = <T,>(value: T[] | null | undefined): T[] => Array.isArray(value) ? value : [];

const steps = ['license','hosting','database','environment','email','payment','company','branding-homepage','owner','theme','foundation','expansion-packs','finish'];

type EnvStatus = 'found' | 'missing' | 'optional' | 'invalid' | 'not_checked';
type EnvCheck = { key: string; status: EnvStatus; description: string; matchedKey?: string };
type EnvValidation = { basic: EnvCheck[]; database: EnvCheck[]; payment: EnvCheck[]; email: EnvCheck[]; databaseAdapter: string };
type MappingRow = { id: string; providerKey: string; contractorKey: 'APP_URL' | 'DATABASE_URL' | 'RESEND_API_KEY' | 'EMAIL_FROM'; description: string };
type ServiceDraft = { id: string; name: string; description: string; icon: string };
type UploadDraft = { fileName: string; mimeType: string; dataUrl?: string; mediaId?: string; resolvedUrl?: string };
type BrandingHomepageDraft = {
  logoFile?: File | null;
  logoUrl: string;
  logoMediaId: string;
  logoResolvedUrl: string;
  logoUpload: UploadDraft | null;
  faviconFile?: File | null;
  faviconUrl: string;
  faviconMediaId: string;
  faviconResolvedUrl: string;
  faviconUpload: UploadDraft | null;
  displayName: string;
  tagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  primaryCtaLabel: string;
  primaryCtaLink: string;
  secondaryCtaLabel: string;
  secondaryCtaLink: string;
  aboutText: string;
  servicesIntro: string;
  services: ServiceDraft[];
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  serviceArea: string;
  businessHours: string;
  trustText: string;
  yearsExperience: string;
  emergencyServiceEnabled: boolean;
  financingAvailableEnabled: boolean;
  seoTitle: string;
  seoDescription: string;
  homepagePresetId: HomepageStylePresetId;
};

type ProviderFlow = { label: string; databaseOptions: { value: DatabaseProvider; label: string }[]; defaultDatabase: DatabaseProvider; mapping: MappingRow[]; note: string; advancedMappingDefault?: boolean };

const providerFlows: Record<HostingProvider, ProviderFlow> = {
  netlify: {
    label: 'Netlify',
    defaultDatabase: 'netlify_database',
    databaseOptions: [
      { value: 'netlify_database', label: 'Netlify Database / Neon recommended' },
      { value: 'postgres_url', label: 'External PostgreSQL' },
      { value: 'supabase_postgres', label: 'Supabase PostgreSQL' },
      { value: 'configure_later', label: 'Configure later / manual' },
    ],
    mapping: [
      { id: 'app_url', providerKey: 'SITE_URL', contractorKey: 'APP_URL', description: 'Public website URL used for links and redirects.' },
      { id: 'database_url', providerKey: 'NETLIFY_DATABASE_URL or DATABASE_URL', contractorKey: 'DATABASE_URL', description: 'Netlify Database connection used by server functions only.' },
      { id: 'resend_api_key', providerKey: 'RESEND_API_KEY', contractorKey: 'RESEND_API_KEY', description: 'Server-only key used to send email.' },
      { id: 'email_from', providerKey: 'MAGIC_LINK_FROM_EMAIL', contractorKey: 'EMAIL_FROM', description: 'From address used for login and system emails.' },
    ],
    note: 'Netlify users usually do not need to change these key names.',
  },
  vercel: {
    label: 'Vercel',
    defaultDatabase: 'vercel_postgres',
    databaseOptions: [
      { value: 'vercel_postgres', label: 'Vercel Postgres / Marketplace database if available' },
      { value: 'neon_postgres', label: 'Neon PostgreSQL' },
      { value: 'supabase_postgres', label: 'Supabase PostgreSQL' },
      { value: 'postgres_url', label: 'External PostgreSQL' },
    ],
    mapping: [
      { id: 'app_url', providerKey: 'VERCEL_URL or APP_URL', contractorKey: 'APP_URL', description: 'Stable public website URL for magic links and redirects.' },
      { id: 'database_url', providerKey: 'DATABASE_URL or POSTGRES_URL', contractorKey: 'DATABASE_URL', description: 'Vercel Marketplace or external database connection.' },
      { id: 'resend_api_key', providerKey: 'RESEND_API_KEY', contractorKey: 'RESEND_API_KEY', description: 'Server-only key used to send email.' },
      { id: 'email_from', providerKey: 'MAGIC_LINK_FROM_EMAIL or EMAIL_FROM', contractorKey: 'EMAIL_FROM', description: 'From address used for login and system emails.' },
    ],
    note: 'Vercel deployments often expose VERCEL_URL automatically, but production apps should still set a stable APP_URL for magic links.',
  },
  docker: {
    label: 'Docker',
    defaultDatabase: 'docker_compose_postgres',
    databaseOptions: [
      { value: 'docker_compose_postgres', label: 'Docker Compose PostgreSQL recommended' },
      { value: 'postgres_url', label: 'External PostgreSQL' },
      { value: 'supabase_postgres', label: 'Supabase PostgreSQL' },
    ],
    mapping: genericMapping(),
    note: 'Use docker-compose.yml to run the app and PostgreSQL together for local or self-hosted installs.',
  },
  vps: {
    label: 'VPS / Node Server',
    defaultDatabase: 'local_postgres',
    databaseOptions: [
      { value: 'local_postgres', label: 'Local PostgreSQL' },
      { value: 'postgres_url', label: 'External PostgreSQL' },
      { value: 'supabase_postgres', label: 'Supabase PostgreSQL' },
      { value: 'managed_postgres', label: 'Managed PostgreSQL' },
    ],
    mapping: genericMapping(),
    note: 'Set environment variables in your process manager, systemd service, or hosting panel.',
  },
  custom: {
    label: 'Other / Custom',
    defaultDatabase: 'postgres_url',
    databaseOptions: [
      { value: 'postgres_url', label: 'External PostgreSQL' },
      { value: 'supabase_postgres', label: 'Supabase PostgreSQL' },
      { value: 'manual_config', label: 'Manual configuration' },
    ],
    mapping: genericMapping(),
    note: 'Advanced environment key mapping is visible for custom hosts so you can match your platform naming.',
    advancedMappingDefault: true,
  },
};

const paymentRequirements: Record<PaymentProvider, { required: string[]; optional: string[]; note: string }> = {
  square: { required: ['SQUARE_ACCESS_TOKEN','SQUARE_LOCATION_ID','SQUARE_ENVIRONMENT'], optional: ['SQUARE_API_VERSION','SQUARE_WEBHOOK_SIGNATURE_KEY'], note: 'Square is the default payment provider.' },
  stripe: { required: ['STRIPE_SECRET_KEY','STRIPE_PUBLISHABLE_KEY','STRIPE_WEBHOOK_SECRET'], optional: [], note: 'Stripe payment instructions use Stripe-specific environment keys.' },
  paypal: { required: ['PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_ENVIRONMENT'], optional: [], note: 'PayPal payment instructions use PayPal-specific environment keys.' },
  authorize_net: { required: ['AUTHORIZE_API_LOGIN_ID','AUTHORIZE_TRANSACTION_KEY','AUTHORIZE_ENVIRONMENT'], optional: [], note: 'Authorize.net payment instructions use Authorize.net-specific environment keys.' },
  manual: { required: [], optional: [], note: 'Manual payments do not require payment API keys.' },
  configure_later: { required: [], optional: [], note: 'You can add a payment provider later from settings.' },
};

const colorControls: { key: ThemeVariableKey; label: string }[] = [
  { key: 'primary', label: 'Primary color' }, { key: 'secondary', label: 'Secondary color' }, { key: 'accent', label: 'Accent color' },
  { key: 'background', label: 'Page background' }, { key: 'surface', label: 'Card/surface background' }, { key: 'sidebar', label: 'Sidebar background' },
  { key: 'text', label: 'Main text' }, { key: 'mutedText', label: 'Muted text' }, { key: 'border', label: 'Border color' },
  { key: 'success', label: 'Success color' }, { key: 'warning', label: 'Warning color' }, { key: 'danger', label: 'Danger color' },
];

function genericMapping(): MappingRow[] {
  return [
    { id: 'app_url', providerKey: 'APP_URL', contractorKey: 'APP_URL', description: 'Public website URL used for links and redirects.' },
    { id: 'database_url', providerKey: 'DATABASE_URL', contractorKey: 'DATABASE_URL', description: 'Database connection used by server functions only.' },
    { id: 'resend_api_key', providerKey: 'RESEND_API_KEY', contractorKey: 'RESEND_API_KEY', description: 'Server-only key used to send email.' },
    { id: 'email_from', providerKey: 'EMAIL_FROM', contractorKey: 'EMAIL_FROM', description: 'From address used for login and system emails.' },
  ];
}

function defaultHomepageDraft(companyName = ''): BrandingHomepageDraft {
  return {
    logoFile: null, logoUrl: '', logoMediaId: '', logoResolvedUrl: '', logoUpload: null, faviconFile: null, faviconUrl: '', faviconMediaId: '', faviconResolvedUrl: '', faviconUpload: null,
    displayName: companyName || 'ContractorOS', tagline: 'Reliable service from a local team you can trust.',
    heroHeadline: companyName ? `${companyName} keeps your property running` : 'Contractor services made simple',
    heroSubheadline: 'Request estimates, schedule service, and stay informed from one easy online experience.',
    primaryCtaLabel: 'Request Estimate', primaryCtaLink: '/request-estimate', secondaryCtaLabel: 'View Services', secondaryCtaLink: '/services',
    aboutText: 'Tell customers who you are, what you specialize in, and why your team is the right choice.',
    servicesIntro: 'Start with your most common services. You can expand the catalog later in the dashboard.',
    services: [{ id: crypto.randomUUID(), name: 'General Service', description: 'Describe your core service offering.', icon: 'Wrench' }],
    contactPhone: '', contactEmail: '', contactAddress: '', serviceArea: '', businessHours: '', trustText: 'Licensed and insured', yearsExperience: '',
    emergencyServiceEnabled: false, financingAvailableEnabled: false, seoTitle: companyName ? `${companyName} | Contractor Services` : 'Contractor Services', seoDescription: 'Request a service estimate from a trusted local contractor.', homepagePresetId: 'premium-contractor',
  };
}

export function InstallerPage({ step = 'install' }: { step?: string }) {
  const initial = Math.max(0, steps.indexOf(step));
  const [index, setIndex] = useState(initial === -1 ? 0 : initial);
  const [hosting, setHosting] = useState<HostingProvider>('netlify');
  const [database, setDatabase] = useState<DatabaseProvider>('netlify_database');
  const [payment, setPayment] = useState<PaymentProvider>('square');
  const [theme, setTheme] = useState<ThemeSettings>(() => getTheme());
  const [customMapping, setCustomMapping] = useState(false);
  const [mappingRows, setMappingRows] = useState<MappingRow[]>(providerFlows.netlify.mapping);
  const [envValidation, setEnvValidation] = useState<EnvValidation | null>(null);
  const [emailTestMessage, setEmailTestMessage] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [licenseForm, setLicenseForm] = useState({ licenseApiUrl: '', licenseKey: '', email: '', domain: window.location.host });
  const [licenseStatus, setLicenseStatus] = useState<'idle' | 'verifying' | 'valid' | 'invalid'>('idle');
  const [licenseMessage, setLicenseMessage] = useState('');
  const [licenseSnapshot, setLicenseSnapshot] = useState<any>(null);
  const [homepage, setHomepage] = useState<BrandingHomepageDraft>(() => defaultHomepageDraft());
  const [finishState, setFinishState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [finishMessage, setFinishMessage] = useState('');
  const current = steps[index];
  const providerFlow = providerFlows[hosting];

  useEffect(() => {
    const nextFlow = providerFlows[hosting];
    setDatabase(nextFlow.defaultDatabase);
    setCustomMapping(Boolean(nextFlow.advancedMappingDefault));
    setMappingRows(nextFlow.mapping);
  }, [hosting]);

  useEffect(() => { saveTheme(theme); }, [theme]);

  useEffect(() => {
    setHomepage((currentDraft) => ({
      ...currentDraft,
      displayName: currentDraft.displayName === 'ContractorOS' && companyName ? companyName : currentDraft.displayName,
      heroHeadline: currentDraft.heroHeadline === 'Contractor services made simple' && companyName ? `${companyName} keeps your property running` : currentDraft.heroHeadline,
      seoTitle: currentDraft.seoTitle === 'Contractor Services' && companyName ? `${companyName} | Contractor Services` : currentDraft.seoTitle,
    }));
  }, [companyName]);

  const mappingPayload = useMemo(() => Object.fromEntries(mappingRows.map((row) => [row.contractorKey, row.providerKey.split(' or ')[0]])), [mappingRows]);

  useEffect(() => {
    let active = true;
    fetch('/api/install/env-validation', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ hostingProvider: hosting, databaseProvider: database, paymentProvider: payment, mapping: mappingPayload }),
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active && data) setEnvValidation(data); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [hosting, database, payment, mappingPayload]);

  const updateTheme = (patch: Partial<ThemeSettings>) => setTheme((currentTheme) => ({ ...currentTheme, ...patch }));
  const updateCustomPalette = (patch: Partial<ThemePalette>) => setTheme((currentTheme) => ({ ...currentTheme, mode: 'custom', custom: { ...currentTheme.custom, ...patch } }));
  const chooseMode = (mode: ThemeMode) => updateTheme({ mode });
  const choosePreset = (presetId: ThemePresetId) => setTheme((currentTheme) => ({ ...currentTheme, mode: 'preset', presetId }));
  const emailReady = envValidation?.email.every((check) => check.status === 'found') ?? false;

  const sendTestEmail = async () => {
    setEmailTestMessage('Checking email environment variables…');
    const response = await fetch('/api/install/email-test', { method: 'POST', headers: { accept: 'application/json' } });
    const result = await response.json();
    setEmailTestMessage(result.message ?? (response.ok ? 'Test email check passed.' : 'Email environment variables are missing.'));
  };

  const verifyInstallerLicense = async () => {
    setLicenseStatus('verifying');
    setLicenseMessage(licenseForm.licenseApiUrl.trim() ? 'Verifying license with License Portal…' : 'License API URL is missing.');
    if (!licenseForm.licenseApiUrl.trim()) { setLicenseStatus('invalid'); return; }
    try {
      const response = await fetch('/api/install/license', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ ...licenseForm, siteUrl: window.location.origin, domain: licenseForm.domain || window.location.host, environment: location.hostname.includes('localhost') ? 'local' : 'production', machineFingerprint: navigator.userAgent }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.valid) throw new Error(result.error || result.reason || 'License invalid. Please check your key and email.');
      setLicenseSnapshot(result.license || result);
      setLicenseStatus('valid');
      setLicenseMessage(`License verified: ${result.tier || result.license?.tier || 'active'} tier.`);
    } catch (error) {
      setLicenseStatus('invalid');
      setLicenseMessage(error instanceof Error ? error.message : 'License invalid. Please check your key and email.');
    }
  };

  const finishInstallation = async () => {
    setFinishState('saving');
    setFinishMessage('Locking installer and saving installation flags…');
    try {
      saveHomepagePreview(homepage, companyName);
      const response = await fetch('/api/install/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          companyName,
          ownerName,
          ownerEmail,
          theme,
          homepageSetup: homepage,
          license: licenseSnapshot,
          branding: {
            logoMediaId: homepage.logoMediaId || null,
            logoUrl: homepage.logoMediaId ? '' : homepage.logoUrl || '',
            logoResolvedUrl: homepage.logoResolvedUrl || (homepage.logoMediaId ? `/api/media/${encodeURIComponent(homepage.logoMediaId)}` : homepage.logoUrl || ''),
            faviconMediaId: homepage.faviconMediaId || null,
            faviconUrl: homepage.faviconMediaId ? '' : homepage.faviconUrl || '',
            faviconResolvedUrl: homepage.faviconResolvedUrl || (homepage.faviconMediaId ? `/api/media/${encodeURIComponent(homepage.faviconMediaId)}` : homepage.faviconUrl || ''),
          },
        }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null) as { error?: string; route?: string; details?: { message?: string } } | null;
        const details = errorBody?.details?.message ? `: ${errorBody.details.message}` : '';
        const route = errorBody?.route ? ` (${errorBody.route})` : '';
        throw new Error(`${errorBody?.error || 'Installer completion failed'}${route} with HTTP ${response.status}${details}`);
      }
      const status = await response.json();
      if (!status.installed) throw new Error('Installer completion did not return an installed system.');
      setFinishMessage(`Installation complete. Opening ${homepage.displayName || companyName || 'your workspace'}…`);
      const siteSettings = await fetch('/api/public/site-settings', { headers: { accept: 'application/json' }, cache: 'no-store' }).then((res) => res.ok ? res.json() : null).catch(() => null);
      if (siteSettings?.branding) notifyBrandingUpdated(siteSettings.branding);
      window.location.assign('/dashboard');
    } catch (error) {
      setFinishState('error');
      setFinishMessage(error instanceof Error ? error.message : 'Unable to complete installation.');
    }
  };

  return (
    <PublicLayout>
      <section className="installer">
        <aside className="stepper">
          {steps.map((s, i) => <button key={s} className={i === index ? 'active' : ''} onClick={() => setIndex(i)}>{i + 1}. {s.replace('-', ' ')}</button>)}
        </aside>
        <div className="card install-card">
          <p className="eyebrow">Installer / {current}</p>
          {current === 'license' && <LicenseActivationStep form={licenseForm} setForm={setLicenseForm} status={licenseStatus} message={licenseMessage} snapshot={licenseSnapshot} onVerify={verifyInstallerLicense}/>}
          {current === 'hosting' && <HostingStep hosting={hosting} setHosting={setHosting}/>}
          {current === 'database' && <DatabaseStep providerFlow={providerFlow} database={database} setDatabase={setDatabase} validation={envValidation}/>}
          {current === 'environment' && <EnvironmentStep hosting={hosting} providerFlow={providerFlow} rows={mappingRows} customMapping={customMapping} setCustomMapping={setCustomMapping} setRows={setMappingRows}/>}
          {current === 'email' && <EmailStep validation={envValidation} emailReady={emailReady} sendTestEmail={sendTestEmail} emailTestMessage={emailTestMessage}/>}
          {current === 'payment' && <PaymentStep hosting={hosting} payment={payment} setPayment={setPayment} validation={envValidation}/>}
          {current === 'company' && <><h1>Company setup</h1><div className="grid cards"><input placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)}/><input placeholder="Company email"/><input placeholder="Company phone"/><input placeholder="Address"/><input placeholder="Website URL"/></div></>}
          {current === 'branding-homepage' && <BrandingHomepageStep draft={homepage} setDraft={setHomepage}/>}
          {current === 'owner' && <><h1>Owner admin</h1><input placeholder="Owner name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)}/><input placeholder="Owner email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)}/><p>Installer creates the first user, assigns the Owner role, and sends a Resend magic login link.</p></>}
          {current === 'theme' && <ThemeStep theme={theme} chooseMode={chooseMode} choosePreset={choosePreset} updateCustomPalette={updateCustomPalette}/>}
          {current === 'foundation' && <><h1>Install ContractorOS Foundation</h1><div className="grid cards">{foundationComponents.map((name) => <div className="pill" key={name}>{name}</div>)}</div><p>{permissions.length} permissions and {serviceCategories.length} default editable service categories will be created by migrations/seeds.</p></>}
          {current === 'expansion-packs' && <><h1>Expansion packs</h1><p>Official add-ons are available later. Default v1 recommendation: none selected.</p>{['Inventory','Workforce','Accounting','Reporting','Customer'].map((p) => <label className="check" key={p}><input type="checkbox"/> {p} Expansion</label>)}</>}
          {current === 'finish' && <><h1>Finish installation</h1><p>Installer locks, migrations complete, saves the selected theme and homepage basics, owner magic link is sent, and you can open the dashboard.</p><button className="button" disabled={finishState === 'saving'} onClick={finishInstallation}>{finishState === 'saving' ? 'Finishing…' : 'Complete installation'}</button>{finishMessage && <p className={finishState === 'error' ? 'error-text' : undefined}>{finishMessage}</p>}</>}
          <div className="actions">
            <button className="button secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>Back</button>
            <button className="button" disabled={index === steps.length - 1 || (current === 'license' && licenseStatus !== 'valid')} onClick={() => setIndex(index + 1)}>Continue</button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}


function LicenseActivationStep({ form, setForm, status, message, snapshot, onVerify }: { form: { licenseApiUrl: string; licenseKey: string; email: string; domain: string }; setForm: (value: { licenseApiUrl: string; licenseKey: string; email: string; domain: string }) => void; status: string; message: string; snapshot: any; onVerify: () => void }) {
  return <><h1>License Activation</h1><p>Enter your ContractorOS License Portal API URL, license key, and license email. The installer verifies the license before continuing.</p>{!form.licenseApiUrl.trim() && <p className="error-text">License API URL is missing.</p>}<div className="grid cards"><label><span className="field-label">License API URL</span><input placeholder="https://taselling.netlify.app" value={form.licenseApiUrl} onChange={(e) => setForm({ ...form, licenseApiUrl: e.target.value })}/></label><label><span className="field-label">License Key</span><input placeholder="COS-BASIC-XXXX-XXXX-XXXX" value={form.licenseKey} onChange={(e) => setForm({ ...form, licenseKey: e.target.value })}/></label><label><span className="field-label">License Email</span><input placeholder="customer@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/></label><label><span className="field-label">Domain</span><input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })}/></label></div><button className="button" type="button" disabled={status === 'verifying'} onClick={onVerify}>{status === 'verifying' ? 'Verifying…' : 'Verify License'}</button>{message && <p className={status === 'invalid' ? 'error-text' : 'muted'}>{message}</p>}{snapshot && <div className="permission-list"><span className="pill">Tier: {snapshot.tier}</span>{(snapshot.enabledModules || []).slice(0, 8).map((module: string) => <span className="pill" key={module}>{module}</span>)}</div>}</>;
}

function HostingStep({ hosting, setHosting }: { hosting: HostingProvider; setHosting: (value: HostingProvider) => void }) {
  const flow = providerFlows[hosting];
  return <>
    <h1>Hosting provider</h1>
    <select value={hosting} onChange={(e) => setHosting(e.target.value as HostingProvider)}><option value="netlify">Netlify</option><option value="vercel">Vercel</option><option value="docker">Docker</option><option value="vps">VPS / Node Server</option><option value="custom">Other / Custom</option></select>
    <p>{flow.note}</p>
  </>;
}

function DatabaseStep({ providerFlow, database, setDatabase, validation }: { providerFlow: ProviderFlow; database: DatabaseProvider; setDatabase: (value: DatabaseProvider) => void; validation: EnvValidation | null }) {
  return <>
    <h1>Database setup</h1>
    <p>{providerFlow.label} installs should use the database option that matches where the connection string is managed.</p>
    <select value={database} onChange={(e) => setDatabase(e.target.value as DatabaseProvider)}>{providerFlow.databaseOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
    <p className="notice">{providerFlow.note}</p>
    {database === 'netlify_database' && <p>Installer prefers detecting Netlify Database automatically. If available, no database connection string is requested here.</p>}
    {(database === 'postgres_url' || database === 'supabase_postgres' || database === 'neon_postgres' || database === 'vercel_postgres') && <p>External database selections validate the mapped database key instead of collecting secrets in the installer.</p>}
    {(database === 'docker_compose_postgres' || database === 'local_postgres' || database === 'managed_postgres') && <p>Installer checks that <code>DATABASE_URL</code> exists, the database connection works, and migrations can run.</p>}
    <div className="email-status-list">{asArray(validation?.database).map((check) => <div className="email-status-row" key={check.key}><div><strong>{check.key}</strong><p>{check.description}</p></div><StatusBadge status={check.status}/></div>)}</div>
  </>;
}

function EnvironmentStep({ hosting, providerFlow, rows, customMapping, setCustomMapping, setRows }: { hosting: HostingProvider; providerFlow: ProviderFlow; rows: MappingRow[]; customMapping: boolean; setCustomMapping: (value: boolean) => void; setRows: (rows: MappingRow[]) => void }) {
  return <>
    <h1>Environment key mapping</h1>
    <p>These are key names only. Secret values stay in your hosting provider&apos;s environment variable settings.</p>
    <span className="status-badge">Default mapping locked/read-only</span>
    <p className="notice">{providerFlow.note}</p>
    {hosting === 'netlify' && <p className="notice">Netlify users usually do not need to change these key names.</p>}
    <label className="check"><input type="checkbox" checked={customMapping} onChange={(e) => setCustomMapping(e.target.checked)}/> Advanced: customize provider key names</label>
    {!customMapping ? <p className="notice">Most users should leave this locked. ContractorOS internal keys cannot be changed.</p> : <p className="notice warning">Only provider key names are editable. ContractorOS internal keys remain locked.</p>}
    <div className="mapping-table">
      <div className="mapping-row header"><span>Provider key name</span><span>ContractorOS internal key</span><span>Status</span><span>Description</span></div>
      {rows.map((row) => <div className="mapping-row" key={row.id}>
        {customMapping ? <input aria-label={`${row.contractorKey} provider key`} value={row.providerKey} onChange={(e) => setRows(rows.map((current) => current.id === row.id ? { ...current, providerKey: e.target.value } : current))}/> : <code className="readonly-key">{row.providerKey}</code>}
        <code className="readonly-key">{row.contractorKey}</code>
        <StatusBadge status="found" label={customMapping ? 'Provider key editable' : 'Locked'}/>
        <span>{row.description}</span>
      </div>)}
    </div>
  </>;
}

function EmailStep({ validation, emailReady, sendTestEmail, emailTestMessage }: { validation: EnvValidation | null; emailReady: boolean; sendTestEmail: () => void; emailTestMessage: string }) {
  const emailChecks = validation?.email ?? [
    { key: 'RESEND_API_KEY', status: 'not_checked' as EnvStatus, description: 'Server-only key used to send email.' },
    { key: 'MAGIC_LINK_FROM_EMAIL or EMAIL_FROM', status: 'not_checked' as EnvStatus, description: 'From address used for login and system emails.' },
  ];
  return <>
    <h1>Email provider</h1>
    <p>Resend is the v1 default. ContractorOS detects required environment keys and shows Found/Missing status without editable key-name boxes.</p>
    <div className="email-status-list">{emailChecks.map((check) => <div className="email-status-row" key={check.key}><div><strong>{check.key}</strong><p>{check.description}{check.matchedKey ? ` Found as ${check.matchedKey}.` : ''}</p></div><StatusBadge status={check.status}/></div>)}</div>
    {!emailReady && <p className="notice warning">Add the missing Resend and email-from variables in your hosting provider, then redeploy or refresh installer.</p>}
    <button className="button" disabled={!emailReady} onClick={sendTestEmail}>Send test email</button>
    {emailTestMessage && <p>{emailTestMessage}</p>}
  </>;
}

function PaymentStep({ hosting, payment, setPayment, validation }: { hosting: HostingProvider; payment: PaymentProvider; setPayment: (value: PaymentProvider) => void; validation: EnvValidation | null }) {
  const requirements = paymentRequirements[payment];
  return <>
    <h1>Payment provider</h1>
    <select value={payment} onChange={(e) => setPayment(e.target.value as PaymentProvider)}><option value="square">Square default</option><option value="stripe">Stripe</option><option value="paypal">PayPal</option><option value="authorize_net">Authorize.net</option><option value="manual">Manual cash/check</option><option value="configure_later">Configure later</option></select>
    <p className="notice">{requirements.note} Add these keys in {providerFlows[hosting].label} environment settings, not in the installer.</p>
    {requirements.required.length === 0 ? <p>No payment API keys are required for this option.</p> : <><h3>Required keys</h3><ul>{requirements.required.map((key) => <li key={key}><code>{key}</code></li>)}</ul></>}
    {requirements.optional.length > 0 && <><h3>Optional keys</h3><ul>{requirements.optional.map((key) => <li key={key}><code>{key}</code></li>)}</ul></>}
    <div className="email-status-list">{asArray(validation?.payment).map((check) => <div className="email-status-row" key={check.key}><div><strong>{check.key}</strong><p>{check.description}</p></div><StatusBadge status={check.status}/></div>)}</div>
  </>;
}

function BrandingHomepageStep({ draft, setDraft }: { draft: BrandingHomepageDraft; setDraft: (draft: BrandingHomepageDraft) => void }) {
  const update = (patch: Partial<BrandingHomepageDraft>) => setDraft({ ...draft, ...patch });
  const logoPreview = draft.logoResolvedUrl || draft.logoUrl;
  const faviconPreview = draft.faviconResolvedUrl || draft.faviconUrl;
  const updateService = (id: string, patch: Partial<ServiceDraft>) => update({ services: draft.services.map((service) => service.id === id ? { ...service, ...patch } : service) });
  const removeService = (id: string) => update({ services: draft.services.filter((service) => service.id !== id) });
  const addService = () => update({ services: [...draft.services, { id: crypto.randomUUID(), name: '', description: '', icon: '' }] });
  return <>
    <h1>Branding &amp; Basic Homepage</h1>
    <p className="notice">Set up your basic public homepage now. You can fully customize the homepage later in Dashboard → Website Builder.</p>
    <section className="installer-subsection"><h3>Company branding</h3><div className="grid cards">
      <FileUpload label="Company logo upload" purpose="branding_logo" onUpload={(logoUpload, file) => update({ logoFile: file, logoUpload, logoMediaId: logoUpload.mediaId || '', logoResolvedUrl: logoUpload.resolvedUrl || '' })}/><input placeholder="Company logo URL option" value={draft.logoUrl} onChange={(e) => update({ logoUrl: e.target.value, logoResolvedUrl: draft.logoMediaId ? draft.logoResolvedUrl : e.target.value })}/>
      <FileUpload label="Favicon upload" purpose="branding_favicon" onUpload={(faviconUpload, file) => update({ faviconFile: file, faviconUpload, faviconMediaId: faviconUpload.mediaId || '', faviconResolvedUrl: faviconUpload.resolvedUrl || '' })}/><input placeholder="Favicon URL option" value={draft.faviconUrl} onChange={(e) => update({ faviconUrl: e.target.value, faviconResolvedUrl: draft.faviconMediaId ? draft.faviconResolvedUrl : e.target.value })}/>
      <input placeholder="Company display name" value={draft.displayName} onChange={(e) => update({ displayName: e.target.value })}/><input placeholder="Tagline" value={draft.tagline} onChange={(e) => update({ tagline: e.target.value })}/>
    </div><p className="eyebrow">If both an upload and URL exist, the upload wins.</p><div className="branding-preview-row">{logoPreview && <img className="brand-logo" src={logoPreview} alt="Logo preview"/>}{faviconPreview && <img className="brand-logo" src={faviconPreview} alt="Favicon preview"/>}</div></section>
    <section className="installer-subsection"><h3>B. Choose Homepage Layout</h3><p className="notice">Fresh installs use this layout preset to generate structure, spacing, and section flow only. Colors come from the separate Color Theme step.</p><div className="grid cards">{Object.values(homepageStylePresets).map((preset) => <button type="button" key={preset.id} className={`preset-card ${draft.homepagePresetId === preset.id ? 'active' : ''}`} onClick={() => update({ homepagePresetId: preset.id })}><strong>{preset.name}</strong><p>{preset.description}</p><small className="muted">Layout only · no colors applied</small></button>)}</div></section><section className="installer-subsection"><h3>Homepage content</h3><div className="grid cards">
      <input placeholder="Hero headline" value={draft.heroHeadline} onChange={(e) => update({ heroHeadline: e.target.value })}/><input placeholder="Hero subheadline" value={draft.heroSubheadline} onChange={(e) => update({ heroSubheadline: e.target.value })}/>
      <input placeholder="Primary button label" value={draft.primaryCtaLabel} onChange={(e) => update({ primaryCtaLabel: e.target.value })}/><input placeholder="Primary button link" value={draft.primaryCtaLink} onChange={(e) => update({ primaryCtaLink: e.target.value })}/>
      <input placeholder="Secondary button label" value={draft.secondaryCtaLabel} onChange={(e) => update({ secondaryCtaLabel: e.target.value })}/><input placeholder="Secondary button link" value={draft.secondaryCtaLink} onChange={(e) => update({ secondaryCtaLink: e.target.value })}/>
      <textarea placeholder="Short about text" value={draft.aboutText} onChange={(e) => update({ aboutText: e.target.value })}/><textarea placeholder="Services intro text" value={draft.servicesIntro} onChange={(e) => update({ servicesIntro: e.target.value })}/>
    </div></section>
    <section className="installer-subsection"><h3>Basic service list</h3>{draft.services.map((service) => <div className="service-editor" key={service.id}><input placeholder="Service name" value={service.name} onChange={(e) => updateService(service.id, { name: e.target.value })}/><input placeholder="Short description" value={service.description} onChange={(e) => updateService(service.id, { description: e.target.value })}/><input placeholder="Icon optional" value={service.icon} onChange={(e) => updateService(service.id, { icon: e.target.value })}/><button className="button secondary" onClick={() => removeService(service.id)}>Remove</button></div>)}<button className="button secondary" onClick={addService}>Add service</button></section>
    <section className="installer-subsection"><h3>Contact block</h3><div className="grid cards"><input placeholder="Phone" value={draft.contactPhone} onChange={(e) => update({ contactPhone: e.target.value })}/><input placeholder="Email" value={draft.contactEmail} onChange={(e) => update({ contactEmail: e.target.value })}/><input placeholder="Address" value={draft.contactAddress} onChange={(e) => update({ contactAddress: e.target.value })}/><input placeholder="Service area" value={draft.serviceArea} onChange={(e) => update({ serviceArea: e.target.value })}/><input placeholder="Business hours" value={draft.businessHours} onChange={(e) => update({ businessHours: e.target.value })}/></div></section>
    <section className="installer-subsection"><h3>Trust block</h3><div className="grid cards"><input placeholder="Licensed / insured text" value={draft.trustText} onChange={(e) => update({ trustText: e.target.value })}/><input placeholder="Years of experience" value={draft.yearsExperience} onChange={(e) => update({ yearsExperience: e.target.value })}/><label className="check"><input type="checkbox" checked={draft.emergencyServiceEnabled} onChange={(e) => update({ emergencyServiceEnabled: e.target.checked })}/> Emergency service</label><label className="check"><input type="checkbox" checked={draft.financingAvailableEnabled} onChange={(e) => update({ financingAvailableEnabled: e.target.checked })}/> Financing available</label></div></section>
    <section className="installer-subsection"><h3>SEO basics</h3><div className="grid cards"><input placeholder="Homepage SEO title" value={draft.seoTitle} onChange={(e) => update({ seoTitle: e.target.value })}/><textarea placeholder="Homepage meta description" value={draft.seoDescription} onChange={(e) => update({ seoDescription: e.target.value })}/></div></section>
    <section className="content-summary"><p className="eyebrow">Live content summary</p><h2>{draft.heroHeadline || draft.displayName}</h2><p>{draft.heroSubheadline}</p><p><strong>{draft.primaryCtaLabel}</strong> → {draft.primaryCtaLink} · <strong>{draft.secondaryCtaLabel}</strong> → {draft.secondaryCtaLink}</p><p>{draft.services.length} service(s), {draft.contactPhone || 'no phone yet'}, {draft.trustText || 'trust text pending'}</p></section>
  </>;
}

function FileUpload({ label, purpose, onUpload }: { label: string; purpose: 'branding_logo' | 'branding_favicon'; onUpload: (upload: UploadDraft, file: File) => void }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  return <label className="file-upload">{label}<input type="file" accept="image/*" onChange={async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setName(file.name);
    setStatus('Uploading…');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('purpose', purpose);
      const response = await fetch('/api/media/upload', { method: 'POST', body: form, headers: { accept: 'application/json' } });
      const result = await response.json().catch(() => null) as { ok?: boolean; media?: { id: string; url: string; filename: string; contentType: string; size: number }; error?: string } | null;
      if (!response.ok || !result?.ok || !result.media?.url) throw new Error(result?.error || 'Branding upload failed.');
      onUpload({ fileName: result.media.filename, mimeType: result.media.contentType, mediaId: result.media.id, resolvedUrl: result.media.url }, file);
      setStatus('Uploaded');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Upload failed');
    }
  }}/>{name && <span>{name}</span>}{status && <span>{status}</span>}</label>;
}

function ThemeStep({ theme, chooseMode, choosePreset, updateCustomPalette }: { theme: ThemeSettings; chooseMode: (mode: ThemeMode) => void; choosePreset: (presetId: ThemePresetId) => void; updateCustomPalette: (patch: Partial<ThemePalette>) => void }) {
  return <>
    <h1>A. Choose Color Theme</h1>
    <p>Color Theme controls colors across the app and homepage. Homepage Layout controls structure separately, so the two choices do not conflict.</p>
    <div className="theme-options">{[
      ['light', 'Light'], ['dark', 'Dark'], ['system', 'System'], ['preset', 'Preset Theme'], ['custom', 'Custom Theme'],
    ].map(([mode, label]) => <button key={mode} className={`option-card ${theme.mode === mode ? 'active' : ''}`} onClick={() => chooseMode(mode as ThemeMode)}><strong>{label}</strong></button>)}</div>
    {theme.mode === 'preset' && <div className="grid">{Object.entries(themePresets).map(([id, preset]) => <button key={id} className={`preset-card ${theme.presetId === id ? 'active' : ''}`} onClick={() => choosePreset(id as ThemePresetId)}>
      <strong>{preset.name}</strong><p>{preset.description}</p><div className="swatches">{['primary','secondary','accent','background','surface'].map((key) => <span className="swatch" style={{ background: preset.palette[key as ThemeVariableKey] }} key={key}/>)}</div>
    </button>)}</div>}
    {theme.mode === 'custom' && <div className="color-controls">
      {colorControls.map((control) => <label className="color-control" key={control.key}>{control.label}<div><input type="color" value={theme.custom[control.key]} onChange={(e) => updateCustomPalette({ [control.key]: e.target.value })}/><input value={theme.custom[control.key]} onChange={(e) => updateCustomPalette({ [control.key]: e.target.value })}/></div></label>)}
      <label className="color-control">Button radius<input value={theme.custom.buttonRadius} onChange={(e) => updateCustomPalette({ buttonRadius: e.target.value })}/></label>
      <label className="color-control">Card radius<input value={theme.custom.cardRadius} onChange={(e) => updateCustomPalette({ cardRadius: e.target.value })}/></label>
      <label className="color-control">Font style<input value={theme.custom.fontFamily} onChange={(e) => updateCustomPalette({ fontFamily: e.target.value })}/></label>
    </div>}
  </>;
}

function saveHomepagePreview(draft: BrandingHomepageDraft, companyName: string) {
  const logoSrc = draft.logoResolvedUrl || draft.logoUpload?.resolvedUrl || draft.logoUrl;
  const faviconSrc = draft.faviconResolvedUrl || draft.faviconUpload?.resolvedUrl || draft.faviconUrl;
  const brandingUpdatedAt = new Date().toISOString();
  const displayName = draft.displayName || companyName || 'ContractorOS';
  const branding = { companyName: companyName || displayName, displayName, companyDisplayName: displayName, tagline: draft.tagline, logoUrl: logoSrc, faviconUrl: faviconSrc, brandingUpdatedAt };
  saveJson('contractoros.branding', branding);
  notifyBrandingUpdated(branding);
  saveJson('contractoros.homepage.basic', {
    heroHeadline: draft.heroHeadline, heroSubheadline: draft.heroSubheadline, primaryCtaLabel: draft.primaryCtaLabel, primaryCtaLink: draft.primaryCtaLink,
    secondaryCtaLabel: draft.secondaryCtaLabel, secondaryCtaLink: draft.secondaryCtaLink, aboutText: draft.aboutText, servicesIntro: draft.servicesIntro,
    services: draft.services, contactPhone: draft.contactPhone, contactEmail: draft.contactEmail, contactAddress: draft.contactAddress, serviceArea: draft.serviceArea,
    businessHours: draft.businessHours, trustText: draft.trustText, yearsExperience: draft.yearsExperience, emergencyServiceEnabled: draft.emergencyServiceEnabled,
    financingAvailableEnabled: draft.financingAvailableEnabled, seoTitle: draft.seoTitle, seoDescription: draft.seoDescription, presetId: draft.homepagePresetId,
  });
}

function StatusBadge({ status, label }: { status: EnvStatus; label?: string }) {
  const className = status === 'found' ? 'status-badge' : status === 'missing' || status === 'invalid' ? 'status-badge danger' : 'status-badge warning';
  return <span className={className}>{label ?? status.replace('_', ' ')}</span>;
}
