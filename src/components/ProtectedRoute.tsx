import { ReactNode, useEffect } from 'react';
import { useRouter } from './Router';
import { LoadingState } from './ui';
import { useAuth } from '../lib/auth';

export const publicRoutes = ['/', '/about', '/services', '/contact', '/request-estimate', '/request-estimate/thank-you', '/thank-you', '/login', '/magic-link-sent', '/auth/callback', '/logout'];
const protectedPrefixes = ['/dashboard', '/clients', '/properties', '/requests', '/quotes', '/jobs', '/work-orders', '/invoices', '/payments', '/cmms', '/messages', '/settings', '/account', '/admin', '/portal'];

export function isProtectedPath(path: string) {
  const pathname = path.split('?')[0];
  if (pathname.startsWith('/install')) return false;
  if (publicRoutes.includes(pathname)) return false;
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { path, push } = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated && isProtectedPath(path)) push(`/login?redirect=${encodeURIComponent(path.split('?')[0])}`);
  }, [auth.isAuthenticated, auth.isLoading, path, push]);

  if (auth.isLoading && isProtectedPath(path)) return <main className="install-loading"><div className="card"><LoadingState title="Checking secure session…" lines={2}/></div></main>;
  if (!auth.isAuthenticated && isProtectedPath(path)) return <main className="install-loading"><div className="card"><LoadingState title="Redirecting to secure login…" lines={2}/></div></main>;
  return <>{children}</>;
}
