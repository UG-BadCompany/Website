import { ReactNode, useEffect } from 'react';
import { BriefcaseBusiness, Building2, CreditCard, FileText, FolderOpen, Home, LayoutDashboard, MessageSquare, Settings, ShieldCheck, Stethoscope, UserRound, Users, Wrench } from 'lucide-react';
import { Link, NavLink } from './Router';

import { pageTitle, useBranding } from '../lib/branding';
import { useAuth } from '../lib/auth';
import { BrandLogo } from './ui';

const appNavGroups = [
  { group: 'Overview', items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' }] },
  { group: 'Customers', items: [
    { href: '/clients', label: 'Clients', icon: Users, permission: 'clients.view' },
    { href: '/properties', label: 'Properties', icon: Home, permission: 'properties.view' },
    { href: '/messages', label: 'Messages', icon: MessageSquare, permission: 'messages.view' },
  ] },
  { group: 'Operations', items: [
    { href: '/requests', label: 'Requests', icon: Wrench, permission: 'requests.view' },
    { href: '/quotes', label: 'Quotes', icon: FileText, permission: 'quotes.view' },
    { href: '/jobs', label: 'Jobs / Work Orders', icon: BriefcaseBusiness, permission: 'jobs.view' },
  ] },
  { group: 'Financial', items: [
    { href: '/invoices', label: 'Invoices', icon: FileText, permission: 'invoices.view' },
    { href: '/payments', label: 'Payments', icon: CreditCard, permission: 'payments.view' },
  ] },
  { group: 'Assets & Services', items: [
    { href: '/assets', label: 'CMMS Assets', icon: Building2, permission: 'cmms.view' },
    { href: '/service-catalog', label: 'Service Catalog', icon: Wrench, permission: 'service_catalog.view' },
    { href: '/media', label: 'Media / Files', icon: FolderOpen, permission: 'media.view' },
  ] },
  { group: 'Administration', items: [
    { href: '/settings', label: 'Settings', icon: Settings, permission: 'settings.view' },
    { href: '/settings/users', label: 'Users', icon: UserRound, permission: 'users.view' },
    { href: '/settings/roles', label: 'Roles & Permissions', icon: ShieldCheck, permission: 'roles.view' },
    { href: '/settings/diagnostics', label: 'Diagnostics', icon: Stethoscope, permission: 'diagnostics.view' },
  ] },
  { group: 'Portal', items: [{ href: '/portal', label: 'Portal', icon: UserRound, permission: 'portal.view' }] },
];

type NavItem = typeof appNavGroups[number]['items'][number];


export function PublicLayout({ children }: { children: ReactNode }) {
  const branding = useBranding();
  const auth = useAuth();
  const accountHref = auth.isAuthenticated ? '/dashboard' : '/login';
  const accountLabel = auth.isLoading ? 'Checking…' : auth.isAuthenticated ? 'Dashboard' : 'Login';
  return <>
    <header className="site-header"><Link href="/" className="brand"><BrandLogo /><strong>{branding.displayName}</strong></Link><nav><Link href="/about">About</Link><Link href="/services">Services</Link><Link href="/contact">Contact</Link><Link href="/request-estimate" className="button small">Request Estimate</Link><Link href={accountHref} className={auth.isAuthenticated ? 'button secondary small' : undefined} aria-disabled={auth.isLoading ? 'true' : undefined}>{accountLabel}</Link></nav></header>
    <main>{children}</main>
    <footer className="footer"><strong>{branding.displayName}</strong><span>{branding.tagline}</span><span>Secure estimates, service, invoices, and messaging.</span></footer>
  </>;
}

export function AppLayout({ title, children }: { title: string; children: ReactNode }) {
  const auth = useAuth();
  const visibleGroups = appNavGroups.map((group) => ({ ...group, items: group.items.filter((item) => auth.can(item.permission) || (item.href === '/dashboard' && auth.isAuthenticated)) })).filter((group) => group.items.length > 0);
  const flatNav = visibleGroups.flatMap((group) => group.items);
  const mobilePriority = mobileNavForRole(auth.role || '', flatNav);
  const branding = useBranding();
  useEffect(() => { document.title = pageTitle(title, branding); }, [title, branding.companyDisplayName, branding.displayName, branding.companyName]);
  return <div className="app-shell">
    <aside className="sidebar"><Link href="/" className="brand"><BrandLogo /><strong>{branding.displayName}</strong></Link>{visibleGroups.map((group) => <div className="sidebar-section" key={group.group}><p className="eyebrow">{group.group}</p>{group.items.map((item) => <NavLink key={item.href} href={item.href}><item.icon size={18}/>{item.label}</NavLink>)}</div>)}</aside>
    <section className="app-main"><header className="app-top"><div className="app-title-lockup"><BrandLogo className="app-header-logo"/><div><p className="eyebrow">{branding.displayName} workspace</p><h1>{title}</h1></div></div><div className="topbar-actions"><span className="pill">{auth.role || 'User'}</span><Link href="/account" className="button secondary small">Account</Link></div></header>{children}</section>
    <nav className="mobile-nav">{mobilePriority.map((item) => <NavLink key={item.href} href={item.href}><item.icon size={20}/><small>{item.label}</small></NavLink>)}</nav>
  </div>;
}

function mobileNavForRole(role: string, nav: NavItem[]) {
  const preference = role === 'Client'
    ? ['/portal','/requests','/quotes','/invoices','/messages']
    : role === 'Technician'
      ? ['/jobs','/messages','/assets','/media','/account']
      : ['/dashboard','/requests','/jobs','/invoices','/messages'];
  const ranked = preference.map((href) => nav.find((item) => item.href === href)).filter(Boolean) as NavItem[];
  return [...ranked, ...nav.filter((item) => !ranked.some((rankedItem) => rankedItem.href === item.href))].slice(0, 5);
}

export function Protected({ permission, children }: { permission: string; children: ReactNode }) {
  const auth = useAuth();
  if (!auth.can(permission)) return <AppLayout title="Access restricted"><div className="card"><h2>Permission required</h2><p>This page requires <code>{permission}</code>.</p></div></AppLayout>;
  return <>{children}</>;
}
