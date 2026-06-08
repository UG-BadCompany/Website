import { modules, permissions, roles, services } from './core-data.mjs';
export const defaultTheme={mode:'system',primary:'#2563eb',accent:'#14b8a6',background:'#f8fafc',surface:'#ffffff',text:'#0f172a',border:'#cbd5e1',button:'#2563eb',buttonText:'#ffffff',sidebarBackground:'#0f172a',sidebarText:'#e2e8f0',sidebarActiveBackground:'#1d4ed8',sidebarActiveText:'#ffffff',sidebarHoverBackground:'#1e293b',mobileNavBackground:'#ffffff',mobileNavActive:'#2563eb',mobileNavText:'#334155'};

export async function seedInstallerPrerequisites(db){
  await db.begin(async tx=>{
    await tx`insert into platform_installation(id, installer_draft) values('default', '{}'::jsonb) on conflict(id) do nothing`;
    await tx`insert into installer_drafts(id,draft) values('default','{}'::jsonb) on conflict(id) do nothing`;
    await tx`insert into company_settings(id, company_name, theme) values('default', 'Contractor Platform', ${tx.json(defaultTheme)}) on conflict(id) do nothing`;
    await tx`insert into homepage_settings(id, content, published) values('default', ${tx.json({heroTitle:'Welcome to Contractor Platform', heroSubtitle:'Request estimates, approve quotes, and track work from one polished portal.', heroButtonText:'Request an Estimate', heroButtonLink:'/dashboard/requests', services})}, true) on conflict(id) do nothing`;
    await tx`insert into theme_settings(id, theme, active) values('default', ${tx.json(defaultTheme)}, true) on conflict(id) do nothing`;
    for(const [key,perms] of Object.entries(roles)) await tx`insert into roles(key,label,description) values(${key},${key[0].toUpperCase()+key.slice(1)},${`${key} workspace role`}) on conflict(key) do nothing`;
    for(const p of permissions) await tx`insert into permissions(key,label) values(${p},${p.replaceAll('.',' ')}) on conflict(key) do nothing`;
    for(const [role,perms] of Object.entries(roles)) for(const p of perms) await tx`insert into role_permissions(role_key,permission_key) values(${role},${p}) on conflict do nothing`;
    for(const m of modules){
      await tx`insert into module_registry(id,label,group_name,icon,route,permission_key,enabled,manifest) values(${m.id},${m.label},${m.group},${m.icon},${m.route},${m.permission},true,${tx.json(m)}) on conflict(id) do update set label=excluded.label, group_name=excluded.group_name, icon=excluded.icon, route=excluded.route, permission_key=excluded.permission_key, enabled=true, manifest=excluded.manifest, updated_at=now()`;
      await tx`insert into module_settings(module_id, settings) values(${m.id}, '{}'::jsonb) on conflict(module_id) do nothing`;
    }
    for(const s of services) await tx`insert into service_categories(name,active) values(${s},true) on conflict(name) do update set active=true`;
    await tx`insert into audit_logs(action,entity_type,entity_id,metadata) values('install.bootstrap','platform_installation','default',${tx.json({moduleCount:modules.length, permissionCount:permissions.length, serviceCount:services.length})})`;
  });
}

