import { ReactNode, useEffect } from 'react';
import { useRouter } from './Router';
import { LoadingState } from './ui';
import { useAuth } from '../lib/auth';

export const publicRoutes = ['/', '/about', '/services', '/contact', '/request-estimate', '/request-estimate/thank-you', '/thank-you', '/login', '/magic-link-sent', '/auth/magic', '/logout'];
const protectedPrefixes = ['/dashboard', '/clients', '/properties', '/requests', '/quotes', '/jobs', '/work-orders', '/invoices', '/payments', '/cmms', '/assets', '/messages', '/settings', '/account', '/admin', '/portal'];

export function isProtectedPath(path: string) {
  const pathname = path.split('?')[0];
  if (pathname.startsWith('/install')) return false;
  if (publicRoutes.includes(pathname)) return false;
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { path, push } = useRouter();
  const auth = useAuth();

  const protectedPath = isProtectedPath(path);

  useEffect(() => {
    if (auth.status === 'unauthenticated' && protectedPath) push(`/login?redirect=${encodeURIComponent(path)}`);
  }, [auth.status, path, protectedPath, push]);

  if (auth.isLoading && protectedPath) return <main className="install-loading"><div className="card"><LoadingState title="Checking secure session…" lines={2}/></div></main>;
  if (auth.status === 'error' && protectedPath) return <main className="install-loading"><div className="card"><h1>Unable to verify your session</h1><p>{auth.authError || 'Please retry once the connection is available.'}</p><button className="button" onClick={() => auth.refreshMe()}>Retry session check</button></div></main>;
  if (auth.status === 'unauthenticated' && protectedPath) return <main className="install-loading"><div className="card"><LoadingState title="Redirecting to secure login…" lines={2}/></div></main>;
  return <>{children}</>;
}
