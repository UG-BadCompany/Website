import React from 'react';
import { createRoot } from 'react-dom/client';
import { InstallationGate } from './components/InstallationGate';
import { PublicLayout } from './components/Layout';
import { RouterProvider, useRouter } from './components/Router';
import { HomePage, AboutPage, ServicesPage, ContactPage, RequestEstimatePage, ThankYouPage } from './pages/PublicPages';
import { AccountPage, AuthMagicPage, LoginPage, LogoutPage, MagicLinkSentPage } from './pages/AuthPages';
import { InstallerPage } from './pages/Installer';
import { AssetsPage, ClientsPage, DashboardPage, MediaPage, MessagesPage, PortalPage, PropertiesPage, ServiceCatalogPage, SettingsPage, ProjectShowcasePage, GoogleBusinessIntegrationPage } from './pages/AppPages';
import { RequestsPage } from './pages/modules/RequestsPage';
import { QuotesPage } from './pages/modules/QuotesPage';
import { JobsPage } from './pages/modules/JobsPage';
import { InvoicesPage } from './pages/modules/InvoicesPage';
import { PaymentsPage } from './pages/modules/PaymentsPage';
import { applyTheme } from './lib/theme';
import { BrandingProvider } from './lib/branding';
import { AuthProvider } from './lib/auth';
import { LicenseProvider } from './lib/license';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useLicense } from './lib/license';
import { LoadingState } from './components/ui';
import { LicenseGate, UpgradeRequiredPage } from './components/LicenseGate';
import './styles/global.css';

function NotFoundPage() { return <PublicLayout><section className="section narrow"><LoadingState title="Page not found" lines={2}/><p>The requested page is not available.</p></section></PublicLayout>; }

function LicensedPage({ moduleKey, children }: { moduleKey: string; children: React.ReactNode }) {
  const license = useLicense();
  if (!license.canUseModule(moduleKey)) return <UpgradeRequiredPage moduleKey={moduleKey}/>;
  return <>{children}</>;
}

function App() {
  const { path: routePath } = useRouter();
  const path = routePath.split('?')[0];
  if (path === '/') return <HomePage />;
  if (path === '/about') return <AboutPage />;
  if (path === '/services') return <ServicesPage />;
  if (path === '/contact') return <ContactPage />;
  if (path === '/request-estimate') return <RequestEstimatePage />;
  if (path === '/request-estimate/thank-you' || path === '/thank-you') return <ThankYouPage />;
  if (path === '/login') return <LoginPage />;
  if (path === '/magic-link-sent') return <MagicLinkSentPage />;
  if (path === '/auth/magic') return <AuthMagicPage />;
  if (path === '/logout') return <LogoutPage />;
  if (path === '/account') return <AccountPage />;
  if (path.startsWith('/install')) return <InstallerPage step={path.split('/')[2] ?? 'license'} />;
  if (path === '/dashboard') return <DashboardPage />;
  if (path.startsWith('/dashboard/jobs')) return <LicensedPage moduleKey="jobs"><JobsPage /></LicensedPage>;
  if (path.startsWith('/dashboard/work-orders')) return <LicensedPage moduleKey="work_orders"><JobsPage /></LicensedPage>;
  if (path.startsWith('/portal')) return <LicensedPage moduleKey="client_portal"><PortalPage /></LicensedPage>;
  if (path.startsWith('/requests')) return <RequestsPage />;
  if (path.startsWith('/quotes')) return <QuotesPage />;
  if (path.startsWith('/jobs') || path.startsWith('/work-orders')) return <LicensedPage moduleKey={path.startsWith('/work-orders') ? 'work_orders' : 'jobs'}><JobsPage /></LicensedPage>;
  if (path.startsWith('/invoices')) return <InvoicesPage />;
  if (path.startsWith('/payments')) return <LicensedPage moduleKey="payments"><PaymentsPage /></LicensedPage>;
  if (path.startsWith('/messages')) return <LicensedPage moduleKey="messages"><MessagesPage /></LicensedPage>;
  if (path.startsWith('/assets') || path.startsWith('/cmms')) return <LicensedPage moduleKey="assets"><AssetsPage /></LicensedPage>;
  if (path.startsWith('/clients')) return <ClientsPage />;
  if (path.startsWith('/properties')) return <PropertiesPage />;
  if (path.startsWith('/service-catalog')) return <LicensedPage moduleKey="service_catalog"><ServiceCatalogPage /></LicensedPage>;
  if (path.startsWith('/media')) return <MediaPage />;
  if (path.startsWith('/marketing/project-showcase')) return <LicensedPage moduleKey="project_showcase"><ProjectShowcasePage /></LicensedPage>;
  if (path.startsWith('/settings/integrations/google-business')) return <LicensedPage moduleKey="google_reviews"><GoogleBusinessIntegrationPage /></LicensedPage>;
  if (path.startsWith('/settings')) return <SettingsPage area={path.slice(1)} />;
  return <NotFoundPage />;
}

applyTheme();
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme());
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));

const root = document.getElementById('root');
if (!root) throw new Error('Application root element was not found.');
createRoot(root).render(<React.StrictMode><RouterProvider><BrandingProvider><AuthProvider><LicenseProvider><InstallationGate><ProtectedRoute><LicenseGate><App /></LicenseGate></ProtectedRoute></InstallationGate></LicenseProvider></AuthProvider></BrandingProvider></RouterProvider></React.StrictMode>);
