import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from '../components/Router';
import { useBranding, type BrandingSettings } from './branding';
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
  signOutLocal: () => void;
  can: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValue>({ user: null, role: '', permissions: [], isAuthenticated: false, isLoading: true, refreshMe: async () => undefined, signOutLocal: () => undefined, can: () => false });

function normalizeMe(me?: Partial<MeResponse> | null): MeResponse | null {
  if (!me?.user) return null;
  const role = me.role || me.user.role || 'Client';
  return { user: { ...me.user, role }, role, permissions: me.permissions?.length ? me.permissions : permissionsForRole(role), branding: me.branding };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { push } = useRouter();
  const branding = useBranding();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/me', { headers: { accept: 'application/json' }, cache: 'no-store', credentials: 'include' });
      if (!response.ok) throw new Error('Not authenticated');
      const next = normalizeMe(await response.json());
      setMe(next);
      if (next?.branding) branding.updateBranding(next.branding);
    } catch {
      setMe(null);
    } finally {
      setIsLoading(false);
    }
  }, [branding]);

  useEffect(() => { refreshMe().catch(() => setIsLoading(false)); }, [refreshMe]);

  const signOutLocal = useCallback(() => {
    setMe(null);
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
    push('/login');
  }, [push]);

  const value = useMemo<AuthContextValue>(() => ({
    user: me?.user ?? null,
    role: me?.role ?? '',
    permissions: me?.permissions ?? [],
    isAuthenticated: Boolean(me?.user),
    isLoading,
    refreshMe,
    signOutLocal,
    can: (permission: string) => Boolean(me?.permissions.includes(permission)),
  }), [isLoading, me, refreshMe, signOutLocal]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
export function isAllowedRedirect(redirect: string) { return redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/login') && !redirect.startsWith('/install') && !redirect.startsWith('/auth/magic') && !redirect.startsWith('/magic-link-sent'); }
