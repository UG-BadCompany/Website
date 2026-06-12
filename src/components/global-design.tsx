import type { ReactNode } from 'react';
import { Link } from './Router';
import { BrandLogo } from './ui';
import { useBranding } from '../lib/branding';

export function GlobalPageBackground({ children, className = '' }: { children: ReactNode; className?: string }) { return <div className={`global-page-background ${className}`.trim()}>{children}</div>; }
export function GlobalCard({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`global-card ${className}`.trim()}>{children}</section>; }
export function GlobalButton({ children, variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' }) { return <button className={`global-button ${variant} ${className}`.trim()} {...props}>{children}</button>; }
export function GlobalInput(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={`global-input ${props.className || ''}`.trim()} />; }
export function GlobalHeader({ children }: { children?: ReactNode }) { const branding = useBranding(); return <header className="global-header"><Link href="/" className="brand"><BrandLogo/><strong>{branding.displayName}</strong></Link>{children}</header>; }
export function GlobalPublicNav() { return <nav className="global-public-nav"><Link href="/services">Services</Link><Link href="/request-estimate">Request Estimate</Link><Link href="/login">Login</Link></nav>; }
export function GlobalAuthLayout({ children }: { children: ReactNode }) { return <GlobalPageBackground className="global-auth-layout"><GlobalHeader><GlobalPublicNav/></GlobalHeader>{children}</GlobalPageBackground>; }
export function GlobalAppShell({ children }: { children: ReactNode }) { return <GlobalPageBackground className="global-app-shell">{children}</GlobalPageBackground>; }
export function GlobalTopbar({ children }: { children: ReactNode }) { return <div className="global-topbar">{children}</div>; }
export function GlobalSidebar({ children }: { children: ReactNode }) { return <aside className="global-sidebar">{children}</aside>; }
export function GlobalMobileNav({ children }: { children: ReactNode }) { return <nav className="global-mobile-nav">{children}</nav>; }
