import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root=path.resolve('out'); if(!fs.existsSync(root)) await import('./build-static-site.mjs');
http.createServer((req,res)=>{ let p=decodeURI(req.url.split('?')[0]); if(p==='/'||!path.extname(p)) p='/index.html'; const f=path.join(root,p); if(!f.startsWith(root)||!fs.existsSync(f)){res.writeHead(404); return res.end('Not found');} res.end(fs.readFileSync(f)); }).listen(8888,()=>console.log('Serving out/ on http://localhost:8888'));
