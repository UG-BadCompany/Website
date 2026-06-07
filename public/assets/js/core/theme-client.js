export function applyTheme(theme = {}) {
  const root = document.documentElement;
  const dark = theme.mode === 'dark' || (theme.mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'dark' : 'light';
  const map = { primary:'--primary', accent:'--accent', background:'--color-background', surface:'--color-surface', text:'--color-text', border:'--color-border', button:'--button', buttonText:'--button-text' };
  for (const [k,v] of Object.entries(map)) if (theme[k]) root.style.setProperty(v, theme[k]);
}
export async function loadBootstrapTheme(){ try { const b = await fetch('/config/bootstrap.json',{cache:'no-store'}).then(r=>r.json()); applyTheme(b.theme); } catch {} }
