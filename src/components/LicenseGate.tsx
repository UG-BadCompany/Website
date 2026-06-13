import { LockKeyhole, RefreshCw, ShieldAlert, Settings } from 'lucide-react';
import { ReactNode } from 'react';
import { AppLayout, PublicLayout } from './Layout';
import { Link, useRouter } from './Router';
import { BrandLogo, LoadingState } from './ui';
import { useLicense, isLicenseActive } from '../lib/license';
import { friendlyModuleName } from '../../lib/license-modules';

const authAndLicenseRoutes = ['/login', '/magic-link-sent', '/auth/magic', '/logout', '/settings/license'];
const licenseSettingsAliases = ['/settings', '/settings/license'];

function isAllowedWithoutActiveLicense(path: string) {
  const pathname = path.split('?')[0];
  if (pathname.startsWith('/install')) return true;
  if (authAndLicenseRoutes.includes(pathname)) return true;
  return false;
}

export function LicenseGate({ children }: { children: ReactNode }) {
  const { path } = useRouter();
  const license = useLicense();
  const pathname = path.split('?')[0];

  if (license.loading) return <main className="install-loading"><div className="card"><LoadingState title="Checking ContractorOS license…" lines={2}/></div></main>;
  if (isLicenseActive(license.license) || isAllowedWithoutActiveLicense(pathname)) return <>{children}</>;
  if (pathname === '/') return <LicenseRequiredPage variant="public"/>;
  return <LicenseRequiredPage variant="app"/>;
}

export function UpgradeRequiredPage({ moduleKey }: { moduleKey: string }) {
  const { license, requiredTier, reload } = useLicense();
  const moduleName = friendlyModuleName(moduleKey);
  const tier = requiredTier(moduleKey);
  const requiredTierText = tier === 'business' ? 'Business' : 'Pro or Business';
  const currentTier = license?.tier || 'basic';
  const safeLicenseRef = license?.maskedLicenseKey && !license.maskedLicenseKey.includes('****') ? license.maskedLicenseKey : license?.installId;
  const upgradeUrl = buildUpgradeUrl(license?.licenseApiUrl, moduleKey, safeLicenseRef);

  return <AppLayout title="Upgrade required">
    <section className="license-hero card">
      <div className="license-icon"><LockKeyhole size={34}/></div>
      <p className="eyebrow">Module locked</p>
      <h1>{moduleName} requires {requiredTierText}</h1>
      <p className="license-lede">Your current license does not include this module. Upgrade your ContractorOS license to unlock {moduleName}, work orders, dispatching, closeout, and invoicing workflows.</p>
      <div className="license-facts">
        <span><strong>Module</strong>{moduleName}</span>
        <span><strong>Current tier</strong>{friendlyModuleName(currentTier)}</span>
        <span><strong>Required tier</strong>{requiredTierText}</span>
      </div>
      <div className="button-row">
        {upgradeUrl && <a className="button" href={upgradeUrl} target="_blank" rel="noreferrer">Upgrade License</a>}
        <button className="button secondary" type="button" onClick={() => reload()}><RefreshCw size={17}/> Recheck License</button>
        <Link className="button secondary" href="/settings/license"><Settings size={17}/> Open License Settings</Link>
      </div>
    </section>
  </AppLayout>;
}

export function LicenseRequiredPage({ variant = 'app' }: { variant?: 'public' | 'app' }) {
  const { license, reload } = useLicense();
  const status = license?.status || 'missing';
  const content = <section className="license-required-screen">
    <div className="license-required-card card">
      <BrandLogo />
      <div className="license-icon danger"><ShieldAlert size={38}/></div>
      <p className="eyebrow">ContractorOS activation</p>
      <h1>License Required</h1>
      <h2>Unauthorized ContractorOS installation or inactive license.</h2>
      <p className="license-lede">This ContractorOS installation is not currently activated. Please activate a valid license to use this website and dashboard.</p>
      <div className="license-status-row"><span className="status-badge danger">{status}</span><span>If you are the owner, sign in and update your license.</span></div>
      <div className="license-facts">
        <span><strong>Site URL</strong>{license?.siteUrl || window.location.origin}</span>
        <span><strong>Install ID</strong>{license?.installId || '—'}</span>
        <span><strong>License email</strong>{license?.licenseEmail || '—'}</span>
      </div>
      {license?.warnings?.map((warning) => <p className="error-text" key={warning}>{warning}</p>)}
      <div className="button-row">
        <Link className="button" href="/settings/license"><Settings size={17}/> Open License Settings</Link>
        <button className="button secondary" type="button" onClick={() => reload()}><RefreshCw size={17}/> Recheck License</button>
        {variant === 'public' && <Link className="button secondary" href="/login">Owner Login</Link>}
      </div>
    </div>
  </section>;
  return variant === 'public' ? <PublicLayout>{content}</PublicLayout> : <AppLayout title="License Required">{content}</AppLayout>;
}

export function isLicenseSettingsRoute(path: string) {
  const pathname = path.split('?')[0];
  return licenseSettingsAliases.includes(pathname);
}

function buildUpgradeUrl(apiUrl = 'https://taselling.netlify.app', moduleKey: string, safeLicenseRef?: string) {
  const base = (apiUrl || 'https://taselling.netlify.app').replace(/\/+$/, '');
  const params = new URLSearchParams({ module: moduleKey });
  if (safeLicenseRef && !safeLicenseRef.includes('****')) params.set('licenseKey', safeLicenseRef);
  return `${base}/account/upgrade?${params.toString()}`;
}
