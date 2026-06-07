import { fail, json, parseJson } from './shared/response.mjs';
import { generateBootstrap, installStatusPayload, readInstallState, writeInstallState } from './shared/install-state.mjs';

const STEPS = ['welcome','environment','license','company','branding','theme','owner','roles','modules','homepage','ai','payments','review','finish'];

function sanitizeDraft(draft = {}) {
  const copy = structuredClone(draft);
  if (copy.environmentValues) delete copy.environmentValues;
  return copy;
}

function validateFinish(metadata = {}) {
  const missing = [];
  if (!metadata.company?.companyName && !metadata.company?.displayName) missing.push('company.companyName');
  if (!metadata.owner?.email) missing.push('owner.email');
  if (!metadata.theme?.mode) missing.push('theme.mode');
  return missing;
}

export async function handler(event) {
  const state = await readInstallState();
  if (event.httpMethod === 'GET') return json(200, { ok: true, status: installStatusPayload(state), state: { currentStep: state.current_step, metadata: state.metadata } });
  if (event.httpMethod !== 'POST') return fail(405, 'METHOD_NOT_ALLOWED', 'Installer endpoint supports GET and POST.');
  const body = await parseJson(event);
  if (!body) return fail(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  const action = body.action || 'saveStep';
  if (action === 'finish') {
    const merged = { ...state.metadata, ...sanitizeDraft(body.metadata || {}) };
    const missing = validateFinish(merged);
    if (missing.length) return fail(422, 'INSTALL_VALIDATION_FAILED', 'Required installation fields are missing.', { missing });
    await writeInstallState({ metadata: merged, current_step: 'finish' });
    await generateBootstrap();
    const complete = await writeInstallState({ installation_complete: true, installed_version: '1.0.0', installed_at: new Date().toISOString(), installed_by_user_id: merged.owner?.email || null, current_step: 'finish', license_status: merged.license?.validationEnabled ? 'not_checked' : 'verification_disabled' });
    return json(200, { ok: true, status: installStatusPayload(complete), redirectTo: '/dashboard/' });
  }
  const requestedStep = STEPS.includes(body.currentStep) ? body.currentStep : state.current_step;
  const metadata = { ...state.metadata, ...sanitizeDraft(body.metadata || {}) };
  const next = await writeInstallState({ current_step: requestedStep, metadata });
  return json(200, { ok: true, status: installStatusPayload(next), state: { currentStep: next.current_step, metadata: next.metadata } });
}
