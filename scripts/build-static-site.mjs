import { rmSync, mkdirSync, cpSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
rmSync('out',{recursive:true,force:true}); mkdirSync('out',{recursive:true});
execFileSync(process.execPath,['scripts/discover-modules.mjs'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/generate-bootstrap-config.mjs'],{stdio:'inherit'});
cpSync('public','out',{recursive:true}); cpSync('modules','out/modules',{recursive:true});
writeFileSync('out/config/build.json', JSON.stringify({ok:true,generatedAt:new Date().toISOString(),nextPluginSkipped:process.env.NETLIFY_NEXT_PLUGIN_SKIP||'true'},null,2));
console.log('Static site written to /out');
