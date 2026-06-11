import { auditLog, hasPermission, type AuthUser, HttpError } from './auth';
import { createDatabase, type Queryable } from './database';
import { getPublicSiteSettings, runMigrations } from './installation';
import { createStorage } from './storage';

type DraftPayload = { sections?: unknown[]; globalStyles?: Record<string, unknown>; seo?: Record<string, unknown> };
const defaultGlobalStyles = { maxPageWidth: 1180, sectionSpacingDefault: 88, buttonStyle: 'pill', cardRadius: 24, background: '#f6f3ee', fontStyle: 'Inter/System', header: { heroUnderHeader: true, transparentHeader: false, stickyEstimateCta: true }, footer: { showContactInfo: true, showServiceArea: true, showBusinessHours: true } };
const defaultSeo = { title: 'Contractor Services', description: 'Request service from a trusted local contractor.', socialTitle: 'Contractor Services', socialDescription: 'Fast estimates, expert work, and clear communication.' };
const sectionTypes = ['hero','services-grid','service-detail-cards','about','why-choose-us','trust-badges','before-after-gallery','testimonials','faq','call-to-action','contact-block','service-area','emergency-banner','financing-banner','process-steps','stats-numbers','team-owner-intro','featured-projects','logo-brand-strip','custom-rich-text','custom-image-text','request-estimate-form'];
const json = (value: unknown) => JSON.stringify(value ?? null);

export async function ensureHomepageFoundation(db: Queryable = createDatabase()) {
  await runMigrations(db);
  await db.query(`CREATE TABLE IF NOT EXISTS homepage_pages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL DEFAULT 'home', title text NOT NULL DEFAULT 'Homepage', status text NOT NULL DEFAULT 'draft', draft_version_id uuid NULL, published_version_id uuid NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())`);
  await db.query(`CREATE TABLE IF NOT EXISTS homepage_versions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), page_id uuid REFERENCES homepage_pages(id) ON DELETE CASCADE, status text NOT NULL CHECK (status in ('draft','published','archived')), name text, sections jsonb NOT NULL DEFAULT '[]'::jsonb, global_styles jsonb NOT NULL DEFAULT '{}'::jsonb, seo jsonb NOT NULL DEFAULT '{}'::jsonb, created_by uuid NULL REFERENCES users(id), created_at timestamptz DEFAULT now(), published_at timestamptz NULL)`);
  await db.query(`CREATE TABLE IF NOT EXISTS homepage_assets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), page_id uuid REFERENCES homepage_pages(id) ON DELETE CASCADE, version_id uuid REFERENCES homepage_versions(id) ON DELETE CASCADE, media_id uuid REFERENCES media_assets(id), usage_type text, created_at timestamptz DEFAULT now())`);
  await db.query(`INSERT INTO homepage_pages (slug, title, status) VALUES ('home', 'Homepage', 'draft') ON CONFLICT (slug) DO NOTHING`);
  await db.query(`INSERT INTO permissions (key, group_name, description) VALUES ('homepage.view','homepage','View homepage builder'),('homepage.manage','homepage','Manage homepage builder') ON CONFLICT (key) DO UPDATE SET group_name=excluded.group_name, description=excluded.description`);
  await db.query(`insert into role_permissions (role_id, permission_id) select r.id, p.id from roles r join permissions p on p.key in ('homepage.view','homepage.manage') where r.name in ('Owner','Admin') on conflict do nothing`);
}

