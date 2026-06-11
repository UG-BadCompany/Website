import { useEffect, useMemo, useState } from 'react';
import { PublicLayout } from '../components/Layout';
import { foundationComponents, permissions, serviceCategories } from '../data/foundation';
import { getTheme, saveTheme, themePresets, type ThemePalette, type ThemePresetId, type ThemeVariableKey, type ThemeSettings } from '../lib/theme';
import type { DatabaseProvider, HostingProvider, PaymentProvider, ThemeMode } from '../types/domain';

const steps = ['license','hosting','database','environment','email','payment','company','owner','theme','foundation','expansion-packs','finish'];
const paymentKeys: Record<PaymentProvider, string[]> = {
  square: ['SQUARE_ACCESS_TOKEN','SQUARE_LOCATION_ID','SQUARE_ENVIRONMENT','SQUARE_API_VERSION (optional)','SQUARE_WEBHOOK_SIGNATURE_KEY (optional until webhooks are enabled)'],
  stripe: ['STRIPE_SECRET_KEY','STRIPE_PUBLISHABLE_KEY','STRIPE_WEBHOOK_SECRET'],
  paypal: ['PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET','PAYPAL_ENVIRONMENT'],
  authorize_net: ['AUTHORIZE_API_LOGIN_ID','AUTHORIZE_TRANSACTION_KEY','AUTHORIZE_ENVIRONMENT'],
  manual: [], configure_later: []
};

type EnvStatus = 'found' | 'missing' | 'optional' | 'invalid' | 'not_checked';
type EnvCheck = { key: string; status: EnvStatus; description: string; matchedKey?: string };
type EnvValidation = { basic: EnvCheck[]; database: EnvCheck[]; payment: EnvCheck[]; email: EnvCheck[]; databaseAdapter: string };
type MappingRow = { id: string; providerKey: string; contractorKey: 'APP_URL' | 'DATABASE_URL' | 'RESEND_API_KEY' | 'EMAIL_FROM'; description: string };

const netlifyMapping: MappingRow[] = [
  { id: 'app_url', providerKey: 'SITE_URL', contractorKey: 'APP_URL', description: 'Public website URL used for links and redirects.' },
  { id: 'database_url', providerKey: 'NETLIFY_DATABASE_URL or DATABASE_URL', contractorKey: 'DATABASE_URL', description: 'Database connection used by server functions only.' },
  { id: 'resend_api_key', providerKey: 'RESEND_API_KEY', contractorKey: 'RESEND_API_KEY', description: 'Server-only key used to send email.' },
  { id: 'email_from', providerKey: 'MAGIC_LINK_FROM_EMAIL', contractorKey: 'EMAIL_FROM', description: 'From address used for login and system emails.' },
];
const genericMapping: MappingRow[] = [
  { id: 'app_url', providerKey: 'APP_URL', contractorKey: 'APP_URL', description: 'Public website URL used for links and redirects.' },
  { id: 'database_url', providerKey: 'DATABASE_URL', contractorKey: 'DATABASE_URL', description: 'Database connection used by server functions only.' },
  { id: 'resend_api_key', providerKey: 'RESEND_API_KEY', contractorKey: 'RESEND_API_KEY', description: 'Server-only key used to send email.' },
  { id: 'email_from', providerKey: 'EMAIL_FROM', contractorKey: 'EMAIL_FROM', description: 'From address used for login and system emails.' },
];

const colorControls: { key: ThemeVariableKey; label: string }[] = [
  { key: 'primary', label: 'Primary color' }, { key: 'secondary', label: 'Secondary color' }, { key: 'accent', label: 'Accent color' },
  { key: 'background', label: 'Page background' }, { key: 'surface', label: 'Card/surface background' }, { key: 'sidebar', label: 'Sidebar background' },
  { key: 'text', label: 'Main text' }, { key: 'mutedText', label: 'Muted text' }, { key: 'border', label: 'Border color' },
  { key: 'success', label: 'Success color' }, { key: 'warning', label: 'Warning color' }, { key: 'danger', label: 'Danger color' },
];

