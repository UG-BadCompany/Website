import fs from 'node:fs/promises';
import path from 'node:path';
import { error, json, method } from './shared/response.mjs';
import { readState, updateState, originFromEvent, fingerprint, publicBootstrap, audit } from './shared/state.mjs';
import { groupedEnv, generatedUrls } from './shared/env-metadata.mjs';
import registry from '../generated/module-registry.json' assert { type: 'json' };
const steps = ['welcome','system-check','license','company','branding','theme','owner','roles','modules','services','homepage','environment','ai','email','payments','portal','review','finish'];
function body(event){ try { return JSON.parse(event.body || '{}'); } catch { return {}; } }
function safeEnv(env){ return Object.fromEntries(Object.entries(env || {}).map(([k,v])=>[k, { configured: !!v, masked: v?.masked || 'saved', secret: true }])); }
export async function handler(event) {
  const action = (event.path || '').split('/').pop();
  if (action === 'state' && event.httpMethod === 'GET') {
    const state = await readState();
    const origin = originFromEvent(event);
    return json(200, { ok: true, installed: !!state.installation.installation_complete, currentStep: state.installation.current_step, steps, company: state.company, theme: state.company.theme, license: state.license, modules: registry.modules, homepage: state.homepage, environmentGroups: groupedEnv(origin), generatedUrls: generatedUrls(origin), environmentStatus: state.environmentStatus, secrets: safeEnv(state.environment) });
  }
  if (action === 'save-step') {
    const m = method(event, ['POST']); if (m) return m;
    const payload = body(event);
    if (!steps.includes(payload.step)) return error(422, 'VALIDATION_ERROR', 'Unknown installer step.', { field: 'step' });
    const state = await updateState((s)=>{
      s.installation.current_step = payload.nextStep && steps.includes(payload.nextStep) ? payload.nextStep : payload.step;
      s.installation.metadata.steps[payload.step] = { status: payload.status || 'complete', savedAt: new Date().toISOString() };
      if (payload.company) s.company = { ...s.company, ...payload.company, theme: { ...s.company.theme, ...(payload.company.theme || {}) } };
      if (payload.theme) s.company.theme = { ...s.company.theme, ...payload.theme };
      if (payload.homepage) s.homepage = payload.homepage;
      if (payload.license) s.license = { ...s.license, ...payload.license, licenseKeyFingerprint: payload.license.licenseKey ? fingerprint(payload.license.licenseKey) : s.license.licenseKeyFingerprint };
      return s;
    });
    await audit('installer_step_saved', { step: payload.step });
    return json(200, { ok: true, message: 'Progress saved.', currentStep: state.installation.current_step });
  }
  if (action === 'finish') {
    const m = method(event, ['POST']); if (m) return m;
    const payload = body(event);
    const missing = [];
    if (!payload.owner?.email && !payload.ownerEmail) missing.push('owner.email');
    if (missing.length) return error(422, 'VALIDATION_ERROR', 'Owner email is required to finish installation.', { missing });
    const now = new Date().toISOString();
    const state = await updateState((s)=>{
      const email = payload.owner?.email || payload.ownerEmail;
      let owner = s.users.find((u)=>u.email === email);
      if (!owner) { owner = { id: crypto.randomUUID(), email, fullName: payload.owner?.fullName || 'Platform Owner', roles: ['owner'], workspaces: ['owner','admin','manager','worker','client','public'], createdAt: now }; s.users.push(owner); }
      owner.roles = Array.from(new Set([...(owner.roles || []), 'owner']));
      owner.workspaces = ['owner','admin','manager','worker','client','public'];
      s.permissions = Array.from(new Set(registry.modules.flatMap((mod)=>mod.permissions?.map((p)=>p.key) || []).concat(['platform.super_owner','platform.impersonate','workflow.manage','environment.manage'])));
      s.moduleSettings = Object.fromEntries(registry.modules.map((m)=>[m.id, { enabled: m.enabledByDefault !== false, visibleTo: m.workspaces }]));
      s.installation = { ...s.installation, installation_complete: true, installed_version: '1.0.0', installed_at: now, installed_by_user_id: owner.id, current_step: 'finish', bootstrap_generated: true, license_status: 'placeholder_active' };
      s.license.status = 'placeholder_active';
      s.company.siteUrl = s.company.siteUrl || originFromEvent(event);
      return s;
    });
    const bootstrap = publicBootstrap(state);
    try {
      const configDir = path.join(process.cwd(), 'public/config');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(path.join(configDir, 'bootstrap.json'), JSON.stringify(bootstrap, null, 2));
    } catch (err) {
      return error(500, 'BOOTSTRAP_WRITE_FAILED', 'Finish Install could not generate bootstrap config.', { detail: err.message });
    }
    await audit('installer_completed', { installedVersion: '1.0.0' }, state.installation.installed_by_user_id);
    return json(200, { ok: true, message: 'Installation complete.', redirectTo: '/dashboard/', bootstrap });
  }
  return error(404, 'NOT_FOUND', 'Unknown install action.');
}
