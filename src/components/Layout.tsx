import { ReactNode, useEffect, useState } from 'react';
import { BriefcaseBusiness, Building2, CreditCard, FileText, FolderOpen, Home, LayoutDashboard, MessageSquare, Paintbrush, Settings, ShieldCheck, Stethoscope, UserRound, Users, Wrench } from 'lucide-react';
import { Link, NavLink } from './Router';

import { pageTitle, useBranding } from '../lib/branding';
import { useAuth } from '../lib/auth';
import { BrandLogo } from './ui';
import { fallbackRoleOptions, normalizeRole, type RoleOption } from '../lib/role-management';

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
    { href: '/settings/homepage-builder', label: 'Homepage Builder', icon: Paintbrush, permission: 'homepage.view' },
    { href: '/settings/users', label: 'Users', icon: UserRound, permission: 'users.view' },
    { href: '/settings/roles', label: 'Roles', icon: ShieldCheck, permission: 'roles.view' },
    { href: '/settings/roles-permissions', label: 'Roles & Permissions', icon: ShieldCheck, permission: 'roles.manage' },
    { href: '/settings/diagnostics', label: 'Diagnostics', icon: Stethoscope, permission: 'diagnostics.view' },
  ] },
  { group: 'Portal', items: [
    { href: '/portal', label: 'Portal', icon: UserRound, permission: 'portal.view' },
    { href: '/requests', label: 'My Requests', icon: Wrench, permission: 'portal.view', roles: ['Client'] },
    { href: '/quotes', label: 'My Quotes', icon: FileText, permission: 'portal.view', roles: ['Client'] },
    { href: '/invoices', label: 'My Invoices', icon: FileText, permission: 'portal.view', roles: ['Client'] },
    { href: '/messages', label: 'Messages', icon: MessageSquare, permission: 'portal.view', roles: ['Client'] },
    { href: '/account', label: 'Account', icon: UserRound, permission: 'account.view' },
  ] },
];

type NavItem = typeof appNavGroups[number]['items'][number] & { roles?: string[] };


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
  const role = auth.role || '';
  const visibleGroups = appNavGroups.map((group) => ({ ...group, items: group.items.filter((item: NavItem) => {
    const roleAllowed = !item.roles || item.roles.includes(role);
    const permissionAllowed = auth.can(item.permission) || (item.href === '/dashboard' && auth.isAuthenticated);
    const clientPortalOnly = role === 'Client' ? group.group === 'Portal' || item.href === '/dashboard' : true;
    const technicianFieldOnly = role === 'Technician' ? !['Administration', 'Financial'].includes(group.group) : true;
    return roleAllowed && permissionAllowed && clientPortalOnly && technicianFieldOnly;
  }) })).filter((group) => group.items.length > 0);
  const flatNav = visibleGroups.flatMap((group) => group.items);
  const mobilePriority = mobileNavForRole(role, flatNav);
  const branding = useBranding();
  useEffect(() => { document.title = pageTitle(title, branding); }, [title, branding.companyDisplayName, branding.displayName, branding.companyName]);
  return <div className="app-shell">
    <aside className="sidebar"><Link href="/" className="brand"><BrandLogo /><strong>{branding.displayName}</strong></Link>{visibleGroups.map((group) => <div className="sidebar-section" key={group.group}><p className="eyebrow">{group.group}</p>{group.items.map((item) => <NavLink key={item.href} href={item.href}><item.icon size={18}/>{item.label}</NavLink>)}</div>)}</aside>
    <section className="app-main"><header className="app-top"><div className="app-title-lockup"><BrandLogo className="app-header-logo"/><div><p className="eyebrow">{branding.displayName} workspace</p><h1>{title}</h1></div></div><div className="topbar-actions"><ViewAsControl/><span className="pill">{auth.isViewAsActive ? `Viewing as ${auth.effectiveRole}` : (auth.realRole || auth.role || 'User')}</span><Link href="/account" className="button secondary small">Account</Link></div></header>{auth.isViewAsActive && <div className="view-as-banner"><div><strong>Owner Preview Mode: Viewing as {auth.effectiveRole}.</strong><span> Actions and navigation are filtered for preview. Your real session remains {auth.realRole}.</span></div><button className="button small" onClick={auth.clearViewAsRole}>Exit View As</button></div>}{children}</section>
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

