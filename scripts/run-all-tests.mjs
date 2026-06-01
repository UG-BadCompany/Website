import { spawn } from 'node:child_process';

const steps = [
  ['npm', ['test']],
  ['npm', ['run', 'test:browser']],
  ['npm', ['run', 'test:sidebar-workspaces']],
  ['npm', ['run', 'test:mobile-ux']],
  ['npm', ['run', 'test:module-completion']],
  ['npm', ['run', 'test:e2e-workflows']],
  ['npm', ['run', 'test:work-order-closeout']],
];

const run = ([command, args]) => new Promise((resolve, reject) => {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited with ${code}`)));
  child.on('error', reject);
});

for (const step of steps) await run(step);
console.log('\nAll test groups passed.');
