import { useEffect, useMemo, useState } from 'react';
import { PublicLayout } from '../components/Layout';
import { Link, useRouter } from '../components/Router';
import { isAllowedRedirect, useAuth } from '../lib/auth';
import { pageTitle, useBranding } from '../lib/branding';
import { BrandMark } from '../components/ui';

function usePageTitle(title: string) {
  const branding = useBranding();
  useEffect(() => { document.title = pageTitle(title, branding); }, [title, branding.companyDisplayName, branding.displayName, branding.companyName]);
}

export function LoginPage() {
  usePageTitle('Login');
  const branding = useBranding();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const redirect = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
    return isAllowedRedirect(value) ? value : '/dashboard';
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        body: JSON.stringify({ email, redirect }),
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Unable to send magic link. Please try again.');
      setStatus('sent');
    } catch (caught) {
      setStatus('error');
      setError(caught instanceof Error ? caught.message : 'Unable to send magic link. Please try again.');
    }
  };

  return <PublicLayout><section className="section narrow auth-shell"><div className="auth-card"><div className="auth-brand"><BrandMark logoUrl={branding.logoUrl} name={branding.displayName}/><div><p className="eyebrow">Magic Link First</p><h1>Login to {branding.displayName}</h1></div></div><p>Enter your email address and we’ll send a secure, one-time login link. ContractorOS never creates a session until you click the link from your email.</p>{status === 'sent' ? <div className="success-panel"><h2>Check your email</h2><p>Check your email for a secure login link.</p><p className="muted">The link expires in 15 minutes and can only be used once.</p><button className="button secondary" type="button" onClick={() => setStatus('idle')}>Send another link</button></div> : <form className="form" onSubmit={submit}><label><span className="field-label">Email Address</span><input type="email" placeholder="you@example.com" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}/></label>{error && <p className="error-text">{error}</p>}<button className="button" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send Magic Link'}</button></form>}</div></section></PublicLayout>;
}

export function MagicLinkSentPage() { usePageTitle('Check your email'); return <PublicLayout><section className="section narrow"><h1>Check your email</h1><p>Check your email for a secure login link.</p><p>The link expires in 15 minutes and can only be used once.</p><Link href="/login" className="button secondary">Send New Link</Link></section></PublicLayout>; }

export function AuthMagicPage() {
  usePageTitle('Login Link');
  const auth = useAuth();
  const router = useRouter();
  const invalid = new URLSearchParams(window.location.search).has('invalid');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (invalid) return;
    if (params.get('token')) {
      window.location.replace(`/api/auth/magic${window.location.search}`);
      return;
    }
    auth.refreshMe().then(() => {
      const redirect = params.get('redirect');
      router.push(redirect && isAllowedRedirect(redirect) ? redirect : '/dashboard');
    }).catch(() => undefined);
  }, [auth, invalid, router]);

  if (!invalid) return <PublicLayout><section className="section narrow"><h1>Completing secure login…</h1><p>We are verifying your one-time magic link.</p></section></PublicLayout>;
  return <PublicLayout><section className="section narrow"><h1>This login link has expired or is invalid.</h1><p>Magic links expire after 15 minutes and can only be used once.</p><div className="button-row"><Link href="/login" className="button">Send New Link</Link><Link href="/" className="button secondary">Return Home</Link></div></section></PublicLayout>;
}

export function LogoutPage() { usePageTitle('Signed out'); const auth = useAuth(); useEffect(() => { auth.signOutLocal(); }, []); return <PublicLayout><section className="section narrow"><h1>Signed out</h1><p>Your session has been cleared.</p><Link href="/login" className="button">Sign in again</Link></section></PublicLayout>; }
export function AccountPage() { usePageTitle('Account'); const auth = useAuth(); return <PublicLayout><section className="section narrow"><p className="eyebrow">Account</p><h1>{auth.user?.name || 'Account'}</h1><p>ContractorOS uses secure HTTP-only session cookies after a one-time magic link is verified.</p><button className="button secondary" onClick={() => auth.signOutLocal()}>Logout</button></section></PublicLayout>; }
