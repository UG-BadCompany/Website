import { ReactNode, TouchEvent, useEffect, useMemo, useState } from 'react';
import { Bell, BriefcaseBusiness, Building2, CreditCard, FileText, FolderOpen, Home, LayoutDashboard, LogOut, Menu, MessageSquare, MoreHorizontal, Image as ImageIcon, MapPin as MapPinIcon, Paintbrush, Phone as PhoneIcon, Plus, Search, Settings, ShieldCheck, Stethoscope, UserRound, Users, Wrench, X } from 'lucide-react';
import { Link, NavLink, useRouter } from './Router';

import { pageTitle, useBranding, useHomepageSettings } from '../lib/branding';
import { useAuth } from '../lib/auth';
import { useLicense } from '../lib/license';
import { BrandLogo } from './ui';
import { fallbackRoleOptions, normalizeRole, type RoleOption } from '../lib/role-management';

const appNavGroups = [
  { group: 'Overview', items: [{ id: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view', moduleKey: 'dashboard', aliases: ['Portal'] }] },
  { group: 'Customers', items: [
    { id: 'clients', href: '/clients', label: 'Clients', icon: Users, permission: 'clients.view', moduleKey: 'clients' },
    { id: 'properties', href: '/properties', label: 'Properties', icon: Home, permission: 'properties.view', moduleKey: 'properties' },
    { id: 'messages', href: '/messages', label: 'Messages', icon: MessageSquare, permission: 'messages.view', moduleKey: 'messages' },
  ] },
  { group: 'Operations', items: [
    { id: 'requests', href: '/requests', label: 'Requests', icon: Wrench, permission: 'requests.view', moduleKey: 'requests' },
    { id: 'quotes', href: '/quotes', label: 'Quotes', icon: FileText, permission: 'quotes.view', moduleKey: 'quotes' },
    { id: 'jobs', href: '/jobs', label: 'Jobs', icon: BriefcaseBusiness, permission: 'jobs.view', moduleKey: 'jobs', aliases: ['My Jobs', 'Assigned Work'] },
    { id: 'work-orders', href: '/work-orders', label: 'Work Orders', icon: BriefcaseBusiness, permission: 'work_orders.view', moduleKey: 'work_orders', aliases: ['Assigned Work', 'Jobs / Work Orders'] },
  ] },
  { group: 'Financial', items: [
    { id: 'invoices', href: '/invoices', label: 'Invoices', icon: FileText, permission: 'invoices.view', moduleKey: 'basic_invoices' },
    { id: 'payments', href: '/payments', label: 'Payments', icon: CreditCard, permission: 'payments.view', moduleKey: 'payments' },
  ] },
  { group: 'Assets & Services', items: [
    { id: 'assets', href: '/assets', label: 'CMMS Assets', icon: Building2, permission: 'cmms.view', moduleKey: 'assets' },
    { id: 'service-catalog', href: '/service-catalog', label: 'Service Catalog', icon: Wrench, permission: 'service_catalog.view', moduleKey: 'service_catalog' },
    { id: 'media', href: '/media', label: 'Media / Files', icon: FolderOpen, permission: 'media.view', moduleKey: 'basic_media' },
    { id: 'project-showcase', href: '/marketing/project-showcase', label: 'Project Showcase', icon: ImageIcon, permission: 'project_showcase.view', moduleKey: 'project_showcase' },
  ] },
  { group: 'Administration', items: [
    { id: 'settings', href: '/settings', label: 'Settings', icon: Settings, permission: 'settings.view', moduleKey: 'basic_settings' },
    { id: 'users', href: '/settings/users', label: 'Users', icon: UserRound, permission: 'users.view', moduleKey: 'advanced_roles_permissions' },
    { id: 'roles', href: '/settings/roles', label: 'Roles', icon: ShieldCheck, permission: 'roles.view', moduleKey: 'advanced_roles_permissions' },
    { id: 'roles-permissions', href: '/settings/roles-permissions', label: 'Roles & Permissions', icon: ShieldCheck, permission: 'roles.manage', moduleKey: 'advanced_roles_permissions' },
    { id: 'homepage-builder', href: '/settings/homepage-builder', label: 'Homepage Builder', icon: Paintbrush, permission: 'homepage.view', moduleKey: 'homepage_builder' },
    { id: 'diagnostics', href: '/settings/diagnostics', label: 'Diagnostics', icon: Stethoscope, permission: 'diagnostics.view' },
  ] },
  { group: 'Account', items: [
    { id: 'portal', href: '/portal', label: 'Portal', icon: UserRound, permission: 'portal.view', moduleKey: 'client_portal' },
    { id: 'account', href: '/account', label: 'Account', icon: UserRound, permission: 'account.view' },
    { id: 'logout', href: '/logout', label: 'Logout', icon: LogOut, permission: 'account.view' },
  ] },
];

type PermissionSpec = string | string[];
type NavItem = Omit<typeof appNavGroups[number]['items'][number], 'permission'> & { permission: PermissionSpec; roles?: string[]; aliases?: string[]; moduleKey?: string };


export function PublicLayout({ children }: { children: ReactNode }) {
  const branding = useBranding();
  const auth = useAuth();
  const { homepage } = useHomepageSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountHref = auth.isAuthenticated ? '/dashboard' : '/login';
  const accountLabel = auth.isLoading ? 'Checking…' : auth.isAuthenticated ? 'Dashboard' : 'Login';
  const dialablePhone = (homepage.contactPhone || '').replace(/[^+\d]/g, '');
  const phoneHref = dialablePhone ? `tel:${dialablePhone}` : 'tel:+16025550100';
  useEffect(() => { setMobileOpen(false); }, [auth.isAuthenticated]);
  return <>
    <header className="site-header public-site-header">
      <Link href="/" className="brand"><BrandLogo /><strong>{branding.displayName}</strong></Link>
      <nav className="public-desktop-nav"><Link href="/about">About</Link><Link href="/services">Services</Link><Link href="/contact">Contact</Link><Link href="/request-estimate" className="button small">Request Estimate</Link><Link href={accountHref} className={auth.isAuthenticated ? 'button secondary small' : undefined} aria-disabled={auth.isLoading ? 'true' : undefined}>{accountLabel}</Link></nav>
      <button type="button" className="public-mobile-menu-button" aria-label="Open menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={20}/><span>Menu</span></button>
    </header>
    <main>{children}</main>
    <footer className="footer"><strong>{branding.displayName}</strong><span>{branding.tagline}</span><span>Secure estimates, service, invoices, and messaging.</span></footer>
    {mobileOpen && <PublicMobileDrawer accountHref={accountHref} accountLabel={accountLabel} phoneHref={phoneHref} onClose={() => setMobileOpen(false)} />}
  </>;
}

function PublicMobileDrawer({ accountHref, accountLabel, phoneHref, onClose }: { accountHref: string; accountLabel: string; phoneHref: string; onClose: () => void }) {
  const branding = useBranding();
  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/about', label: 'About', icon: Building2 },
    { href: '/services', label: 'Services', icon: Wrench },
    { href: '/projects', label: 'Past Projects', icon: FolderOpen },
    { href: '/reviews', label: 'Reviews', icon: MessageSquare },
    { href: '/service-areas', label: 'Service Areas', icon: MapPinIcon },
    { href: '/contact', label: 'Contact', icon: UserRound },
    { href: '/request-estimate', label: 'Request Estimate', icon: FileText },
    { href: accountHref, label: accountLabel === 'Dashboard' ? 'Dashboard' : 'Login / Dashboard', icon: LayoutDashboard },
  ];
  return <div className="mobile-more-drawer public-mobile-drawer" role="dialog" aria-modal="true" aria-label="Website navigation" onClick={onClose}>
    <div className="mobile-more-sheet public-mobile-sheet" onClick={(event) => event.stopPropagation()}>
      <div className="mobile-sheet-handle"/>
      <div className="mobile-sheet-header"><Link href="/" className="mobile-brand"><BrandLogo/><span><strong>{branding.displayName}</strong><small>Website menu</small></span></Link><button type="button" className="icon-button" onClick={onClose} aria-label="Close menu"><X size={20}/></button></div>
      <section className="mobile-more-group public-mobile-link-list"><h3>Navigation</h3>{links.map((item) => <Link key={item.href + item.label} href={item.href} className="mobile-more-link" onClick={onClose}><item.icon size={18}/><span>{item.label}</span></Link>)}<a href={phoneHref} className="mobile-more-link public-call-link" onClick={onClose}><PhoneIcon size={18}/><span>Call Now</span></a></section>
      <div className="public-mobile-cta-row"><Link href="/request-estimate" className="button" onClick={onClose}>Request Estimate</Link><a href={phoneHref} className="button secondary" onClick={onClose}>Call Now</a></div>
    </div>
  </div>;
}

export function AppLayout({ title, children }: { title: string; children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const role = auth.role || '';
  const branding = useBranding();
  const license = useLicense();
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const permissionsLoaded = !auth.isLoading;

  const accessibleNavItems = useMemo(() => appNavGroups.flatMap((group) => group.items).filter((item) => auth.can(item.permission) && (!('moduleKey' in item) || license.canUseModule(String(item.moduleKey)))), [auth, license]);
  const visibleGroups = useMemo(() => appNavGroups.map((group) => ({ ...group, items: group.items.filter((item) => accessibleNavItems.some((accessible) => accessible.id === item.id)) })).filter((group) => group.items.length > 0), [accessibleNavItems]);
  const primaryMobileItems = useMemo(() => getPrimaryMobileItems(role, accessibleNavItems), [role, accessibleNavItems]);
  const moreItems = useMemo(() => accessibleNavItems.filter((item) => !primaryMobileItems.some((primary) => primary.id === item.id)), [accessibleNavItems, primaryMobileItems]);
  const moreGroups = useMemo(() => appNavGroups.map((group) => ({ ...group, items: group.items.filter((item) => moreItems.some((more) => more.id === item.id)) })).filter((group) => group.items.length > 0), [moreItems]);
  const quickActions = quickActionsForRole(role, auth.can).filter((action) => !action.moduleKey || license.canUseModule(action.moduleKey));

  useEffect(() => { document.title = pageTitle(title, branding); }, [title, branding.companyDisplayName, branding.displayName, branding.companyName]);
  useEffect(() => { setMoreOpen(false); setSearchOpen(false); setNotificationsOpen(false); setQuickOpen(false); }, [router.path]);

  const onShellTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (!touchStart) return;
    const changed = event.changedTouches[0];
    const dx = changed.clientX - touchStart.x;
    const dy = changed.clientY - touchStart.y;
    setTouchStart(null);
    if (Math.abs(dy) > 90 && dy > 0 && Math.abs(dx) < 60 && window.scrollY < 8) {
      window.dispatchEvent(new CustomEvent('contractoros:mobile-refresh'));
      return;
    }
    if (Math.abs(dx) < 90 || Math.abs(dx) < Math.abs(dy)) return;
    if (isActivePath(router.path, '/dashboard')) {
      window.dispatchEvent(new CustomEvent('contractoros:dashboard-swipe', { detail: { direction: dx < 0 ? 'next' : 'previous' } }));
      return;
    }
    const currentIndex = primaryMobileItems.findIndex((item) => isActivePath(router.path, item.href));
    const fallbackIndex = Math.max(0, primaryMobileItems.findIndex((item) => item.href === '/dashboard' || item.href === '/portal'));
    const index = currentIndex >= 0 ? currentIndex : fallbackIndex;
    const next = dx < 0 ? primaryMobileItems[index + 1] : primaryMobileItems[index - 1];
    if (next) router.push(next.href);
  };

  return <div className="app-shell">
    <aside className="sidebar"><Link href="/" className="brand"><BrandLogo /><strong>{branding.displayName}</strong></Link>{visibleGroups.map((group) => <div className="sidebar-section" key={group.group}><p className="eyebrow">{group.group}</p>{group.items.map((item) => <NavLink key={item.id} href={item.href}><item.icon size={18}/>{item.label}</NavLink>)}</div>)}</aside>
    <section className="app-main" onTouchStart={(event) => setTouchStart({ x: event.touches[0].clientX, y: event.touches[0].clientY })} onTouchEnd={onShellTouchEnd}>
      <MobileAppHeader title={title} brandingName={branding.displayName} onSearch={() => setSearchOpen(true)} onNotifications={() => setNotificationsOpen(true)} onMore={() => setMoreOpen(true)} />
      <header className="app-top"><div className="app-title-lockup"><BrandLogo className="app-header-logo"/><div><p className="eyebrow">{branding.displayName} workspace</p><h1>{title}</h1></div></div><div className="topbar-actions"><ViewAsControl/><span className="pill">{auth.isViewAsActive ? `Viewing as ${auth.effectiveRole}` : (auth.realRole || auth.role || 'User')}</span><Link href="/account" className="button secondary small">Account</Link></div></header>
      {auth.isViewAsActive && <div className="view-as-banner"><div><strong>Owner Preview Mode: Viewing as {auth.effectiveRole}.</strong><span> Actions and navigation are filtered for preview. Your real session remains {auth.realRole}.</span></div><button className="button small" onClick={auth.clearViewAsRole}>Exit View As</button></div>}
      {!permissionsLoaded && <div className="card mobile-permission-loading"><strong>Loading navigation…</strong><span className="muted">Keeping dashboard access available while permissions load.</span></div>}
      {children}
    </section>
    <FloatingQuickActions actions={quickActions} open={quickOpen} setOpen={setQuickOpen}/>
    <MobileBottomNav items={primaryMobileItems} moreOpen={moreOpen} onMore={() => setMoreOpen(true)} loading={!permissionsLoaded}/>
    {moreOpen && <MobileMoreDrawer groups={moreGroups} allItems={accessibleNavItems} onClose={() => setMoreOpen(false)} />}
    {searchOpen && <MobileSearchDialog items={accessibleNavItems} onClose={() => setSearchOpen(false)} />}
    {notificationsOpen && <NotificationCenter onClose={() => setNotificationsOpen(false)} />}
  </div>;
}

function isActivePath(path: string, href: string) {
  const cleanPath = path.split('?')[0];
  return cleanPath === href || (href !== '/' && cleanPath.startsWith(`${href}/`)) || (href === '/jobs' && cleanPath.startsWith('/work-orders'));
}

function labelForRole(item: NavItem, role: string) {
  if (role === 'Client' && item.id === 'dashboard') return 'Portal';
  if (role === 'Technician' && item.id === 'jobs') return 'My Jobs';
  if (role === 'Vendor' && ['jobs', 'work-orders'].includes(item.id)) return 'Assigned Work';
  if (role === 'Technician' && item.id === 'work-orders') return 'Work Orders';
  return item.label.replace(' / Work Orders', '');
}

function getPrimaryMobileItems(role: string, accessibleNavItems: NavItem[]) {
  const preferences = role === 'Client'
    ? ['portal', 'requests', 'quotes', 'invoices']
    : role === 'Technician'
      ? ['dashboard', 'jobs', 'work-orders', 'messages']
      : role === 'Vendor'
        ? ['dashboard', 'work-orders', 'messages', 'account']
        : ['dashboard', 'requests', 'quotes', 'jobs'];
  const ranked = preferences.map((id) => accessibleNavItems.find((item) => item.id === id)).filter(Boolean) as NavItem[];
  const filled = [...ranked, ...accessibleNavItems.filter((item) => !ranked.some((rankedItem) => rankedItem.id === item.id))];
  return filled.slice(0, 4);
}

function MobileAppHeader({ title, brandingName, onSearch, onNotifications, onMore }: { title: string; brandingName: string; onSearch: () => void; onNotifications: () => void; onMore: () => void }) {
  return <header className="mobile-app-header"><Link href="/dashboard" className="mobile-brand"><BrandLogo/><span><strong>{brandingName}</strong><small>{title}</small></span></Link><div className="mobile-header-actions"><button type="button" aria-label="Search" onClick={onSearch}><Search size={19}/></button><button type="button" aria-label="Notifications" onClick={onNotifications}><Bell size={19}/></button><button type="button" aria-label="Open menu" onClick={onMore}><Menu size={20}/></button><Link href="/account" aria-label="Account" className="mobile-avatar"><UserRound size={19}/></Link></div></header>;
}

function MobileBottomNav({ items, moreOpen, onMore, loading }: { items: NavItem[]; moreOpen: boolean; onMore: () => void; loading: boolean }) {
  const { path } = useRouter();
  const auth = useAuth();
  const safeItems = items.length ? items : [{ id: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view', moduleKey: 'dashboard' } as NavItem];
  return <nav className="mobile-nav" aria-label="Mobile dashboard navigation">{safeItems.map((item) => <Link key={item.id} href={item.href} className={`mobile-nav-item ${isActivePath(path, item.href) ? 'active' : ''}`}><item.icon size={20}/><small>{labelForRole(item, auth.role)}</small></Link>)}<button type="button" className={`mobile-nav-item ${moreOpen ? 'active' : ''}`} onClick={onMore}><MoreHorizontal size={21}/><small>{loading ? 'Loading' : 'More'}</small></button></nav>;
}

function MobileMoreDrawer({ groups, allItems, onClose }: { groups: Array<{ group: string; items: NavItem[] }>; allItems: NavItem[]; onClose: () => void }) {
  const auth = useAuth();
  const [startY, setStartY] = useState<number | null>(null);
  const visibleGroups = groups.length ? groups : [{ group: 'Overview', items: allItems }];
  return <div className="mobile-more-drawer" role="dialog" aria-modal="true" aria-label="More navigation" onClick={onClose} onTouchStart={(event) => setStartY(event.touches[0].clientY)} onTouchEnd={(event) => { if (startY !== null && event.changedTouches[0].clientY - startY > 80) onClose(); setStartY(null); }}><div className="mobile-more-sheet" onClick={(event) => event.stopPropagation()}><div className="mobile-sheet-handle"/><div className="mobile-sheet-header"><div><p className="eyebrow">All accessible modules</p><h2>More</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close menu"><X size={20}/></button></div>{visibleGroups.map((group) => <section className="mobile-more-group" key={group.group}><h3>{group.group}</h3>{group.items.map((item) => item.id === 'logout' ? <button type="button" className="mobile-more-link" key={item.id} onClick={auth.signOutLocal}><item.icon size={18}/><span>{item.label}</span></button> : <Link key={item.id} href={item.href} className="mobile-more-link"><item.icon size={18}/><span>{labelForRole(item, auth.role)}</span></Link>)}</section>)}</div></div>;
}

function MobileSearchDialog({ items, onClose }: { items: NavItem[]; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const searchable = items.filter((item) => ['clients','requests','quotes','jobs','invoices','assets','properties','messages','payments'].includes(item.id));
  const results = searchable.filter((item) => `${item.label} ${item.id} ${(item.aliases || []).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="mobile-more-drawer mobile-search-dialog" role="dialog" aria-modal="true" aria-label="Global search"><div className="mobile-more-sheet"><div className="mobile-sheet-header"><div><p className="eyebrow">Global search</p><h2>Find records</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close search"><X size={20}/></button></div><input autoFocus placeholder="Search clients, requests, quotes, jobs, invoices, assets, properties, messages…" value={query} onChange={(event) => setQuery(event.target.value)}/><div className="mobile-search-results">{results.map((item) => <Link key={item.id} href={`${item.href}${query ? `?q=${encodeURIComponent(query)}` : ''}`} className="mobile-more-link"><item.icon size={18}/><span>{item.label}</span></Link>)}{query && results.length === 0 && <p className="muted">No matching accessible modules. Try a client name, request, quote, job, invoice, asset, property, or message keyword after opening its module.</p>}</div></div></div>;
}

function NotificationCenter({ onClose }: { onClose: () => void }) {
  const future = ['New requests', 'Quote approvals', 'Job assignments', 'Overdue invoices', 'New messages', 'Payments received'];
  return <div className="mobile-more-drawer" role="dialog" aria-modal="true" aria-label="Notifications"><div className="mobile-more-sheet"><div className="mobile-sheet-header"><div><p className="eyebrow">Notification center</p><h2>Alerts</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close notifications"><X size={20}/></button></div><p className="muted">Live notifications are ready for the next event feed. This center will surface:</p><div className="mobile-notification-list">{future.map((item) => <div className="card compact-card" key={item}><strong>{item}</strong><span className="muted">Future real-time alert placeholder</span></div>)}</div></div></div>;
}

function quickActionsForRole(role: string, can: (permission: PermissionSpec) => boolean) {
  if (role === 'Technician') return [
    { label: '+ Note', href: '/jobs', permission: 'work_orders.manage', moduleKey: 'work_orders' },
    { label: '+ Photo', href: '/media', permission: 'media.manage', moduleKey: 'basic_media' },
    { label: '+ Complete Job', href: '/jobs', permission: 'work_orders.manage', moduleKey: 'work_orders' },
  ].filter((action) => can(action.permission));
  if (role === 'Client') return [
    { label: '+ Request Estimate', href: '/request-estimate', permission: 'portal.view', moduleKey: 'client_portal' },
    { label: '+ Message', href: '/messages', permission: 'messages.manage', moduleKey: 'messages' },
  ].filter((action) => can(action.permission));
  return [
    { label: '+ Request', href: '/requests', permission: 'requests.manage', moduleKey: 'requests' },
    { label: '+ Quote', href: '/quotes', permission: 'quotes.manage', moduleKey: 'quotes' },
    { label: '+ Job', href: '/jobs', permission: 'jobs.manage', moduleKey: 'jobs' },
    { label: '+ Invoice', href: '/invoices', permission: 'invoices.manage', moduleKey: 'basic_invoices' },
  ].filter((action) => can(action.permission));
}

function FloatingQuickActions({ actions, open, setOpen }: { actions: Array<{ label: string; href: string }>; open: boolean; setOpen: (open: boolean) => void }) {
  if (!actions.length) return null;
  return <div className={`mobile-fab ${open ? 'open' : ''}`}><div className="mobile-fab-menu">{actions.map((action) => <Link key={action.label} href={action.href} className="button secondary small">{action.label}</Link>)}</div><button type="button" className="mobile-fab-button" aria-label="Quick actions" onClick={() => setOpen(!open)}><Plus size={22}/></button></div>;
}

export function Protected({ permission, children }: { permission: PermissionSpec; children: ReactNode }) {
  const auth = useAuth();
  if (!auth.can(permission)) return <AppLayout title="Access restricted"><div className="card"><h2>Permission required</h2><p>This page requires <code>{Array.isArray(permission) ? permission.join(' or ') : permission}</code>.</p></div></AppLayout>;
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
