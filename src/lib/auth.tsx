import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from '../components/Router';
import { useBranding, type BrandingSettings } from './branding';
import { loadJson, saveJson } from './storage';
import { permissionsForRole } from './permissions';
import type { AppUser } from '../types/domain';

type MeResponse = { user: AppUser; role: string; permissions: string[]; branding?: Partial<BrandingSettings> };
type AuthContextValue = {
  user: AppUser | null;
  role: string;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshMe: () => Promise<void>;
  signInLocal: (redirect?: string) => void;
  signOutLocal: () => void;
  can: (permission: string) => boolean;
};

const LOCAL_SESSION_KEY = 'contractoros.session.user';
const DEFAULT_OWNER: AppUser = { id: 'local-owner', name: 'Owner', email: 'owner@example.com', role: 'Owner' };
const AuthContext = createContext<AuthContextValue>({ user: null, role: '', permissions: [], isAuthenticated: false, isLoading: true, refreshMe: async () => undefined, signInLocal: () => undefined, signOutLocal: () => undefined, can: () => false });

function normalizeMe(me?: Partial<MeResponse> | null): MeResponse | null {
  if (!me?.user) return null;
  const role = me.role || me.user.role || 'Client';
  return { user: { ...me.user, role }, role, permissions: me.permissions?.length ? me.permissions : permissionsForRole(role), branding: me.branding };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { push } = useRouter();
  const branding = useBranding();
  const [me, setMe] = useState<MeResponse | null>(() => normalizeMe(loadJson<MeResponse | null>(LOCAL_SESSION_KEY, null)));
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/me', { headers: { accept: 'application/json' }, cache: 'no-store', credentials: 'include' });
      if (!response.ok) throw new Error('Not authenticated');
      const next = normalizeMe(await response.json());
      setMe(next);
      if (next) saveJson(LOCAL_SESSION_KEY, next);
      if (next?.branding) branding.updateBranding(next.branding);
    } catch {
      const local = normalizeMe(loadJson<MeResponse | null>(LOCAL_SESSION_KEY, null));
      setMe(local);
    } finally {
      setIsLoading(false);
    }
  }, [branding]);

  useEffect(() => { refreshMe().catch(() => setIsLoading(false)); }, [refreshMe]);

  const signInLocal = useCallback((redirect?: string) => {
    const next = { user: DEFAULT_OWNER, role: DEFAULT_OWNER.role, permissions: permissionsForRole(DEFAULT_OWNER.role), branding: {} };
    saveJson(LOCAL_SESSION_KEY, next);
    setMe(next);
    push(redirect && isAllowedRedirect(redirect) ? redirect : '/dashboard');
  }, [push]);

  const signOutLocal = useCallback(() => {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    setMe(null);
    fetch('/api/auth/logout', { credentials: 'include' }).catch(() => undefined);
    push('/login');
  }, [push]);

  const value = useMemo<AuthContextValue>(() => ({
    user: me?.user ?? null,
    role: me?.role ?? '',
    permissions: me?.permissions ?? [],
    isAuthenticated: Boolean(me?.user),
    isLoading,
    refreshMe,
    signInLocal,
    signOutLocal,
    can: (permission: string) => Boolean(me?.permissions.includes(permission)),
  }), [isLoading, me, refreshMe, signInLocal, signOutLocal]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
export function isAllowedRedirect(redirect: string) { return redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/login') && !redirect.startsWith('/install'); }
