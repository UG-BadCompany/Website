import { rm, mkdir, cp, copyFile } from 'node:fs/promises';
await rm('dist', { recursive:true, force:true });
await mkdir('dist', { recursive:true });
await copyFile('index.html', 'dist/index.html');
await cp('src', 'dist/src', { recursive:true });
console.log('Static app built to dist.');
