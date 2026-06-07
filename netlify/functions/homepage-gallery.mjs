import { getPermissionKeysForRoles, getSessionToken, hashToken, json, loadDatabase, loadRolePermissionKeys, parseJsonBody, clean } from './auth-utils.mjs';
import { ensureHomepageTables } from './homepage-settings.mjs';

const SERVICE_CATEGORIES = ['HVAC','Water Heaters','Plumbing','Electrical','Drywall','Painting','Doors','Windows','Appliances','Handyman','Facilities Maintenance','Property Maintenance','Commercial Maintenance','General Contracting','Tenant Improvements','Other / Not Sure'];
const ensureGalleryTable = async (db) => {
  await ensureHomepageTables(db);
  await db.sql`create extension if not exists pgcrypto`;
  await db.sql`create table if not exists homepage_gallery (
    id uuid primary key default gen_random_uuid(), title text, description text, category text, location text, image_url text, before_image_url text, after_image_url text, featured boolean not null default false, visible boolean not null default true, sort_order integer not null default 100, project_date date, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  )`;
  await db.sql`alter table homepage_gallery add column if not exists project_date date`;
  await db.sql`create index if not exists idx_homepage_gallery_visible_sort on homepage_gallery (visible, sort_order, created_at)`;
};
const currentUser = async (db, request) => {
  const token = getSessionToken(request); if (!token) return null;
  const [session] = await db.sql`select auth_sessions.user_id from auth_sessions join app_users on app_users.id = auth_sessions.user_id where auth_sessions.session_hash = ${hashToken(token)} and auth_sessions.revoked_at is null and auth_sessions.expires_at > now() and app_users.is_active = true limit 1`;
  if (!session) return null;
  const rows = await db.sql`select roles.key from user_roles join roles on roles.id = user_roles.role_id where user_roles.user_id = ${session.user_id}`;
  const roles = rows.map((row) => row.key);
  const assigned = await loadRolePermissionKeys(db, session.user_id, { logPrefix: 'Failed to load homepage gallery permissions' });
  const permissionKeys = getPermissionKeysForRoles(roles, assigned);
  return { roles, permissionKeys };
};
const canManage = (user) => user?.roles?.includes('owner') || user?.permissionKeys?.includes('homepage.manage');
const camel = (row) => ({ id: row.id, title: row.title || '', description: row.description || '', category: row.category || 'Other / Not Sure', location: row.location || '', imageUrl: row.image_url || '', beforeImageUrl: row.before_image_url || '', afterImageUrl: row.after_image_url || '', featured: Boolean(row.featured), visible: row.visible !== false, sortOrder: row.sort_order || 100, projectDate: row.project_date || '', createdAt: row.created_at, updatedAt: row.updated_at });
const normalize = (body = {}) => {
  const category = SERVICE_CATEGORIES.includes(body.category) ? body.category : 'Other / Not Sure';
  return { title: clean(body.title, 180), description: clean(body.description, 700), category, location: clean(body.location, 120), imageUrl: clean(body.imageUrl || body.image_url, 8_000_000), beforeImageUrl: clean(body.beforeImageUrl || body.before_image_url, 8_000_000), afterImageUrl: clean(body.afterImageUrl || body.after_image_url, 8_000_000), featured: Boolean(body.featured), visible: body.visible !== false, sortOrder: Number(body.sortOrder ?? body.sort_order ?? 100) || 100, projectDate: clean(body.projectDate || body.project_date, 20) || null };
};
const idFromRequest = (request, body = {}) => clean(body.id || new URL(request.url).searchParams.get('id'), 80);
const validImageUrl = (value = '') => !value || /^https?:\/\/[^\s]+\.(?:jpg|jpeg|png|webp|gif)(?:[?#][^\s]*)?$/i.test(value) || /^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(value);

export default async (request) => {
  if (!['GET','POST','PATCH','DELETE'].includes(request.method)) return json(405, { ok:false, message:'Method not allowed.' });
  const db = await loadDatabase(); await ensureGalleryTable(db);
  if (request.method === 'GET') {
    const manageView = new URL(request.url).searchParams.get('all') === '1';
    if (!manageView) {
      const rows = await db.sql`select * from homepage_gallery where visible = true order by featured desc, sort_order asc, created_at desc`;
      return json(200, { ok:true, gallery: rows.map(camel) });
    }
    const user = await currentUser(db, request);
    if (!canManage(user)) return json(user ? 403 : 401, { ok:false, message: user ? 'Homepage management permission is required.' : 'Sign in required.' });
    const rows = await db.sql`select * from homepage_gallery order by sort_order asc, created_at desc`;
    return json(200, { ok:true, gallery: rows.map(camel) });
  }
  const user = await currentUser(db, request);
  if (!canManage(user)) return json(user ? 403 : 401, { ok:false, message: user ? 'Homepage management permission is required.' : 'Sign in required.' });
  const body = await parseJsonBody(request) || {};
  if (request.method === 'DELETE') {
    const id = idFromRequest(request, body); if (!id) return json(400, { ok:false, message:'Gallery item id is required.' });
    await db.sql`delete from homepage_gallery where id = ${id}`;
    return json(200, { ok:true, deletedId: id });
  }
  const item = normalize(body);
  if (!item.title) return json(400, { ok:false, message:'Title is required.' });
  if (!item.imageUrl && !item.beforeImageUrl && !item.afterImageUrl) return json(400, { ok:false, message:'At least one project image is required.' });
  if (![item.imageUrl, item.beforeImageUrl, item.afterImageUrl].every(validImageUrl)) return json(400, { ok:false, message:'Use a valid uploaded image or image URL ending in jpg, jpeg, png, webp, or gif.' });
  if (request.method === 'POST') {
    const [row] = await db.sql`insert into homepage_gallery (title, description, category, location, image_url, before_image_url, after_image_url, featured, visible, sort_order, project_date) values (${item.title},${item.description},${item.category},${item.location},${item.imageUrl},${item.beforeImageUrl},${item.afterImageUrl},${item.featured},${item.visible},${item.sortOrder},${item.projectDate}) returning *`;
    return json(200, { ok:true, item: camel(row) });
  }
  const id = idFromRequest(request, body); if (!id) return json(400, { ok:false, message:'Gallery item id is required.' });
  const [row] = await db.sql`update homepage_gallery set title=${item.title}, description=${item.description}, category=${item.category}, location=${item.location}, image_url=${item.imageUrl}, before_image_url=${item.beforeImageUrl}, after_image_url=${item.afterImageUrl}, featured=${item.featured}, visible=${item.visible}, sort_order=${item.sortOrder}, project_date=${item.projectDate}, updated_at=now() where id=${id} returning *`;
  if (!row) return json(404, { ok:false, message:'Gallery item not found.' });
  return json(200, { ok:true, item: camel(row) });
};
