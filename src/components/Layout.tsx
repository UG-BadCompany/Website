import { ReactNode, useEffect, useState } from 'react';
import { LayoutDashboard, MessageSquare, Settings, UserRound, Wrench } from 'lucide-react';
import { Link, NavLink } from './Router';
import { currentUser, can } from '../lib/permissions';
import { applyFavicon, fetchPublicSiteSettings, getBranding } from '../lib/branding';

const appNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'settings.view' },
  { href: '/requests', label: 'Requests', icon: Wrench, permission: 'requests.view' },
  { href: '/messages', label: 'Messages', icon: MessageSquare, permission: 'messages.view' },
  { href: '/portal', label: 'Portal', icon: UserRound, permission: 'requests.view' },
  { href: '/settings', label: 'Settings', icon: Settings, permission: 'settings.view' }
];

export function PublicLayout({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState(() => getBranding());
  useEffect(() => { fetchPublicSiteSettings().then((settings) => setBranding((current) => ({ ...current, ...settings.branding }))).catch(() => undefined); }, []);
  useEffect(() => applyFavicon(branding.faviconSrc), [branding.faviconSrc]);
  return <>
    <header className="site-header"><Link href="/" className="brand">{branding.logoSrc ? <img src={branding.logoSrc} alt={`${branding.displayName} logo`}/> : <span>⌂</span>}{branding.displayName}</Link><nav><Link href="/about">About</Link><Link href="/services">Services</Link><Link href="/contact">Contact</Link><Link href="/request-estimate" className="button small">Request Estimate</Link><Link href="/login">Login</Link></nav></header>
    <main>{children}</main>
    <footer className="footer">{branding.displayName} • ContractorOS Foundation • PostgreSQL • Resend • Square-ready</footer>
  </>;
}

export function AppLayout({ title, children }: { title: string; children: ReactNode }) {
  const nav = appNav.filter((item) => can(currentUser, item.permission));
  const [branding, setBranding] = useState(() => getBranding());
  useEffect(() => { fetchPublicSiteSettings().then((settings) => setBranding((current) => ({ ...current, ...settings.branding }))).catch(() => undefined); }, []);
  useEffect(() => applyFavicon(branding.faviconSrc), [branding.faviconSrc]);
  return <div className="app-shell">
    <aside className="sidebar"><Link href="/" className="brand">{branding.logoSrc ? <img src={branding.logoSrc} alt={`${branding.displayName} logo`}/> : <span>⌂</span>}{branding.displayName}</Link>{nav.map((item) => <NavLink key={item.href} href={item.href}><item.icon size={18}/>{item.label}</NavLink>)}</aside>
    <section className="app-main"><header className="app-top"><div><p className="eyebrow">Foundation workspace</p><h1>{title}</h1></div><Link href="/account" className="pill">{currentUser.role}</Link></header>{children}</section>
    <nav className="mobile-nav">{nav.slice(0,5).map((item) => <NavLink key={item.href} href={item.href}><item.icon size={20}/><small>{item.label}</small></NavLink>)}</nav>
  </div>;
}

export function Protected({ permission, children }: { permission: string; children: ReactNode }) {
  if (!can(currentUser, permission)) return <AppLayout title="Access restricted"><div className="card"><h2>Permission required</h2><p>This page requires <code>{permission}</code>.</p></div></AppLayout>;
  return <>{children}</>;
}
