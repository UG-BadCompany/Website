import { applyTheme } from '/assets/js/core/theme-client.js';
const app=document.querySelector('#app');
const status=await fetch('/api/install-status',{cache:'no-store'}).then(r=>r.json()).catch(()=>({needsInstall:true}));
if(status.needsInstall){ location.replace('/install/'); } else {
 const boot=await fetch('/config/bootstrap.json',{cache:'no-store'}).then(r=>r.json()).catch(()=>({company:{companyName:'Your Company'},theme:{},homepage:{sections:[]}})); applyTheme(boot.theme);
 const sections=(boot.homepage?.sections||[]).filter(s=>s.visible).sort((a,b)=>a.order-b.order);
 app.innerHTML=`<header class="container public-header"><strong>${boot.company?.companyName||'Your Company'}</strong><nav><a href="/portal/">Client Portal</a> <a class="btn" href="/request-estimate/">Request Estimate</a></nav></header>${sections.map(renderSection).join('')}<footer class="footer"><div class="container">White-label contractor CMMS + AI Quoting Platform</div></footer>`;
}
function renderSection(s){ if(s.type==='hero')return`<section class="hero"><div class="container"><span class="badge">${s.data.eyebrow||''}</span><h1>${s.data.title||''}</h1><p>${s.data.body||''}</p><a class="btn" href="/request-estimate/">${s.data.cta||'Request an Estimate'}</a></div></section>`; return `<section class="section"><div class="container card"><h2>${s.data.title||s.type}</h2><p>${s.data.body||''}</p>${Array.isArray(s.data.items)?`<div class="grid two">${s.data.items.map(i=>`<div class="metric-card">${i}</div>`).join('')}</div>`:''}</div></section>`; }
