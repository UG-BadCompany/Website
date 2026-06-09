import { rm, mkdir, cp, copyFile } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });

await mkdir('dist', { recursive: true });
await mkdir('dist/install', { recursive: true });

await copyFile('index.html', 'dist/index.html');
await copyFile('install/index.html', 'dist/install/index.html');

await cp('src', 'dist/src', { recursive: true });

console.log('Static app built to dist.');