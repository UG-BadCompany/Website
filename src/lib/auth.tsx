import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from '../components/Router';
import { useBranding, type BrandingSettings } from './branding';
import { hasPermission, permissionsForRole } from './permissions';
import type { AppUser } from '../types/domain';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';
type ApiRole = string | { id?: string; name?: string };
type MeResponse = { ok?: boolean; user?: (Omit<AppUser, 'role'> & { role?: ApiRole }); role?: ApiRole; permissions?: string[]; branding?: Partial<BrandingSettings> };
type ViewAsContext = { role: string | null; clientId: string | null; userId: string | null; permissions?: string[] };
const VIEW_AS_STORAGE_KEY = 'contractoros.viewAs';
type AuthContextValue = {
  user: AppUser | null;
  role: string;
  permissions: string[];
  realUser: AppUser | null;
  realRole: string;
  realPermissions: string[];
  effectiveRole: string;
  effectivePermissions: string[];
  effectiveClientId: string | null;
  effectiveUserId: string | null;
  viewAsRole: string | null;
  isViewAsActive: boolean;
  setViewAsRole: (roleName: string, context?: { clientId?: string | null; userId?: string | null; permissions?: string[] }) => void;
  clearViewAsRole: () => void;
  status: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string;
  refreshMe: () => Promise<AuthStatus>;
  signOutLocal: () => void;
  can: (permission: string | string[]) => boolean;
};

const AuthContext = createContext<AuthContextValue>({ user: null, role: '', permissions: [], realUser: null, realRole: '', realPermissions: [], effectiveRole: '', effectivePermissions: [], effectiveClientId: null, effectiveUserId: null, viewAsRole: null, isViewAsActive: false, setViewAsRole: () => undefined, clearViewAsRole: () => undefined, status: 'loading', isAuthenticated: false, isLoading: true, authError: '', refreshMe: async () => 'unauthenticated', signOutLocal: () => undefined, can: () => false });

function roleName(role?: ApiRole) {
  return typeof role === 'string' ? role : role?.name || '';
}

function normalizeMe(me?: Partial<MeResponse> | null): { user: AppUser; role: string; permissions: string[]; branding?: Partial<BrandingSettings> } | null {
  if (!me?.user) return null;
  const role = roleName(me.user.role) || roleName(me.role) || 'Client';
  const permissions = me.permissions?.length ? me.permissions : permissionsForRole(role);
  const normalizedPermissions = role.toLowerCase() === 'owner' && !permissions.includes('*') ? ['*', ...permissions] : permissions;
  return { user: { ...me.user, role, permissions: normalizedPermissions }, role, permissions: normalizedPermissions, branding: me.branding };
}

function readStoredViewAs(): ViewAsContext {
  if (typeof sessionStorage === 'undefined') return { role: null, clientId: null, userId: null };
  try {
    const parsed = JSON.parse(sessionStorage.getItem(VIEW_AS_STORAGE_KEY) || '{}') as Partial<ViewAsContext>;
    return { role: parsed.role || null, clientId: parsed.clientId || null, userId: parsed.userId || null, permissions: Array.isArray(parsed.permissions) ? parsed.permissions : undefined };
  } catch {
    return { role: null, clientId: null, userId: null };
  }
}

function storeViewAs(context: ViewAsContext) {
  if (typeof sessionStorage === 'undefined') return;
  if (!context.role) sessionStorage.removeItem(VIEW_AS_STORAGE_KEY);
  else sessionStorage.setItem(VIEW_AS_STORAGE_KEY, JSON.stringify(context));
}

