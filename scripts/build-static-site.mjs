import { promises as fs } from 'fs';
import path from 'path';
async function cp(src,dst){await fs.mkdir(dst,{recursive:true}); for(const e of await fs.readdir(src,{withFileTypes:true})){const s=path.join(src,e.name), d=path.join(dst,e.name); if(e.isDirectory()) await cp(s,d); else await fs.copyFile(s,d);}}
await fs.rm('out',{recursive:true,force:true}); await cp('public','out'); await fs.mkdir('out/modules',{recursive:true}); await cp('modules','out/modules');
console.log('Static site built to out/.');
