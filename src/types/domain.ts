export type ThemeMode = 'light' | 'dark' | 'system' | 'preset' | 'custom';
export type HostingProvider = 'netlify' | 'vercel' | 'docker' | 'vps' | 'custom';
export type DatabaseProvider = 'netlify_database' | 'postgres_url' | 'supabase_postgres';
export type PaymentProvider = 'square' | 'stripe' | 'paypal' | 'authorize_net' | 'manual' | 'configure_later';

export interface Permission { key: string; label: string; group: string }
export interface Role { name: string; permissions: string[] }
export interface AppUser { id: string; name: string; email: string; role: string; permissions?: string[] }
export interface DashboardWidget { id: string; title: string; type: string; x: number; y: number; w: number; h: number }
export interface PageSection { id: string; type: string; title: string; body: string; cta?: string }
export interface WorkRequest { id: string; client: string; service: string; status: string; priority: string; createdAt: string }
export interface Quote { id: string; client: string; requestId: string; status: string; total: number }
export interface Job { id: string; client: string; quoteId: string; status: string; technician: string }
export interface Invoice { id: string; client: string; jobId: string; status: string; balance: number }
export interface MessageThread { id: string; subject: string; participants: string[]; visibility: 'client' | 'internal' | 'technician'; updatedAt: string }
