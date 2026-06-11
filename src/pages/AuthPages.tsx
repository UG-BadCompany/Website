import { useEffect, useMemo, useState } from 'react';
import { PublicLayout } from '../components/Layout';
import { Link, useRouter } from '../components/Router';
import { isAllowedRedirect, useAuth } from '../lib/auth';
import { pageTitle, useBranding } from '../lib/branding';
import { BrandMark } from '../components/ui';

type MagicStatus = 'verifying' | 'missing-token' | 'invalid' | 'error';

function usePageTitle(title: string) {
  const branding = useBranding();
  useEffect(() => { document.title = pageTitle(title, branding); }, [title, branding.companyDisplayName, branding.displayName, branding.companyName]);
}

function safeRedirectFromSearch(defaultRedirect = '/dashboard') {
  const value = new URLSearchParams(window.location.search).get('redirect') || defaultRedirect;
  return isAllowedRedirect(value) ? value : defaultRedirect;
}

export function LoginPage() {
  usePageTitle('Login');
  const branding = useBranding();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const redirect = useMemo(() => safeRedirectFromSearch(), []);

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

  return <PublicLayout><section className="section narrow auth-shell"><div className="auth-card"><div className="auth-brand"><BrandMark logoUrl={branding.logoUrl} name={branding.displayName}/><div><p className="eyebrow">Magic Link First</p><h1>Login to {branding.displayName}</h1></div></div><p>Enter your email address and we’ll send a secure, one-time login link. A session is created only after you click the link from your email.</p>{status === 'sent' ? <div className="success-panel"><h2>Check your email</h2><p>Check your email for a secure login link to {branding.displayName}.</p><p className="muted">The link expires in 15 minutes and can only be used once.</p><button className="button secondary" type="button" onClick={() => setStatus('idle')}>Send another link</button></div> : <form className="form" onSubmit={submit}><label><span className="field-label">Email Address</span><input type="email" placeholder="you@example.com" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}/></label>{error && <p className="error-text">{error}</p>}<button className="button" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send Magic Link'}</button></form>}</div></section></PublicLayout>;
}

export function MagicLinkSentPage() { usePageTitle('Check your email'); const branding = useBranding(); return <PublicLayout><section className="section narrow"><h1>Check your email</h1><p>Check your email for a secure login link to {branding.displayName}.</p><p>The link expires in 15 minutes and can only be used once.</p><Link href="/login" className="button secondary">Send New Link</Link></section></PublicLayout>; }

export function AuthMagicPage() {
  usePageTitle('Login Link');
  const auth = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<MagicStatus>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || '';
    const requestedRedirect = params.get('redirect') || '/dashboard';

    if (!token) {
      setStatus('missing-token');
      return () => { active = false; };
    }

    fetch('/api/auth/verify-magic-link', {
      method: 'POST',
      body: JSON.stringify({ token, redirect: requestedRedirect }),
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body?.ok === false) throw new Error(body?.error || 'This login link is expired or invalid.');
        return body as { ok: true; redirectTo?: string };
      })
      .then(async (body) => {
        if (!active) return;
        await auth.refreshMe();
        const redirectTo = body.redirectTo && isAllowedRedirect(body.redirectTo) ? body.redirectTo : (isAllowedRedirect(requestedRedirect) ? requestedRedirect : '/dashboard');
        router.push(redirectTo);
      })
      .catch((caught) => {
        if (!active) return;
        setMessage(caught instanceof Error ? caught.message : 'This login link is expired or invalid.');
        setStatus('invalid');
      });

    return () => { active = false; };
  }, []);

  if (status === 'verifying') return <PublicLayout><section className="section narrow"><h1>Signing you in securely…</h1><p>We are verifying your one-time magic link.</p></section></PublicLayout>;

  const title = status === 'missing-token' ? 'Login link is missing a token.' : 'This login link is expired or invalid.';
  return <PublicLayout><section className="section narrow"><h1>{title}</h1><p>{status === 'missing-token' ? 'Please request a new secure login link.' : message || 'Magic links expire after 15 minutes and can only be used once.'}</p><div className="button-row"><Link href="/login" className="button">Send new login link</Link><Link href="/" className="button secondary">Return home</Link></div></section></PublicLayout>;
}

export function LogoutPage() { usePageTitle('Signed out'); const auth = useAuth(); useEffect(() => { auth.signOutLocal(); }, []); return <PublicLayout><section className="section narrow"><h1>Signed out</h1><p>Your session has been cleared.</p><Link href="/login" className="button">Sign in again</Link></section></PublicLayout>; }
export function AccountPage() { usePageTitle('Account'); const auth = useAuth(); const branding = useBranding(); return <PublicLayout><section className="section narrow"><p className="eyebrow">Account</p><h1>{auth.user?.name || 'Account'}</h1><p>{branding.displayName} uses secure HTTP-only session cookies after a one-time magic link is verified.</p><button className="button secondary" onClick={() => auth.signOutLocal()}>Logout</button></section></PublicLayout>; }
