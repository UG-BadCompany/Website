import { spawn } from 'node:child_process';

const steps = [
  ['npm', ['run', 'build']],
  ['node', ['scripts/check-netlify-functions.mjs']],
  ['npm', ['run', 'audit:all']],
  ['npm', ['run', 'test:all']],
];

const run = ([command, args]) => new Promise((resolve, reject) => {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited with ${code}`)));
  child.on('error', reject);
});

for (const step of steps) await run(step);
console.log('\nFull verification passed.');
