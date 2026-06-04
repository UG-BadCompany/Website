import { getPermissionKeysForRoles, getSessionToken, hashToken, json, loadDatabase, loadRolePermissionKeys, parseJsonBody, clean } from './auth-utils.mjs';

const SERVICE_CATEGORIES = ['HVAC','Water Heaters','Plumbing','Electrical','Drywall','Painting','Doors','Windows','Appliances','Handyman','Facilities Maintenance','Property Maintenance','Commercial Maintenance','General Contracting','Tenant Improvements','Other / Not Sure'];
const DEFAULT_VISIBILITY = { hero:true, services:true, about:true, whyChoose:true, previousJobs:true, serviceArea:true, cta:true, contactFooter:true };
const defaultServices = () => SERVICE_CATEGORIES.map((name, index) => ({ name, description: `${name} support for repairs, maintenance, installations, and property improvement requests.`, enabled: true, sortOrder: index + 1 }));
const defaultWhy = () => [
  ['💬','Clear communication','Know what happens next with practical updates.'], ['📅','Reliable scheduling','We coordinate work around property needs and access.'], ['🛠️','Practical repair solutions','Repair-first thinking with replacement when it makes sense.'], ['🏗️','Maintenance and install experience','Support for punch lists, installs, and ongoing property needs.'], ['📲','Easy online requests','Send the details from phone or desktop.'], ['📸','Photos and job updates','Useful documentation before, during, and after work.']
].map(([icon,title,description], index) => ({ icon, title, description, visible: true, sortOrder: index + 1 }));

export const DEFAULT_HOMEPAGE_SETTINGS = {
  heroHeadline: 'Reliable maintenance, repairs, and improvements for your property.',
  heroSubheadline: 'Our team helps homeowners, landlords, property managers, and small businesses handle repairs, maintenance, installations, punch lists, and property improvements.',
  primaryButtonText: 'Request Estimate', primaryButtonLink: '#estimate', secondaryButtonText: 'View Services', secondaryButtonLink: '#services', showSecondaryButton: true, heroBackgroundUrl: '',
  servicesTitle: 'Repair, maintenance, installation, and property work made easier to request.', servicesSubtitle: 'Choose the closest category when you request an estimate. If you are not sure, choose Other / Not Sure and describe the issue.', servicesConfig: defaultServices(),
  aboutTitle: 'About our company', aboutText: 'We help homeowners, property managers, and small businesses handle the repairs, installs, and maintenance work that keep properties safe, clean, and running right.', aboutText2: '', yearsExperienceText: '', localText: 'Local property service support.', showAbout: true,
  whyChooseTitle: 'Why choose our team', whyChooseCards: defaultWhy(),
  serviceAreaTitle: 'Serving our local community.', serviceAreaText: 'Submit your request and we will confirm availability for your property.', citiesServed: ['Local service area','Nearby communities'], travelNotes: '',
  ctaHeadline: 'Need help with a repair or project?', ctaSubheadline: 'Request an estimate and we’ll follow up with the next steps.', ctaButtonText: 'Request Estimate', ctaButtonLink: '#estimate',
  footerText: 'Customer-focused repair, maintenance, installation, punch-list, and property improvement help.', footerPhone: '', footerEmail: '', footerAddress: '', socialLinks: {}, licenseText: '', sectionVisibility: DEFAULT_VISIBILITY,
};

export const ensureHomepageTables = async (db) => {
  await db.sql`create extension if not exists pgcrypto`;
  await db.sql`create table if not exists homepage_settings (
    id uuid primary key default gen_random_uuid(), hero_headline text, hero_subheadline text, primary_button_text text, primary_button_link text, secondary_button_text text, secondary_button_link text, show_secondary_button boolean not null default true, hero_background_url text,
    services_title text, services_subtitle text, services_config jsonb not null default '[]'::jsonb, about_title text, about_text text, about_text_2 text, years_experience_text text, local_text text, show_about boolean not null default true,
    why_choose_title text, why_choose_cards jsonb not null default '[]'::jsonb, service_area_title text, service_area_text text, cities_served jsonb not null default '[]'::jsonb, travel_notes text,
    cta_headline text, cta_subheadline text, cta_button_text text, cta_button_link text, footer_text text, footer_phone text, footer_email text, footer_address text, social_links jsonb not null default '{}'::jsonb, license_text text, section_visibility jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now()
  )`;
  await db.sql`alter table homepage_settings add column if not exists years_experience_text text`;
  await db.sql`alter table homepage_settings add column if not exists local_text text`;
  await db.sql`alter table homepage_settings add column if not exists travel_notes text`;
  await db.sql`alter table homepage_settings add column if not exists footer_phone text`;
  await db.sql`alter table homepage_settings add column if not exists footer_email text`;
  await db.sql`alter table homepage_settings add column if not exists footer_address text`;
  await db.sql`alter table homepage_settings add column if not exists social_links jsonb not null default '{}'::jsonb`;
  await db.sql`alter table homepage_settings add column if not exists license_text text`;
};

