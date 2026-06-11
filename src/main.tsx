import React from 'react';
import { createRoot } from 'react-dom/client';
import { InstallationGate } from './components/InstallationGate';
import { PublicLayout } from './components/Layout';
import { RouterProvider, useRouter } from './components/Router';
import { HomePage, AboutPage, ServicesPage, ContactPage, RequestEstimatePage, ThankYouPage } from './pages/PublicPages';
import { AccountPage, AuthMagicPage, LoginPage, LogoutPage, MagicLinkSentPage } from './pages/AuthPages';
import { InstallerPage } from './pages/Installer';
import { AssetsPage, ClientsPage, DashboardPage, InvoicesPage, JobsPage, MediaPage, MessagesPage, PaymentsPage, PortalPage, PropertiesPage, QuotesPage, RequestsPage, ServiceCatalogPage, SettingsPage } from './pages/AppPages';
import { applyTheme } from './lib/theme';
import { BrandingProvider } from './lib/branding';
import { AuthProvider } from './lib/auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoadingState } from './components/ui';
import './styles/global.css';

function NotFoundPage() { return <PublicLayout><section className="section narrow"><LoadingState title="Page not found" lines={2}/><p>The requested page is not available.</p></section></PublicLayout>; }

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
  if (path.startsWith('/portal')) return <PortalPage />;
  if (path.startsWith('/requests')) return <RequestsPage />;
  if (path.startsWith('/quotes')) return <QuotesPage />;
  if (path.startsWith('/jobs') || path.startsWith('/work-orders')) return <JobsPage />;
  if (path.startsWith('/invoices')) return <InvoicesPage />;
  if (path.startsWith('/payments')) return <PaymentsPage />;
  if (path.startsWith('/messages')) return <MessagesPage />;
  if (path.startsWith('/assets') || path.startsWith('/cmms')) return <AssetsPage />;
  if (path.startsWith('/clients')) return <ClientsPage />;
  if (path.startsWith('/properties')) return <PropertiesPage />;
  if (path.startsWith('/service-catalog')) return <ServiceCatalogPage />;
  if (path.startsWith('/media')) return <MediaPage />;
  if (path.startsWith('/settings')) return <SettingsPage area={path.slice(1)} />;
  return <NotFoundPage />;
}

applyTheme();
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme());
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));

const root = document.getElementById('root');
if (!root) throw new Error('Application root element was not found.');
createRoot(root).render(<React.StrictMode><RouterProvider><BrandingProvider><AuthProvider><InstallationGate><ProtectedRoute><App /></ProtectedRoute></InstallationGate></AuthProvider></BrandingProvider></RouterProvider></React.StrictMode>);