function requireView(user: AuthUser) { if (!hasPermission(user, 'homepage.view')) throw new HttpError(403, 'Missing permission homepage.view'); }
function requireManage(user: AuthUser) { if (!hasPermission(user, 'homepage.manage')) throw new HttpError(403, 'Missing permission homepage.manage'); }
function normalizeDraft(input: DraftPayload = {}) {
  return { sections: normalizeSections(input.sections), globalStyles: { ...defaultGlobalStyles, ...(input.globalStyles || {}) }, seo: { ...defaultSeo, ...(input.seo || {}) } };
}
function normalizeSections(input: unknown[] = []) {
  const now = new Date().toISOString();
  return Array.isArray(input) ? input.map((raw: any, index) => ({ id: String(raw?.id || crypto.randomUUID()), type: sectionTypes.includes(raw?.type) ? raw.type : 'custom-rich-text', title: String(raw?.title || raw?.type || 'Homepage section'), enabled: raw?.enabled !== false, order: Number.isFinite(Number(raw?.order)) ? Number(raw.order) : index, content: raw?.content && typeof raw.content === 'object' ? raw.content : {}, styles: raw?.styles && typeof raw.styles === 'object' ? raw.styles : {}, visibility: { desktop: true, tablet: true, mobile: true, public: true, ...(raw?.visibility || {}) }, advanced: raw?.advanced && typeof raw.advanced === 'object' ? raw.advanced : {}, createdAt: String(raw?.createdAt || now), updatedAt: now })).sort((a, b) => a.order - b.order).map((s, order) => ({ ...s, order })) : [];
}
async function page(db: Queryable) { const result = await db.query<any>(`select id::text, slug, title, status, draft_version_id::text as "draftVersionId", published_version_id::text as "publishedVersionId", created_at::text as "createdAt", updated_at::text as "updatedAt" from homepage_pages where slug='home' limit 1`); return result.rows[0]; }
async function versionByStatus(db: Queryable, status: 'draft' | 'published') { const result = await db.query<any>(`select id::text, page_id::text as "pageId", status, name, sections, global_styles as "globalStyles", seo, created_by::text as "createdBy", created_at::text as "createdAt", published_at::text as "publishedAt" from homepage_versions where page_id=(select id from homepage_pages where slug='home') and status=$1 order by ${status === 'published' ? 'published_at' : 'created_at'} desc nulls last limit 1`, [status]); return result.rows[0] || null; }
async function versions(db: Queryable) { const result = await db.query<any>(`select id::text, page_id::text as "pageId", status, name, sections, global_styles as "globalStyles", seo, created_by::text as "createdBy", created_at::text as "createdAt", published_at::text as "publishedAt" from homepage_versions where page_id=(select id from homepage_pages where slug='home') order by created_at desc limit 30`); return result.rows.map((row) => ({ ...row, sections: Array.isArray(row.sections) ? row.sections : [], globalStyles: row.globalStyles || defaultGlobalStyles, seo: row.seo || defaultSeo })); }
async function response(db: Queryable) { const p = await page(db); const draftVersion = await versionByStatus(db, 'draft'); const publishedVersion = await versionByStatus(db, 'published'); return { ok: true, page: p || {}, draft: normalizeDraft(draftVersion || {}), published: publishedVersion ? normalizeDraft(publishedVersion) : null, versions: await versions(db) }; }
function validate(draft: ReturnType<typeof normalizeDraft>) { const critical: string[] = []; if (!draft.sections.some((s: any) => s.enabled && s.visibility?.public)) critical.push('Publish requires at least one enabled public section.'); const hero = draft.sections.find((s: any) => s.type === 'hero' && s.enabled); if (hero && !hero.content?.heading && !hero.content?.image?.url && !hero.styles?.backgroundImage?.url) critical.push('Hero sections need a heading or image.'); for (const section of draft.sections as any[]) for (const button of section.content?.buttons || []) if (button.label && !button.href) critical.push(`${section.title}: button ${button.label} needs a link.`); return critical; }

export async function getHomepageBuilder(user: AuthUser, db: Queryable = createDatabase()) { requireView(user); await ensureHomepageFoundation(db); return response(db); }
export async function saveHomepageDraft(body: DraftPayload, user: AuthUser, db: Queryable = createDatabase()) { requireManage(user); await ensureHomepageFoundation(db); const draft = normalizeDraft(body); const p = await page(db); await db.query(`update homepage_versions set status='archived' where page_id=$1 and status='draft'`, [p.id]); const result = await db.query<{ id: string }>(`insert into homepage_versions (page_id, status, name, sections, global_styles, seo, created_by) values ($1,'draft',$2,$3::jsonb,$4::jsonb,$5::jsonb,$6) returning id`, [p.id, `Draft ${new Date().toLocaleString()}`, json(draft.sections), json(draft.globalStyles), json(draft.seo), user.id]); await db.query(`update homepage_pages set status='draft', draft_version_id=$2, updated_at=now() where id=$1`, [p.id, result.rows[0].id]); await auditLog('homepage draft saved', { versionId: result.rows[0].id }, user.id, db).catch(() => undefined); return response(db); }
export async function publishHomepage(body: DraftPayload, user: AuthUser, db: Queryable = createDatabase()) { requireManage(user); await ensureHomepageFoundation(db); const draft = normalizeDraft(body); const critical = validate(draft); if (critical.length) throw new HttpError(400, `Cannot publish homepage: ${critical.join(' ')}`); const p = await page(db); const result = await db.query<{ id: string }>(`insert into homepage_versions (page_id, status, name, sections, global_styles, seo, created_by, published_at) values ($1,'published',$2,$3::jsonb,$4::jsonb,$5::jsonb,$6,now()) returning id`, [p.id, `Published ${new Date().toLocaleString()}`, json(draft.sections), json(draft.globalStyles), json(draft.seo), user.id]); await db.query(`update homepage_pages set status='published', published_version_id=$2, updated_at=now() where id=$1`, [p.id, result.rows[0].id]); await auditLog('homepage published', { versionId: result.rows[0].id }, user.id, db).catch(() => undefined); return response(db); }
export async function revertHomepage(user: AuthUser, db: Queryable = createDatabase()) { requireManage(user); await ensureHomepageFoundation(db); const published = await versionByStatus(db, 'published'); if (!published) throw new HttpError(404, 'No published homepage to revert to'); return saveHomepageDraft(published, user, db); }
export async function restoreHomepageVersion(id: string, user: AuthUser, db: Queryable = createDatabase()) { requireManage(user); await ensureHomepageFoundation(db); const found = (await db.query<any>(`select sections, global_styles as "globalStyles", seo from homepage_versions where id::text=$1`, [id])).rows[0]; if (!found) throw new HttpError(404, 'Version not found'); return saveHomepageDraft(found, user, db); }
export async function listHomepageVersions(user: AuthUser, db: Queryable = createDatabase()) { requireView(user); await ensureHomepageFoundation(db); return { ok: true, versions: await versions(db) }; }
export async function getPublicHomepage(db: Queryable = createDatabase()) { await ensureHomepageFoundation(db); const published = await versionByStatus(db, 'published'); return { ok: true, published: published ? normalizeDraft(published) : null, fallback: (await getPublicSiteSettings(db)).homepage } }
export async function homepageTemplates() { return { ok: true, templates: ['Contractor Classic','Modern Service Company','Premium Dark','Arizona Copper','Clean Light','Emergency Service','Commercial Maintenance','Minimal One Page'] }; }
export async function homepageSectionLibrary() { return { ok: true, sectionTypes }; }