const currentUser = async (db, request) => {
  const token = getSessionToken(request); if (!token) return null;
  const [session] = await db.sql`select auth_sessions.user_id from auth_sessions join app_users on app_users.id = auth_sessions.user_id where auth_sessions.session_hash = ${hashToken(token)} and auth_sessions.revoked_at is null and auth_sessions.expires_at > now() and app_users.is_active = true limit 1`;
  if (!session) return null;
  const rows = await db.sql`select roles.key from user_roles join roles on roles.id = user_roles.role_id where user_roles.user_id = ${session.user_id}`;
  const roles = rows.map((row) => row.key);
  const assigned = await loadRolePermissionKeys(db, session.user_id, { logPrefix: 'Failed to load homepage permissions' });
  const permissionKeys = getPermissionKeysForRoles(roles, assigned);
  return { roles, permissionKeys };
};
const canManage = (user) => user?.roles?.includes('owner') || user?.permissionKeys?.includes('homepage.manage');
const parseArray = (value, fallback = []) => Array.isArray(value) ? value : fallback;
const normalizeServices = (items) => parseArray(items, defaultServices()).filter((item) => SERVICE_CATEGORIES.includes(item?.name)).map((item, index) => ({ name: item.name, description: clean(item.description, 500), enabled: item.enabled !== false, sortOrder: Number(item.sortOrder ?? index + 1) || index + 1 }));
const normalizeWhy = (items) => parseArray(items, defaultWhy()).map((item, index) => ({ icon: clean(item.icon, 12) || '✓', title: clean(item.title, 120), description: clean(item.description, 500), visible: item.visible !== false, sortOrder: Number(item.sortOrder ?? index + 1) || index + 1 })).filter((item) => item.title);
const normalizePayload = (body = {}) => ({
  heroHeadline: clean(body.heroHeadline, 180) || DEFAULT_HOMEPAGE_SETTINGS.heroHeadline,
  heroSubheadline: clean(body.heroSubheadline, 700), primaryButtonText: clean(body.primaryButtonText, 80) || 'Request Estimate', primaryButtonLink: clean(body.primaryButtonLink, 300) || '#estimate', secondaryButtonText: clean(body.secondaryButtonText, 80), secondaryButtonLink: clean(body.secondaryButtonLink, 300), showSecondaryButton: body.showSecondaryButton !== false, heroBackgroundUrl: clean(body.heroBackgroundUrl, 1000),
  servicesTitle: clean(body.servicesTitle, 220), servicesSubtitle: clean(body.servicesSubtitle, 700), servicesConfig: normalizeServices(body.servicesConfig),
  aboutTitle: clean(body.aboutTitle, 180), aboutText: clean(body.aboutText, 1000), aboutText2: clean(body.aboutText2, 1000), yearsExperienceText: clean(body.yearsExperienceText, 180), localText: clean(body.localText, 240), showAbout: body.showAbout !== false,
  whyChooseTitle: clean(body.whyChooseTitle, 180), whyChooseCards: normalizeWhy(body.whyChooseCards), serviceAreaTitle: clean(body.serviceAreaTitle, 180), serviceAreaText: clean(body.serviceAreaText, 800), citiesServed: parseArray(body.citiesServed, []).map((city) => clean(city, 80)).filter(Boolean).slice(0, 40), travelNotes: clean(body.travelNotes, 400),
  ctaHeadline: clean(body.ctaHeadline, 180), ctaSubheadline: clean(body.ctaSubheadline, 500), ctaButtonText: clean(body.ctaButtonText, 80) || 'Request Estimate', ctaButtonLink: clean(body.ctaButtonLink, 300) || '#estimate',
  footerText: clean(body.footerText, 600), footerPhone: clean(body.footerPhone, 80), footerEmail: clean(body.footerEmail, 160), footerAddress: clean(body.footerAddress, 300), socialLinks: typeof body.socialLinks === 'object' && !Array.isArray(body.socialLinks) ? body.socialLinks : {}, licenseText: clean(body.licenseText, 250), sectionVisibility: { ...DEFAULT_VISIBILITY, ...(body.sectionVisibility || {}) },
});
const camel = (row) => row ? ({
  id: row.id, heroHeadline: row.hero_headline, heroSubheadline: row.hero_subheadline, primaryButtonText: row.primary_button_text, primaryButtonLink: row.primary_button_link, secondaryButtonText: row.secondary_button_text, secondaryButtonLink: row.secondary_button_link, showSecondaryButton: row.show_secondary_button, heroBackgroundUrl: row.hero_background_url,
  servicesTitle: row.services_title, servicesSubtitle: row.services_subtitle, servicesConfig: row.services_config, aboutTitle: row.about_title, aboutText: row.about_text, aboutText2: row.about_text_2, yearsExperienceText: row.years_experience_text, localText: row.local_text, showAbout: row.show_about,
  whyChooseTitle: row.why_choose_title, whyChooseCards: row.why_choose_cards, serviceAreaTitle: row.service_area_title, serviceAreaText: row.service_area_text, citiesServed: row.cities_served, travelNotes: row.travel_notes, ctaHeadline: row.cta_headline, ctaSubheadline: row.cta_subheadline, ctaButtonText: row.cta_button_text, ctaButtonLink: row.cta_button_link,
  footerText: row.footer_text, footerPhone: row.footer_phone, footerEmail: row.footer_email, footerAddress: row.footer_address, socialLinks: row.social_links, licenseText: row.license_text, sectionVisibility: row.section_visibility, createdAt: row.created_at, updatedAt: row.updated_at,
}) : DEFAULT_HOMEPAGE_SETTINGS;
const merged = (settings) => ({ id: settings?.id || null, ...normalizePayload({ ...DEFAULT_HOMEPAGE_SETTINGS, ...settings, sectionVisibility: { ...DEFAULT_VISIBILITY, ...(settings?.sectionVisibility || {}) } }) });

