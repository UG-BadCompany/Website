const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>[...r.querySelectorAll(s)];
async function api(url,opts={}){const r=await fetch(url,{headers:{'content-type':'application/json'},...opts}); return r.json();}
function applyTheme(t={}){const root=document.documentElement; const dark=t.mode==='dark'||(t.mode==='system'&&matchMedia('(prefers-color-scheme: dark)').matches); document.body.dataset.theme=dark?'dark':'light'; for(const [k,v] of Object.entries(t)){if(/^#/.test(String(v))) root.style.setProperty('--'+k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()),v)}}
async function loadPublic(){const cfg=await api('/api/public-config').catch(()=>({data:{company:{displayName:'Your Contractor Company'},homepage:{hero:{headline:'Setup required'}}}})); const d=cfg.data||cfg; applyTheme(d.theme||{}); return d;}
window.Platform={api,applyTheme,loadPublic};
