async function installStatus(){ try{ const r=await fetch('/api/install-status',{cache:'no-store'}); return await r.json(); }catch{return {needsInstall:true};}}
async function guard(){ const s=await installStatus(); if(s.needsInstall && !location.pathname.startsWith('/install')) { location.replace('/install/'); return false; } return true; }
window.TAPlatform={guard,installStatus};
