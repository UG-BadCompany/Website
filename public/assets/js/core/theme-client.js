const KEY='cmms-theme-mode';
export function applyTheme(mode = localStorage.getItem(KEY) || 'system') {
  const resolved = mode === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode;
  document.documentElement.dataset.theme = resolved === 'custom' ? 'light' : resolved;
  localStorage.setItem(KEY, mode);
}
export function wireThemeSelect(selector='[data-theme-select]') { const el=document.querySelector(selector); if(el){el.value=localStorage.getItem(KEY)||'system'; el.addEventListener('change',()=>applyTheme(el.value));} }
applyTheme();
