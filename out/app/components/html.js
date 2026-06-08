export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function table(items, emptyMessage = 'No records yet. Use the create action to add the first one.') {
  if (!items?.length) return `<div class="empty">${escapeHtml(emptyMessage)}</div>`;
  const keys = Object.keys(items[0]).slice(0, 7);
  return `
    <table class="table">
      <thead><tr>${keys.map((key) => `<th>${escapeHtml(key.replaceAll('_', ' '))}</th>`).join('')}</tr></thead>
      <tbody>
        ${items.map((item) => `<tr>${keys.map((key) => `<td data-label="${escapeHtml(key)}">${formatCell(item[key])}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>`;
}

export function formatCell(value) {
  if (value && typeof value === 'object') return escapeHtml(JSON.stringify(value).slice(0, 120));
  return escapeHtml(value ?? '');
}

export function cardGrid(items) {
  return `<div class="grid cards">${items.map((item) => `<article class="card">${item}</article>`).join('')}</div>`;
}
