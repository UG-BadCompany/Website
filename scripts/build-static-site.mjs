import fs from 'node:fs/promises';
async function copy(src,dst){ await fs.rm(dst,{recursive:true,force:true}); await fs.cp(src,dst,{recursive:true}); }
await copy('public','out');
await fs.cp('modules','out/modules',{recursive:true});
console.log('Static site built to out.');
