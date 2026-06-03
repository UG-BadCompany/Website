import { spawn } from 'node:child_process';

const steps = [
  ['node', ['scripts/check-netlify-functions.mjs']],
  ['node', ['scripts/audit-dead-buttons.mjs']],
  ['node', ['scripts/audit-sidebar-workspaces.mjs']],
  ['node', ['scripts/audit-mobile-ux.mjs']],
  ['node', ['scripts/audit-module-completion.mjs']],
  ['node', ['scripts/audit-ui-consistency.mjs']],
];

const run = ([command, args]) => new Promise((resolve, reject) => {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited with ${code}`)));
  child.on('error', reject);
});

for (const step of steps) await run(step);
console.log('\nAll selected clean-platform audits passed.');
