import { useEffect, useMemo, useState } from 'react';
import { PublicLayout } from '../components/Layout';
import { Link } from '../components/Router';
import { isAllowedRedirect, useAuth } from '../lib/auth';
import { pageTitle, useBranding } from '../lib/branding';

function usePageTitle(title: string) {
  const branding = useBranding();
  useEffect(() => { document.title = pageTitle(title, branding); }, [title, branding.companyDisplayName, branding.displayName, branding.companyName]);
}

export function LoginPage() {
  usePageTitle('Login');
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const redirect = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
    return isAllowedRedirect(value) ? value : '/dashboard';
  }, []);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    fetch('/api/auth/magic-link', { method: 'POST', body: JSON.stringify({ email }), headers: { 'content-type': 'application/json' } }).catch(() => undefined);
    auth.signInLocal(redirect);
  };
  return <PublicLayout><section className="section narrow"><p className="eyebrow">Magic link login</p><h1>Sign in securely</h1><p>Enter your email. The server stores hashed one-time tokens and sends links through Resend.</p><form className="form" onSubmit={submit}><input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}/><button className="button" type="submit">Send magic link</button></form></section></PublicLayout>;
}
export function MagicLinkSentPage() { usePageTitle('Check your email'); return <PublicLayout><section className="section narrow"><h1>Check your email</h1><p>If this address exists, a one-time magic link was sent.</p><Link href="/auth/callback" className="button">Simulate callback locally</Link></section></PublicLayout>; }
export function AuthCallbackPage() { usePageTitle('Signed in'); const auth = useAuth(); return <PublicLayout><section className="section narrow"><h1>Signed in</h1><p>Your secure session cookie would be issued by the auth callback in production.</p><button className="button" onClick={() => auth.signInLocal(new URLSearchParams(window.location.search).get('redirect') || '/dashboard')}>Continue to dashboard</button></section></PublicLayout>; }
export function LogoutPage() { usePageTitle('Signed out'); const auth = useAuth(); useEffect(() => { auth.signOutLocal(); }, []); return <PublicLayout><section className="section narrow"><h1>Signed out</h1><p>Your session has been cleared.</p><Link href="/login" className="button">Sign in again</Link></section></PublicLayout>; }
export function AccountPage() { usePageTitle('Account'); const auth = useAuth(); return <PublicLayout><section className="section narrow"><p className="eyebrow">Account</p><h1>{auth.user?.name || 'Account'}</h1><p>Login activity, sessions, profile, and logout are part of the Authentication Foundation.</p><button className="button secondary" onClick={() => auth.signOutLocal()}>Logout</button></section></PublicLayout>; }
