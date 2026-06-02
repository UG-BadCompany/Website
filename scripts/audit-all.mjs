import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const steps = [
  ['npm', ['run', 'prebuild']],
  ['node', ['scripts/check-netlify-functions.mjs']],
  ['node', ['scripts/audit-dead-buttons.mjs']],
  ['node', ['scripts/audit-sidebar-workspaces.mjs']],
  ['node', ['scripts/audit-mobile-ux.mjs']],
  ['node', ['scripts/audit-module-completion.mjs']],
  ['node', ['scripts/audit-ui-consistency.mjs']],
  ['node', ['scripts/audit-responsive-parity.mjs']],
  ['node', ['scripts/audit-phase24-photo-documentation.mjs']],
  ['node', ['scripts/audit-phase34-sidebar-only-workspaces.mjs']],
  ['node', ['scripts/audit-phase37-estimate-review-editing.mjs']],
  ['node', ['scripts/audit-phase48-quoting-hardening.mjs']],
];

const run = ([command, args]) => new Promise((resolve, reject) => {
  const scriptPath = args.find((arg) => /^scripts\//.test(arg));
  if (scriptPath && !existsSync(scriptPath)) {
    console.log(`Skipping missing optional audit: ${scriptPath}`);
    resolve();
    return;
  }
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited with ${code}`)));
  child.on('error', reject);
});

for (const step of steps) await run(step);
console.log('\nAll selected audits passed.');