export default async (request) => {
  if (!['GET','PATCH'].includes(request.method)) return json(405, { ok:false, message:'Method not allowed.' });
  const db = await loadDatabase(); await ensureHomepageTables(db);
  if (request.method === 'GET') {
    const [row] = await db.sql`select * from homepage_settings order by updated_at desc limit 1`;
    return json(200, { ok:true, settings: merged(camel(row)) });
  }
  const user = await currentUser(db, request);
  if (!canManage(user)) return json(user ? 403 : 401, { ok:false, message: user ? 'Homepage management permission is required.' : 'Sign in required.' });
  const body = await parseJsonBody(request);
  if (!body) return json(400, { ok:false, message:'Invalid JSON body.' });
  const s = normalizePayload(body);
  const [existing] = await db.sql`select id from homepage_settings order by updated_at desc limit 1`;
  const [row] = existing ? await db.sql`update homepage_settings set hero_headline=${s.heroHeadline}, hero_subheadline=${s.heroSubheadline}, primary_button_text=${s.primaryButtonText}, primary_button_link=${s.primaryButtonLink}, secondary_button_text=${s.secondaryButtonText}, secondary_button_link=${s.secondaryButtonLink}, show_secondary_button=${s.showSecondaryButton}, hero_background_url=${s.heroBackgroundUrl}, services_title=${s.servicesTitle}, services_subtitle=${s.servicesSubtitle}, services_config=${JSON.stringify(s.servicesConfig)}::jsonb, about_title=${s.aboutTitle}, about_text=${s.aboutText}, about_text_2=${s.aboutText2}, years_experience_text=${s.yearsExperienceText}, local_text=${s.localText}, show_about=${s.showAbout}, why_choose_title=${s.whyChooseTitle}, why_choose_cards=${JSON.stringify(s.whyChooseCards)}::jsonb, service_area_title=${s.serviceAreaTitle}, service_area_text=${s.serviceAreaText}, cities_served=${JSON.stringify(s.citiesServed)}::jsonb, travel_notes=${s.travelNotes}, cta_headline=${s.ctaHeadline}, cta_subheadline=${s.ctaSubheadline}, cta_button_text=${s.ctaButtonText}, cta_button_link=${s.ctaButtonLink}, footer_text=${s.footerText}, footer_phone=${s.footerPhone}, footer_email=${s.footerEmail}, footer_address=${s.footerAddress}, social_links=${JSON.stringify(s.socialLinks)}::jsonb, license_text=${s.licenseText}, section_visibility=${JSON.stringify(s.sectionVisibility)}::jsonb, updated_at=now() where id=${existing.id} returning *` : await db.sql`insert into homepage_settings (hero_headline, hero_subheadline, primary_button_text, primary_button_link, secondary_button_text, secondary_button_link, show_secondary_button, hero_background_url, services_title, services_subtitle, services_config, about_title, about_text, about_text_2, years_experience_text, local_text, show_about, why_choose_title, why_choose_cards, service_area_title, service_area_text, cities_served, travel_notes, cta_headline, cta_subheadline, cta_button_text, cta_button_link, footer_text, footer_phone, footer_email, footer_address, social_links, license_text, section_visibility) values (${s.heroHeadline},${s.heroSubheadline},${s.primaryButtonText},${s.primaryButtonLink},${s.secondaryButtonText},${s.secondaryButtonLink},${s.showSecondaryButton},${s.heroBackgroundUrl},${s.servicesTitle},${s.servicesSubtitle},${JSON.stringify(s.servicesConfig)}::jsonb,${s.aboutTitle},${s.aboutText},${s.aboutText2},${s.yearsExperienceText},${s.localText},${s.showAbout},${s.whyChooseTitle},${JSON.stringify(s.whyChooseCards)}::jsonb,${s.serviceAreaTitle},${s.serviceAreaText},${JSON.stringify(s.citiesServed)}::jsonb,${s.travelNotes},${s.ctaHeadline},${s.ctaSubheadline},${s.ctaButtonText},${s.ctaButtonLink},${s.footerText},${s.footerPhone},${s.footerEmail},${s.footerAddress},${JSON.stringify(s.socialLinks)}::jsonb,${s.licenseText},${JSON.stringify(s.sectionVisibility)}::jsonb) returning *`;
  return json(200, { ok:true, settings: merged(camel(row)) });
};
