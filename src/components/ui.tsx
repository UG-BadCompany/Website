import { ReactNode } from 'react';
import { versionedAsset, useBranding } from '../lib/branding';

export function BrandMark({ logoUrl, name }: { logoUrl?: string; name: string }) {
  const branding = useBranding();
  const src = versionedAsset(logoUrl, branding.brandingUpdatedAt);
  return src ? <img className="brand-logo" src={src} alt={`${name} logo`} /> : <span className="brand-fallback" aria-hidden="true">⌂</span>;
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
