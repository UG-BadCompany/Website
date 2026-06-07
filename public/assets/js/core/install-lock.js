const protectedPrefixes = ['/', '/dashboard/', '/login/', '/portal/', '/client/', '/quote/', '/invoice/', '/admin/', '/manager/', '/worker/', '/request-estimate/'];
export async function enforceInstallLock() {
  const path = location.pathname;
  if (path.startsWith('/install') || path.startsWith('/assets') || path.startsWith('/config')) return;
  const status = await fetch('/api/install-status', { cache: 'no-store' }).then(r=>r.json()).catch(()=>({needsInstall:true}));
  if (status.needsInstall && protectedPrefixes.some((p)=>path === p || path.startsWith(p))) location.replace('/install/');
}