function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return { mimeType: 'application/octet-stream', buffer: Buffer.from(dataUrl, 'base64') };
  return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
}
export async function uploadHomepageMedia(body: Record<string, unknown>, user: AuthUser, db: Queryable = createDatabase()) {
  if (!hasPermission(user, 'media.manage') && !hasPermission(user, 'homepage.manage')) throw new HttpError(403, 'Missing permission media.manage');
  await ensureHomepageFoundation(db);
  const parsed = parseDataUrl(String(body.dataUrl || ''));
  const fileName = String(body.fileName || 'homepage-upload.bin').replace(/[^a-z0-9._-]/gi, '-');
  if (!parsed.buffer.byteLength) throw new HttpError(400, 'Uploaded file is empty');
  const storageKey = `homepage/${Date.now()}-${fileName}`;
  const storedPath = await createStorage().put(storageKey, parsed.buffer);
  const file = await db.query<{ id: string }>(`insert into files (storage_provider, storage_key, file_name, mime_type, size_bytes) values ($1,$2,$3,$4,$5) returning id`, [process.env.STORAGE_PROVIDER || (process.env.NETLIFY ? 'netlify_blobs' : 'local'), storedPath, fileName, String(body.mimeType || parsed.mimeType), parsed.buffer.byteLength]);
  const media = await db.query<{ id: string }>(`insert into media_assets (file_id, owner_type, visibility, alt_text, metadata) values ($1,'homepage',$2,$3,$4::jsonb) returning id`, [file.rows[0].id, body.visibility === 'private' ? 'private' : 'public', String(body.altText || fileName), JSON.stringify({ storageKey })]);
  return { ok: true, media: { id: media.rows[0].id, fileName, url: `/api/media/${media.rows[0].id}`, visibility: body.visibility === 'private' ? 'private' : 'public', altText: String(body.altText || fileName) } };
}
export async function listHomepageMedia(query: Record<string, string | undefined> = {}, user: AuthUser, db: Queryable = createDatabase()) {
  if (!hasPermission(user, 'media.view') && !hasPermission(user, 'homepage.view')) throw new HttpError(403, 'Missing permission media.view');
  await ensureHomepageFoundation(db);
  const visibility = query.visibility === 'public' || query.visibility === 'private' ? query.visibility : '';
  const rows = await db.query<any>(`select m.id::text, f.file_name as "fileName", f.mime_type as "mimeType", f.size_bytes as "sizeBytes", m.visibility, m.alt_text as "altText", m.created_at::text as "createdAt" from media_assets m left join files f on f.id=m.file_id where ($1='' or m.visibility=$1) and coalesce(m.archived_at, now() + interval '1 day') > now() order by m.created_at desc limit 100`, [visibility]).catch(() => ({ rows: [] } as any));
  return { ok: true, media: rows.rows.map((r: any) => ({ ...r, url: r.visibility === 'public' ? `/api/media/${r.id}` : '' })) };
}
