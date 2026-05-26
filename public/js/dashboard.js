(() => {
  const target = document.querySelector('[data-last-draft]');
  if (!target) return;
  try {
    const last = JSON.parse(sessionStorage.getItem('lastAiQuoteDraft') || 'null');
    if (!last) {
      target.innerHTML = '<p>No recent AI quote draft in this browser session yet.</p>';
      return;
    }
    target.innerHTML = `
      <h3>${escapeHtml(last.job_summary || 'Recent AI Draft')}</h3>
      <p>Estimated total: <strong>$${Number(last?.totals?.total_low || 0).toFixed(2)}–$${Number(last?.totals?.total_high || 0).toFixed(2)}</strong></p>
      <p>${last.quote_ready ? 'Ready for admin review.' : 'Needs more information before final quoting.'}</p>
      <a class="btn btn-primary" href="/admin/ai-quotes/">Open AI Drafts</a>
    `;
  } catch {
    target.innerHTML = '<p>No recent AI quote draft found.</p>';
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }
})();
