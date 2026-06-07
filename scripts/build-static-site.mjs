import { cp, mkdir, rm } from 'node:fs/promises';
await rm('out',{recursive:true,force:true});
await mkdir('out',{recursive:true});
await cp('public','out',{recursive:true});
console.log('Built static site to out');
