import assert from 'node:assert/strict';
process.env.PLATFORM_STATE_FILE = `/tmp/platform-test-${Date.now()}.json`;
const { handler } = await import('../netlify/functions/api.mjs');
async function call(method, path, body) {
  const res = await handler({ httpMethod:method, path:`/api${path}`, body: body ? JSON.stringify(body) : undefined });
  assert.ok(res.headers['content-type'].includes('application/json'), `${path} returns JSON`);
  return { status:res.statusCode, body:JSON.parse(res.body) };
}
let r = await call('GET','/install-status');
assert.equal(r.status, 200); assert.equal(r.body.installation_complete, false);
r = await call('GET','/install/health');
assert.equal(r.status, 200); assert.equal(r.body.ok, true); assert.ok(r.body.optionalIntegrations.every(i => i.requiredForInstall === undefined || i.requiredForInstall === false));
r = await call('GET','/install/draft'); assert.equal(r.status, 200); assert.ok(r.body.draft.moduleCount >= 31);
r = await call('POST','/install/draft',{ companyName:'Acme Services', ownerEmail:'owner@acme.test' }); assert.equal(r.status, 200); assert.equal(r.body.draft.companyName, 'Acme Services');
r = await call('GET','/dashboard'); assert.equal(r.status, 423);
r = await call('POST','/install/finish',{ company:{name:'Acme Services'}, owner:{email:'owner@acme.test', name:'Owner'}, services:['Repair'], homepage:{headline:'Acme'} });
assert.equal(r.status, 200); assert.equal(r.body.installation_complete, true); assert.equal(r.body.redirect, '/dashboard/');
r = await call('GET','/dashboard'); assert.equal(r.status, 200); assert.equal(r.body.headline, 'Welcome to Your New Business Platform');
r = await call('GET','/modules'); assert.equal(r.status, 200); assert.ok(r.body.modules.length >= 31); assert.ok(r.body.permissions.length >= r.body.modules.length);
r = await call('POST','/auth/magic-link',{ email:'client@example.com' }); assert.equal(r.status, 200); assert.equal(r.body.code, 'EMAIL_NOT_CONFIGURED');
r = await call('POST','/workflow/demo',{}); assert.equal(r.status, 200); const wfId = r.body.workflow.id;
for (const stage of ['quote_accepted','work_order_created','worker_assigned','work_scheduled','work_in_progress','worker_completed','admin_review','client_approval','invoice_created','payment_pending','payment_verified','closed_archived']) {
  r = await call('POST','/workflow/advance',{ workflowId:wfId, stage, actor:'test' }); assert.equal(r.status, 200); assert.equal(r.body.workflow.currentStage, stage);
}
r = await call('POST','/impersonate',{ actor:'owner@acme.test', targetUserId:'demo', reason:'audit test' }); assert.equal(r.status, 200); assert.ok(r.body.impersonation.id);
r = await call('POST','/view-switch',{ actor:'owner@acme.test', workspace:'worker' }); assert.equal(r.status, 200); assert.equal(r.body.workspace, 'worker');
r = await call('GET','/system/integrations'); assert.equal(r.status, 200); assert.equal(r.body.manualMode, true);
r = await call('POST','/ai/estimate',{ photos:[] }); assert.equal(r.status, 200); assert.ok(['manual','ai'].includes(r.body.mode));
console.log('All API platform tests passed.');