export function InstallerPage({ step = 'install' }: { step?: string }) {
  const initial = Math.max(0, steps.indexOf(step));
  const [index, setIndex] = useState(initial === -1 ? 0 : initial);
  const [hosting, setHosting] = useState<HostingProvider>('netlify');
  const [database, setDatabase] = useState<DatabaseProvider>('netlify_database');
  const [payment, setPayment] = useState<PaymentProvider>('square');
  const [theme, setTheme] = useState<ThemeSettings>(() => getTheme());
  const [customMapping, setCustomMapping] = useState(false);
  const [mappingRows, setMappingRows] = useState<MappingRow[]>(netlifyMapping);
  const [envValidation, setEnvValidation] = useState<EnvValidation | null>(null);
  const [emailTestMessage, setEmailTestMessage] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [finishState, setFinishState] = useState<'idle' | 'saving' | 'error'>('idle');
  const [finishMessage, setFinishMessage] = useState('');
  const current = steps[index];

  useEffect(() => {
    if (!customMapping) setMappingRows(hosting === 'netlify' ? netlifyMapping : genericMapping);
    if (hosting === 'netlify') setDatabase('netlify_database');
  }, [hosting, customMapping]);

  useEffect(() => { saveTheme(theme); }, [theme]);

  const mappingPayload = useMemo(() => Object.fromEntries(mappingRows.map((row) => [row.contractorKey, row.providerKey.split(' or ')[0]])), [mappingRows]);

  useEffect(() => {
    let active = true;
    fetch('/api/install/env-validation', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ databaseProvider: database, paymentProvider: payment, mapping: mappingPayload }),
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active && data) setEnvValidation(data); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [database, payment, mappingPayload]);

  const updateTheme = (patch: Partial<ThemeSettings>) => setTheme((currentTheme) => ({ ...currentTheme, ...patch }));
  const updateCustomPalette = (patch: Partial<ThemePalette>) => setTheme((currentTheme) => ({
    ...currentTheme,
    mode: 'custom',
    custom: { ...currentTheme.custom, ...patch },
  }));
  const chooseMode = (mode: ThemeMode) => updateTheme({ mode });
  const choosePreset = (presetId: ThemePresetId) => setTheme((currentTheme) => ({ ...currentTheme, mode: 'preset', presetId }));
  const emailReady = envValidation?.email.every((check) => check.status === 'found') ?? false;

  const sendTestEmail = async () => {
    setEmailTestMessage('Checking email environment variables…');
    const response = await fetch('/api/install/email-test', { method: 'POST', headers: { accept: 'application/json' } });
    const result = await response.json();
    setEmailTestMessage(result.message ?? (response.ok ? 'Test email check passed.' : 'Email environment variables are missing.'));
  };

  const finishInstallation = async () => {
    setFinishState('saving');
    setFinishMessage('Locking installer and saving installation flags…');
    try {
      const response = await fetch('/api/install/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ companyName, ownerName, ownerEmail, theme }),
      });
      if (!response.ok) throw new Error(`Installer completion failed with HTTP ${response.status}`);
      const status = await response.json();
      if (!status.installed) throw new Error('Installer completion did not return an installed system.');
      setFinishMessage('Installation complete. Opening ContractorOS…');
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
          {current === 'license' && <><h1>Verify license</h1><p>License Option B is represented by a provider interface: license server URL + email + license + domain + install tracking.</p><input placeholder="LICENSE_SERVER_URL key name"/><input placeholder="License key"/><input placeholder="Owner email"/><input placeholder="Domain"/></>}
          {current === 'hosting' && <><h1>Hosting provider</h1><select value={hosting} onChange={(e) => setHosting(e.target.value as HostingProvider)}><option value="netlify">Netlify</option><option value="vercel">Vercel</option><option value="docker">Docker</option><option value="vps">VPS</option><option value="custom">Other/custom</option></select><p>{hosting === 'netlify' ? 'Netlify detected: installer recommends Netlify Database first.' : 'External PostgreSQL or Supabase remains supported.'}</p></>}
          {current === 'database' && <><h1>Database setup</h1><select value={database} onChange={(e) => setDatabase(e.target.value as DatabaseProvider)}><option value="netlify_database">Netlify Database</option><option value="postgres_url">External PostgreSQL URL</option><option value="supabase_postgres">Supabase PostgreSQL</option></select><p>The application uses one internal database service so app code is adapter-neutral.</p>{envValidation?.database.map((check) => <p key={check.key}><strong>{check.key}:</strong> <StatusBadge status={check.status}/></p>)}</>}
          {current === 'environment' && <EnvironmentStep hosting={hosting} rows={mappingRows} customMapping={customMapping} setCustomMapping={setCustomMapping} setRows={setMappingRows}/>} 
          {current === 'email' && <EmailStep validation={envValidation} emailReady={emailReady} sendTestEmail={sendTestEmail} emailTestMessage={emailTestMessage}/>} 
          {current === 'payment' && <><h1>Payment provider</h1><select value={payment} onChange={(e) => setPayment(e.target.value as PaymentProvider)}><option value="square">Square default</option><option value="stripe">Stripe</option><option value="paypal">PayPal</option><option value="authorize_net">Authorize.net</option><option value="manual">Manual cash/check</option><option value="configure_later">Configure later</option></select><ul>{paymentKeys[payment].map((key) => <li key={key}><code>{key}</code></li>)}</ul>{envValidation?.payment.map((check) => <p key={check.key}><strong>{check.key}:</strong> <StatusBadge status={check.status}/></p>)}</>}
          {current === 'company' && <><h1>Company setup</h1><div className="grid cards"><input placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)}/><input placeholder="Company email"/><input placeholder="Company phone"/><input placeholder="Address"/><input placeholder="Website URL"/></div></>}
          {current === 'owner' && <><h1>Owner admin</h1><input placeholder="Owner name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)}/><input placeholder="Owner email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)}/><p>Installer creates the first user, assigns the Owner role, and sends a Resend magic login link.</p></>}
          {current === 'theme' && <ThemeStep theme={theme} chooseMode={chooseMode} choosePreset={choosePreset} updateCustomPalette={updateCustomPalette}/>} 
          {current === 'foundation' && <><h1>Install ContractorOS Foundation</h1><div className="grid cards">{foundationComponents.map((name) => <div className="pill" key={name}>{name}</div>)}</div><p>{permissions.length} permissions and {serviceCategories.length} default editable service categories will be created by migrations/seeds.</p></>}
          {current === 'expansion-packs' && <><h1>Expansion packs</h1><p>Official add-ons are available later. Default v1 recommendation: none selected.</p>{['Inventory','Workforce','Accounting','Reporting','Customer'].map((p) => <label className="check" key={p}><input type="checkbox"/> {p} Expansion</label>)}</>}
          {current === 'finish' && <><h1>Finish installation</h1><p>Installer locks, migrations complete, saves the selected theme, owner magic link is sent, and you can open the dashboard.</p><button className="button" disabled={finishState === 'saving'} onClick={finishInstallation}>{finishState === 'saving' ? 'Finishing…' : 'Complete installation'}</button>{finishMessage && <p className={finishState === 'error' ? 'error-text' : undefined}>{finishMessage}</p>}</>}
          <div className="actions">
            <button className="button secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>Back</button>
            <button className="button" disabled={index === steps.length - 1} onClick={() => setIndex(index + 1)}>Continue</button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function EnvironmentStep({ hosting, rows, customMapping, setCustomMapping, setRows }: { hosting: HostingProvider; rows: MappingRow[]; customMapping: boolean; setCustomMapping: (value: boolean) => void; setRows: (rows: MappingRow[]) => void }) {
  return <>
    <h1>Environment key mapping</h1>
    <p>ContractorOS uses normalized internal config names. This screen shows how your hosting provider's environment variable names map into ContractorOS. These are key names only, not secret values.</p>
    <span className="status-badge">Recommended mapping locked</span>
    {hosting === 'netlify' && <p className="notice">Netlify users usually do not need to change this.</p>}
    <label className="check"><input type="checkbox" checked={customMapping} onChange={(e) => setCustomMapping(e.target.checked)}/> Advanced: customize provider key names</label>
    {!customMapping ? <p className="notice">Most users should leave this locked. ContractorOS will use the recommended keys for your selected hosting provider.</p> : <p className="notice warning">Only change these if your hosting provider uses different environment variable names.</p>}
    <div className="mapping-table">
      <div className="mapping-row header"><span>Provider key</span><span>ContractorOS internal key</span><span>Status</span><span>Description</span></div>
      {rows.map((row) => <div className="mapping-row" key={row.id}>
        {customMapping ? <input aria-label={`${row.contractorKey} provider key`} value={row.providerKey} onChange={(e) => setRows(rows.map((current) => current.id === row.id ? { ...current, providerKey: e.target.value } : current))}/> : <code className="readonly-key">{row.providerKey}</code>}
        <code className="readonly-key">{row.contractorKey}</code>
        <StatusBadge status="found" label={customMapping ? 'Editable provider key' : 'Locked'}/>
        <span>{row.description}</span>
      </div>)}
    </div>
    <p className="eyebrow">No secret values are collected on this screen.</p>
  </>;
}

