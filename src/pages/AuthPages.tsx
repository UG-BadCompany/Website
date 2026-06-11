import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AppLayout, Protected, PublicLayout } from '../components/Layout';
import { Link, useRouter } from '../components/Router';
import { isAllowedRedirect, useAuth } from '../lib/auth';
import { pageTitle, useBranding } from '../lib/branding';
import { AuthCheckingState, BrandLogo, Badge, EmptyState, LoadingState } from '../components/ui';

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
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const redirect = useMemo(() => safeRedirectFromSearch(), []);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    router.push(isAllowedRedirect(redirect) ? redirect : '/dashboard');
  }, [auth.isAuthenticated, redirect, router]);

  const submit = async (event: FormEvent) => {
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

  if (auth.isLoading || auth.isAuthenticated) {
    return <PublicLayout><section className="section auth-shell"><div className="auth-card"><AuthCheckingState /></div></section></PublicLayout>;
  }

  return <PublicLayout><section className="section auth-shell"><div className="auth-card"><div className="auth-brand"><BrandLogo /><div className="auth-brand-copy"><p className="eyebrow">Secure sign in</p><strong>{branding.displayName}</strong></div></div><div className="auth-copy"><h1>Login to your account</h1><p>Enter your email and we’ll send a secure one-time login link for {branding.displayName}.</p>{auth.status === 'error' && <p className="error-text">We could not confirm an existing session, so you can request a new secure login link.</p>}</div>{status === 'sent' ? <div className="success-panel"><h2>Check your email</h2><p>Check your email for a secure login link to {branding.displayName}.</p><p className="muted">The link expires in 15 minutes and can only be used once.</p><button className="button secondary" type="button" onClick={() => setStatus('idle')}>Send another link</button></div> : <form className="form auth-form" onSubmit={submit}><label><span className="field-label">Email Address</span><input className="auth-input" type="email" placeholder="you@example.com" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}/></label>{error && <p className="error-text">{error}</p>}<button className="button auth-button" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send Magic Link'}</button></form>}</div></section></PublicLayout>;
}

export function MagicLinkSentPage() { usePageTitle('Check your email'); const branding = useBranding(); return <PublicLayout><section className="section auth-shell"><div className="auth-card"><div className="auth-brand"><BrandLogo /><div className="auth-brand-copy"><p className="eyebrow">Magic link sent</p><strong>{branding.displayName}</strong></div></div><div className="auth-copy"><h1>Check your email</h1><p>Check your email for a secure login link to {branding.displayName}.</p><p>The link expires in 15 minutes and can only be used once.</p></div><Link href="/login" className="button secondary">Send New Link</Link></div></section></PublicLayout>; }

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

  if (status === 'verifying') return <PublicLayout><section className="section auth-shell"><div className="auth-card"><AuthCheckingState title="Signing you in securely…" /></div></section></PublicLayout>;

  const title = status === 'missing-token' ? 'Login link is missing a token.' : 'This login link is expired or invalid.';
  return <PublicLayout><section className="section auth-shell"><div className="auth-card"><div className="auth-copy"><h1>{title}</h1><p>{status === 'missing-token' ? 'Please request a new secure login link.' : message || 'Magic links expire after 15 minutes and can only be used once.'}</p></div><div className="button-row"><Link href="/login" className="button">Send new login link</Link><Link href="/" className="button secondary">Return home</Link></div></div></section></PublicLayout>;
}

export function LogoutPage() { usePageTitle('Signed out'); const auth = useAuth(); useEffect(() => { auth.signOutLocal(); }, []); return <PublicLayout><section className="section narrow"><h1>Signed out</h1><p>Your session has been cleared.</p><Link href="/login" className="button">Sign in again</Link></section></PublicLayout>; }
export function AccountPage() {
  usePageTitle('Account');
  const auth = useAuth();
  const branding = useBranding();
  const [account, setAccount] = useState<any>(null);
  const [status, setStatus] = useState({ loading: true, error: '' });
  useEffect(() => {
    fetch('/api/account', { credentials: 'include', cache: 'no-store', headers: { accept: 'application/json' } })
      .then(async (response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'Unable to load account.'); return body.account; })
      .then((data) => { setAccount(data); setStatus({ loading: false, error: '' }); })
      .catch((caught) => setStatus({ loading: false, error: caught instanceof Error ? caught.message : 'Unable to load account.' }));
  }, []);
  return <Protected permission="account.view"><AppLayout title="Account"><section className="card account-panel"><p className="eyebrow">Account</p><h1>{account?.name || auth.user?.name || 'Account'}</h1><p>{branding.displayName} uses magic-link only authentication and secure HTTP-only session cookies.</p>{status.loading && <LoadingState title="Loading account" lines={2}/>} {status.error && <EmptyState title="Account unavailable" description={status.error}/>} {account && <><p><strong>Email:</strong> {account.email}</p><p><strong>Role:</strong> <Badge tone="accent">{account.role}</Badge></p><p className="muted">Permissions summary: {account.permissions?.length || 0} permission keys assigned. Editing other accounts requires users.manage or account.manage.</p><div className="permission-list compact">{(account.permissions || []).slice(0, 24).map((permission: string) => <Badge key={permission}>{permission}</Badge>)}</div></>}<button className="button secondary" onClick={() => { fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(() => auth.signOutLocal()); }}>Logout</button></section></AppLayout></Protected>;
}
