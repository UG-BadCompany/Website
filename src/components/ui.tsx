import { ReactNode } from 'react';
import { versionedAsset, useBranding } from '../lib/branding';

function initialsForBrand(name: string) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  return initials || 'CO';
}

export function BrandLogo({ logoUrl, name, className = '' }: { logoUrl?: string; name?: string; className?: string }) {
  const branding = useBranding();
  const displayName = name || branding.companyDisplayName || branding.companyName || branding.displayName || 'Company';
  const src = versionedAsset(logoUrl ?? branding.logoUrl, branding.brandingUpdatedAt);
  return src
    ? <img className={`brand-logo ${className}`.trim()} src={src} alt={`${displayName} logo`} />
    : <span className={`brand-fallback ${className}`.trim()} aria-label={`${displayName} logo fallback`}>{initialsForBrand(displayName)}</span>;
}

export function BrandMark({ logoUrl, name }: { logoUrl?: string; name: string }) {
  return <BrandLogo logoUrl={logoUrl} name={name} />;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="page-actions">{action}</div>}</div>;
}

export function SectionHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return <div className="section-header">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{description && <p>{description}</p>}</div>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <article className={`card ${className}`.trim()}>{children}</article>; }
export function Button({ children, variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) { return <button className={`button ${variant === 'primary' ? '' : variant} ${className}`.trim()} {...props}>{children}</button>; }
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent' }) { return <span className={`badge ${tone}`}>{children}</span>; }
export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized.includes('paid') || normalized.includes('approved') || normalized.includes('open') ? 'success' : normalized.includes('draft') || normalized.includes('pending') ? 'warning' : normalized.includes('overdue') ? 'danger' : 'accent';
  return <Badge tone={tone}>{status}</Badge>;
}
export function MetricCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) { return <Card className="metric-card"><span>{label}</span><strong>{value}</strong>{detail && <p>{detail}</p>}</Card>; }
export function ActionCard({ title, description, children }: { title: string; description: string; children?: ReactNode }) { return <Card className="action-card"><h3>{title}</h3><p>{description}</p>{children}</Card>; }
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <div className="empty-state"><div className="empty-icon">✦</div><h2>{title}</h2><p>{description}</p>{action}</div>; }
export function LoadingState({ title = 'Loading workspace', lines = 3 }: { title?: string; lines?: number }) { return <div className="loading-state"><div className="skeleton hero"/><h2>{title}</h2>{Array.from({ length: lines }).map((_, index) => <div className="skeleton" key={index}/>)}</div>; }
export function Skeleton({ className = '' }: { className?: string }) { return <div className={`skeleton ${className}`.trim()} />; }
export function CardSkeleton({ lines = 3 }: { lines?: number }) { return <div className="card card-skeleton"><Skeleton className="hero" />{Array.from({ length: lines }).map((_, index) => <Skeleton key={index} />)}</div>; }
export function PageSkeleton({ title = 'Loading page', cards = 2 }: { title?: string; cards?: number }) { return <div className="page-skeleton"><LoadingState title={title} lines={2}/><div className="grid cards">{Array.from({ length: cards }).map((_, index) => <CardSkeleton key={index} lines={2}/>)}</div></div>; }
export function AuthCheckingState({ title = 'Checking session…' }: { title?: string }) { return <div className="auth-checking"><Skeleton className="auth-mark"/><h1>{title}</h1><p>One moment while we verify your secure session.</p><Skeleton /><Skeleton /></div>; }