function EmailStep({ validation, emailReady, sendTestEmail, emailTestMessage }: { validation: EnvValidation | null; emailReady: boolean; sendTestEmail: () => void; emailTestMessage: string }) {
  const emailChecks = validation?.email ?? [
    { key: 'RESEND_API_KEY', status: 'not_checked' as EnvStatus, description: 'Server-only key used to send email.' },
    { key: 'MAGIC_LINK_FROM_EMAIL or EMAIL_FROM', status: 'not_checked' as EnvStatus, description: 'From address used for login and system emails.' },
  ];
  return <>
    <h1>Email provider</h1>
    <p>Resend is the v1 default for magic links, quote emails, invoice emails, and setup test email. ContractorOS v1 uses environment variables only and does not collect secret values in the frontend installer.</p>
    <div className="email-status-list">{emailChecks.map((check) => <div className="email-status-row" key={check.key}><div><strong>{check.key}</strong><p>{check.description}</p></div><StatusBadge status={check.status}/></div>)}</div>
    {!emailReady && <p className="notice warning">Add these environment variables in your hosting provider, then redeploy or refresh installer: <code>RESEND_API_KEY</code> and <code>MAGIC_LINK_FROM_EMAIL</code>.</p>}
    <button className="button" disabled={!emailReady} onClick={sendTestEmail}>Send test email</button>
    {emailTestMessage && <p>{emailTestMessage}</p>}
  </>;
}

function ThemeStep({ theme, chooseMode, choosePreset, updateCustomPalette }: { theme: ThemeSettings; chooseMode: (mode: ThemeMode) => void; choosePreset: (presetId: ThemePresetId) => void; updateCustomPalette: (patch: Partial<ThemePalette>) => void }) {
  return <>
    <h1>Theme setup</h1>
    <p>Theme changes apply instantly to the whole installer and app shell. System mode follows <code>prefers-color-scheme</code> and the selected state persists across navigation.</p>
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

function StatusBadge({ status, label }: { status: EnvStatus; label?: string }) {
  const className = status === 'found' ? 'status-badge' : status === 'missing' || status === 'invalid' ? 'status-badge danger' : 'status-badge warning';
  return <span className={className}>{label ?? status.replace('_', ' ')}</span>;
}
