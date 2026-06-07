import fs from 'node:fs'; import path from 'node:path'; import './generate-module-registry.mjs';
fs.rmSync('out',{recursive:true,force:true}); fs.mkdirSync('out',{recursive:true});
for(const f of ['index.html','styles.css','app.js']) fs.copyFileSync(path.join('src',f),path.join('out',f));
fs.cpSync('generated','out/generated',{recursive:true}); fs.cpSync('modules','out/modules',{recursive:true});
console.log('Static site built to out/.');