export async function seedPlatform(db, draft={}){
  const company=draft.company||{}; const owner=draft.owner||{}; const homepage=draft.homepage||{}; const selectedServices=Array.isArray(draft.services)&&draft.services.length?draft.services:services; const theme={...defaultTheme,...(draft.theme||{})};
  const logoRef=company.logoAsset||null; const faviconRef=company.faviconAsset||null; const heroRef=homepage.heroAsset||null;
  const publicLogoUrl=company.logoUrl||logoRef?.url||null;
  const email=String(owner.email||company.email||'owner@example.com').trim().toLowerCase();
  const fullName=owner.fullName||owner.full_name||'Platform Owner';
  await db.begin(async tx=>{
    await tx`insert into platform_installation(id, installer_draft) values('default', ${tx.json(draft)}) on conflict(id) do update set installer_draft=${tx.json(draft)}, updated_at=now()`;
    await tx`insert into company_settings(id, company_name, logo_url, phone, email, address, theme) values('default', ${company.name||'Contractor Platform'}, ${publicLogoUrl}, ${company.phone||null}, ${company.email||email}, ${company.address||null}, ${tx.json({...theme,branding:{logo:logoRef,favicon:faviconRef}})}) on conflict(id) do update set company_name=excluded.company_name, logo_url=excluded.logo_url, phone=excluded.phone, email=excluded.email, address=excluded.address, theme=excluded.theme, updated_at=now()`;
    await tx`insert into homepage_settings(id, content, published) values('default', ${tx.json({heroTitle:homepage.heroTitle||`Welcome to ${company.name||'Contractor Platform'}`, heroSubtitle:homepage.heroSubtitle||'Request estimates, approve quotes, and track work from one polished portal.', heroButtonText:homepage.heroButtonText||'Request an Estimate', heroButtonLink:homepage.heroButtonLink||'/dashboard/requests', heroOverlay:homepage.heroOverlay||'40%', heroAlignment:homepage.heroAlignment||'Left', companyDescription:homepage.companyDescription||'', businessHours:homepage.businessHours||'', licenseNumber:homepage.licenseNumber||'', rocNumber:homepage.rocNumber||'', emergencyService:homepage.emergencyService||'No', services:selectedServices, heroAsset:heroRef, branding:{logo:logoRef,favicon:faviconRef}, cta:homepage.heroButtonText||'Request an Estimate'})}, true) on conflict(id) do update set content=excluded.content, published=true, updated_at=now()`;
    await tx`insert into theme_settings(id, theme, active) values('default', ${tx.json(theme)}, true) on conflict(id) do update set theme=excluded.theme, active=true, updated_at=now()`;
    const [user]=await tx`insert into app_users(full_name,email,normalized_email,phone,active,metadata) values(${fullName},${email},${email},${owner.phone||null},true,${tx.json({installerOwner:true})}) on conflict(normalized_email) do update set full_name=excluded.full_name, phone=excluded.phone, active=true, updated_at=now() returning id`;
    for(const [key,perms] of Object.entries(roles)) await tx`insert into roles(key,label,description) values(${key},${key[0].toUpperCase()+key.slice(1)},${`${key} workspace role`}) on conflict(key) do nothing`;
    for(const p of permissions) await tx`insert into permissions(key,label) values(${p},${p.replaceAll('.',' ')}) on conflict(key) do nothing`;
    for(const [role,perms] of Object.entries(roles)) for(const p of perms) await tx`insert into role_permissions(role_key,permission_key) values(${role},${p}) on conflict do nothing`;
    await tx`insert into user_roles(user_id, role_key) values(${user.id}, 'owner') on conflict do nothing`;
    for(const workspace of ['owner','admin','manager','worker','client']) await tx`insert into workspace_access(user_id,workspace,role_key) values(${user.id},${workspace},${workspace}) on conflict(user_id,workspace) do update set role_key=excluded.role_key`;
    for(const m of modules){ await tx`insert into module_registry(id,label,group_name,icon,route,permission_key,enabled,manifest) values(${m.id},${m.label},${m.group},${m.icon},${m.route},${m.permission},true,${tx.json(m)}) on conflict(id) do update set label=excluded.label, group_name=excluded.group_name, icon=excluded.icon, route=excluded.route, permission_key=excluded.permission_key, enabled=true, manifest=excluded.manifest, updated_at=now()`; await tx`insert into module_settings(module_id, settings) values(${m.id}, '{}'::jsonb) on conflict(module_id) do nothing`; }
    for(const asset of [{type:'branding.logo',ref:logoRef},{type:'branding.favicon',ref:faviconRef},{type:'homepage.hero',ref:heroRef}].filter(x=>x.ref)){
      await tx`insert into uploaded_files(owner_type,file_name,content_type,url,visibility,metadata) values(${asset.type},${asset.ref.fileName||asset.type},${asset.ref.contentType||null},${asset.ref.url||asset.ref.dataUrl||null},'public',${tx.json(asset.ref)})`;
      await tx`insert into files(owner_type,file_name,content_type,url,visibility,metadata) values(${asset.type},${asset.ref.fileName||asset.type},${asset.ref.contentType||null},${asset.ref.url||asset.ref.dataUrl||null},'public',${tx.json(asset.ref)})`;
    }
    for(const s of selectedServices) await tx`insert into service_categories(name,active) values(${s},true) on conflict(name) do update set active=true`;
    await tx`insert into audit_logs(action,entity_type,entity_id,metadata) values('install.finish','platform_installation','default',${tx.json({ownerEmail:email,moduleCount:modules.length})})`;
    await tx`update platform_installation set installation_complete=true, completed_at=coalesce(completed_at, now()), updated_at=now() where id='default'`;
  });
}