function auditViewAs(event: string, metadata: Record<string, unknown>) {
  fetch('/api/audit', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ event, metadata }) }).catch(() => undefined);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { push } = useRouter();
  const { updateBranding } = useBranding();
  const [me, setMe] = useState<ReturnType<typeof normalizeMe>>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [authError, setAuthError] = useState('');
  const [viewAs, setViewAs] = useState<ViewAsContext>(() => readStoredViewAs());

  const refreshMe = useCallback(async (): Promise<AuthStatus> => {
    setStatus('loading');
    setAuthError('');
    try {
      const response = await fetch('/api/auth/me', { headers: { accept: 'application/json' }, cache: 'no-store', credentials: 'include' });
      if (response.status === 401) {
        setMe(null);
        setStatus('unauthenticated');
        return 'unauthenticated';
      }
      if (!response.ok) throw new Error(`Session check failed with HTTP ${response.status}`);
      const next = normalizeMe(await response.json());
      if (!next) {
        setMe(null);
        setStatus('unauthenticated');
        return 'unauthenticated';
      }
      setMe(next);
      if (!(next.role.toLowerCase() === 'owner' || next.permissions.includes('*'))) {
        setViewAs({ role: null, clientId: null, userId: null });
        storeViewAs({ role: null, clientId: null, userId: null });
      }
      if (next.branding) updateBranding(next.branding);
      setStatus('authenticated');
      return 'authenticated';
    } catch (caught) {
      setAuthError(caught instanceof Error ? caught.message : 'Unable to check session.');
      setStatus((current) => current === 'authenticated' ? 'authenticated' : 'error');
      return 'error';
    }
  }, [updateBranding]);

  useEffect(() => { refreshMe().catch(() => setStatus('error')); }, [refreshMe]);

  const clearViewAsRole = useCallback(() => {
    const previous = readStoredViewAs();
    setViewAs({ role: null, clientId: null, userId: null });
    storeViewAs({ role: null, clientId: null, userId: null });
    if (previous.role) auditViewAs('owner exited View As mode', { previousRole: previous.role, clientId: previous.clientId, userId: previous.userId });
  }, []);

  const setViewAsRole = useCallback((roleName: string, context: { clientId?: string | null; userId?: string | null; permissions?: string[] } = {}) => {
    const next = { role: roleName || null, clientId: context.clientId || null, userId: context.userId || null, permissions: Array.isArray(context.permissions) ? context.permissions : undefined };
    setViewAs(next);
    storeViewAs(next);
    if (next.role) auditViewAs('owner entered View As mode', { role: next.role, clientId: next.clientId, userId: next.userId });
  }, []);

  const signOutLocal = useCallback(() => {
    clearViewAsRole();
    setMe(null);
    setStatus('unauthenticated');
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
    push('/login');
  }, [clearViewAsRole, push]);

  const value = useMemo<AuthContextValue>(() => {
    const realRole = me?.role ?? '';
    const realPermissions = me?.permissions ?? [];
    const mayPreview = realRole.toLowerCase() === 'owner' || realPermissions.includes('*');
    const isViewAsActive = Boolean(mayPreview && viewAs.role && viewAs.role !== realRole);
    const effectiveRole = isViewAsActive ? viewAs.role! : realRole;
    const effectivePermissions = isViewAsActive ? (viewAs.permissions?.length ? viewAs.permissions : permissionsForRole(effectiveRole)) : realPermissions;
    const effectiveUser = me?.user ? { ...me.user, role: effectiveRole, permissions: effectivePermissions } : null;
    return {
      user: effectiveUser,
      role: effectiveRole,
      permissions: effectivePermissions,
      realUser: me?.user ?? null,
      realRole,
      realPermissions,
      effectiveRole,
      effectivePermissions,
      effectiveClientId: isViewAsActive ? viewAs.clientId : null,
      effectiveUserId: isViewAsActive ? viewAs.userId : me?.user?.id ?? null,
      viewAsRole: isViewAsActive ? viewAs.role : null,
      isViewAsActive,
      setViewAsRole,
      clearViewAsRole,
      status,
      isAuthenticated: status === 'authenticated' && Boolean(me?.user),
      isLoading: status === 'loading',
      authError,
      refreshMe,
      signOutLocal,
      can: (permission: string | string[]) => Array.isArray(permission) ? permission.some((entry) => hasPermission(effectiveUser, entry)) : hasPermission(effectiveUser, permission),
    };
  }, [authError, clearViewAsRole, me, refreshMe, setViewAsRole, signOutLocal, status, viewAs]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
export function isAllowedRedirect(redirect: string) { return redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/login') && !redirect.startsWith('/install') && !redirect.startsWith('/auth/magic') && !redirect.startsWith('/magic-link-sent'); }