type ViewAsOptions = { ok?: boolean; roles?: RoleOption[]; clients?: Array<{ id: string; name: string; email?: string }>; technicians?: Array<{ id: string; name: string; email?: string }> };

function ViewAsControl() {
  const auth = useAuth();
  const canPreview = auth.realRole.toLowerCase() === 'owner' || auth.realPermissions.includes('*');
  const [options, setOptions] = useState<ViewAsOptions>({ roles: fallbackRoleOptions(), clients: [], technicians: [] });
  const [error, setError] = useState('');
  const [pendingRole, setPendingRole] = useState('');
  const [contextId, setContextId] = useState('demo');

  useEffect(() => {
    if (!canPreview) return;
    fetch('/api/admin/view-as/options', { credentials: 'include', cache: 'no-store', headers: { accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`Unable to load roles (${response.status})`)))
      .then((data: ViewAsOptions) => setOptions({ roles: (data.roles?.length ? data.roles : fallbackRoleOptions()).map(normalizeRole), clients: data.clients || [], technicians: data.technicians || [] }))
      .catch((caught: Error) => { setError(caught.message); setOptions({ roles: fallbackRoleOptions().filter((role) => role.name === 'Owner'), clients: [], technicians: [] }); });
  }, [canPreview]);

  if (!canPreview) return null;
  const roles = options.roles?.length ? options.roles : fallbackRoleOptions();
  const selectedRole = roles.find((role) => role.name === pendingRole);
  const requiresClient = pendingRole.toLowerCase() === 'client';
  const requiresTechnician = pendingRole.toLowerCase() === 'technician';
  const contextChoices = requiresClient ? options.clients || [] : requiresTechnician ? options.technicians || [] : [];

  const activate = () => {
    if (!selectedRole) return;
    const selectedContextId = contextId === 'demo' ? null : contextId;
    auth.setViewAsRole(selectedRole.name, {
      permissions: selectedRole.permissions,
      clientId: requiresClient ? selectedContextId : null,
      userId: requiresTechnician ? selectedContextId : null,
    });
    setPendingRole('');
    setContextId('demo');
  };

  return <div className="view-as-control">
    <select aria-label="View As role" value={auth.isViewAsActive ? auth.effectiveRole : ''} onChange={(event) => {
      const roleName = event.target.value;
      if (!roleName) { auth.clearViewAsRole(); return; }
      const role = roles.find((item) => item.name === roleName);
      if (!role) return;
      if (['Client', 'Technician'].includes(role.name)) { setPendingRole(role.name); setContextId('demo'); return; }
      auth.setViewAsRole(role.name, { permissions: role.permissions });
    }}>
      <option value="">View As: {auth.realRole || 'Owner'} (real)</option>
      {roles.map((role) => <option key={role.id || role.name} value={role.name}>{role.name} · {role.permissionsCount ?? role.permissions?.length ?? 0} perms · {role.systemRole ? 'System' : 'Custom'}</option>)}
    </select>
    {auth.isViewAsActive && <button className="button ghost small" onClick={auth.clearViewAsRole}>Exit</button>}
    {pendingRole && <div className="view-as-popover card">
      <strong>Select {pendingRole.toLowerCase()} to preview</strong>
      <select value={contextId} onChange={(event) => setContextId(event.target.value)}>
        <option value="demo">Use demo empty {pendingRole.toLowerCase()} shell</option>
        {contextChoices.map((item) => <option key={item.id} value={item.id}>{item.name}{item.email ? ` — ${item.email}` : ''}</option>)}
      </select>
      <div className="button-row"><button className="button small" onClick={activate}>Start preview</button><button className="button secondary small" onClick={() => setPendingRole('')}>Cancel</button></div>
    </div>}
    {error && <small className="error-text">View As roles unavailable; Owner only fallback.</small>}
  </div>;
}
