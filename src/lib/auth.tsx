import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from '../components/Router';
import { useBranding, type BrandingSettings } from './branding';
import { permissionsForRole } from './permissions';
import type { AppUser } from '../types/domain';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';
type ApiRole = string | { id?: string; name?: string };
type MeResponse = { ok?: boolean; user?: (Omit<AppUser, 'role'> & { role?: ApiRole }); role?: ApiRole; permissions?: string[]; branding?: Partial<BrandingSettings> };
type AuthContextValue = {
  user: AppUser | null;
  role: string;
  permissions: string[];
  status: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string;
  refreshMe: () => Promise<AuthStatus>;
  signOutLocal: () => void;
  can: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValue>({ user: null, role: '', permissions: [], status: 'loading', isAuthenticated: false, isLoading: true, authError: '', refreshMe: async () => 'unauthenticated', signOutLocal: () => undefined, can: () => false });

function roleName(role?: ApiRole) {
  return typeof role === 'string' ? role : role?.name || '';
}

function normalizeMe(me?: Partial<MeResponse> | null): { user: AppUser; role: string; permissions: string[]; branding?: Partial<BrandingSettings> } | null {
  if (!me?.user) return null;
  const role = roleName(me.user.role) || roleName(me.role) || 'Client';
  return { user: { ...me.user, role }, role, permissions: me.permissions?.length ? me.permissions : permissionsForRole(role), branding: me.branding };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { push } = useRouter();
  const { updateBranding } = useBranding();
  const [me, setMe] = useState<ReturnType<typeof normalizeMe>>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [authError, setAuthError] = useState('');

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
      if (next.branding) updateBranding(next.branding);
      setStatus('authenticated');
      return 'authenticated';
    } catch (caught) {
      setMe(null);
      setAuthError(caught instanceof Error ? caught.message : 'Unable to check session.');
      setStatus('error');
      return 'error';
    }
  }, [updateBranding]);

  useEffect(() => { refreshMe().catch(() => setStatus('error')); }, [refreshMe]);

  const signOutLocal = useCallback(() => {
    setMe(null);
    setStatus('unauthenticated');
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
    push('/login');
  }, [push]);

  const value = useMemo<AuthContextValue>(() => ({
    user: me?.user ?? null,
    role: me?.role ?? '',
    permissions: me?.permissions ?? [],
    status,
    isAuthenticated: status === 'authenticated' && Boolean(me?.user),
    isLoading: status === 'loading',
    authError,
    refreshMe,
    signOutLocal,
    can: (permission: string) => Boolean(me?.permissions.includes(permission)),
  }), [authError, me, refreshMe, signOutLocal, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
export function isAllowedRedirect(redirect: string) { return redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/login') && !redirect.startsWith('/install') && !redirect.startsWith('/auth/magic') && !redirect.startsWith('/magic-link-sent'); }
