import { ReactNode, useEffect } from 'react';
import { BriefcaseBusiness, FileText, LayoutDashboard, MessageSquare, Settings, UserRound, Wrench } from 'lucide-react';
import { Link, NavLink } from './Router';

import { pageTitle, useBranding } from '../lib/branding';
import { useAuth } from '../lib/auth';
import { BrandLogo } from './ui';

const appNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { href: '/requests', label: 'Requests', icon: Wrench, permission: 'requests.view' },
  { href: '/quotes', label: 'Quotes', icon: FileText, permission: 'quotes.view' },
  { href: '/jobs', label: 'Jobs', icon: BriefcaseBusiness, permission: 'jobs.view' },
  { href: '/messages', label: 'Messages', icon: MessageSquare, permission: 'messages.view' },
  { href: '/portal', label: 'Portal', icon: UserRound, permission: 'requests.view' },
  { href: '/settings', label: 'Settings', icon: Settings, permission: 'settings.view' }
];

export function PublicLayout({ children }: { children: ReactNode }) {
  const branding = useBranding();
  return <>
    <header className="site-header"><Link href="/" className="brand"><BrandLogo /><strong>{branding.displayName}</strong></Link><nav><Link href="/about">About</Link><Link href="/services">Services</Link><Link href="/contact">Contact</Link><Link href="/request-estimate" className="button small">Request Estimate</Link><Link href="/login">Login</Link></nav></header>
    <main>{children}</main>
    <footer className="footer"><strong>{branding.displayName}</strong><span>{branding.tagline}</span><span>Secure estimates, service, invoices, and messaging.</span></footer>
  </>;
}

export function AppLayout({ title, children }: { title: string; children: ReactNode }) {
  const auth = useAuth();
  const nav = appNav.filter((item) => auth.can(item.permission) || (item.href === '/dashboard' && auth.isAuthenticated));
  const branding = useBranding();
  useEffect(() => { document.title = pageTitle(title, branding); }, [title, branding.companyDisplayName, branding.displayName, branding.companyName]);
  return <div className="app-shell">
    <aside className="sidebar"><Link href="/" className="brand"><BrandLogo /><strong>{branding.displayName}</strong></Link><div className="sidebar-section"><p className="eyebrow">Operations</p>{nav.map((item) => <NavLink key={item.href} href={item.href}><item.icon size={18}/>{item.label}</NavLink>)}</div></aside>
    <section className="app-main"><header className="app-top"><div className="app-title-lockup"><BrandLogo className="app-header-logo"/><div><p className="eyebrow">{branding.displayName} workspace</p><h1>{title}</h1></div></div><div className="topbar-actions"><span className="pill">{auth.role || 'User'}</span><Link href="/account" className="button secondary small">Account</Link></div></header>{children}</section>
    <nav className="mobile-nav">{nav.slice(0,5).map((item) => <NavLink key={item.href} href={item.href}><item.icon size={20}/><small>{item.label}</small></NavLink>)}</nav>
  </div>;
}

export function Protected({ permission, children }: { permission: string; children: ReactNode }) {
  const auth = useAuth();
  if (!auth.can(permission)) return <AppLayout title="Access restricted"><div className="card"><h2>Permission required</h2><p>This page requires <code>{permission}</code>.</p></div></AppLayout>;
  return <>{children}</>;
}
