(() => {
  const root = document.querySelector('[data-drafts]');
  const status = document.querySelector('[data-status]');
  const refresh = document.querySelector('[data-refresh]');
  if (!root) return;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const money = (n) => `$${Number(n || 0).toFixed(2)}`;
  const setStatus = (message) => { if (status) status.textContent = message; };
  const list = (items = []) => items.length ? `<ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p>None listed.</p>';

  const materialsTable = (items = []) => {
    if (!items.length) return '<p>No materials listed.</p>';
    return `<div class="table-wrap"><table><thead><tr><th>Material</th><th>Qty</th><th>Range</th><th>Live</th></tr></thead><tbody>${items.map((m) => `
      <tr><td>${esc(m.name)}<br><small>${esc(m.notes || '')}</small></td><td>${esc(m.quantity)}</td><td>${money(m.estimated_cost_low)}–${money(m.estimated_cost_high)}</td><td>${m.live_pricing_available ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody></table></div>`;
  };

  const laborTable = (items = []) => {
    if (!items.length) return '<p>No labor listed.</p>';
    return `<div class="table-wrap"><table><thead><tr><th>Labor</th><th>Hours</th><th>Notes</th></tr></thead><tbody>${items.map((l) => `
      <tr><td>${esc(l.name)}<br><small>${esc(l.description || '')}</small></td><td>${esc(l.low_hours)}–${esc(l.high_hours)}</td><td>${esc(l.notes || '')}</td></tr>`).join('')}</tbody></table></div>`;
  };

  const renderDraft = (entry) => {
    const d = entry.aiDraft || entry;
    const req = d.request || entry.requestPayload || {};
    const totals = d.totals || {};
    return `
      <article class="draft-card">
        <h2>${esc(d.job_summary || 'AI quote draft')}</h2>
        <div>
          <span class="pill ${d.quote_ready ? 'good' : 'warn'}">${d.quote_ready ? 'Quote ready' : 'Needs info'}</span>
          <span class="pill">${esc(d.category || '')}</span>
          <span class="pill">${esc(d.work_scope || '')}</span>
          <span class="pill">${esc(entry.createdAt || d.createdAt || '')}</span>
        </div>
        <p><strong>Customer:</strong> ${esc(req.name || '')} ${esc(req.phone || '')} ${esc(req.email || '')}</p>
        <p><strong>Address:</strong> ${esc(req.streetAddress || '')} ${esc(req.city || '')}</p>
        <p><strong>Total:</strong> ${money(totals.total_low)}–${money(totals.total_high)} | <strong>Labor:</strong> ${esc(totals.labor_hours_low)}–${esc(totals.labor_hours_high)} hrs</p>
        <div class="dashboard-grid">
          <div class="card"><h3>Missing Questions</h3>${list(d.questions_to_customer || d.missing_required_info || [])}</div>
          <div class="card"><h3>Risks / Licensed Trade</h3>${list([...(d.risk_flags || []), ...(d.licensed_trade_flags || []), ...(d.permit_flags || [])])}</div>
        </div>
        <div class="dashboard-grid" style="margin-top:16px">
          <div class="card"><h3>Labor</h3>${laborTable(d.labor_items || [])}</div>
          <div class="card"><h3>Materials</h3>${materialsTable(d.materials || [])}</div>
        </div>
        <div class="card" style="margin-top:16px"><h3>Customer Quote Draft</h3><pre>${esc(d.customer_facing_quote || '')}</pre></div>
        <div class="card" style="margin-top:16px"><h3>Internal Technician Notes</h3><pre>${esc(d.internal_technician_notes || '')}</pre></div>
      </article>`;
  };

  const localBackups = () => {
    try {
      return JSON.parse(localStorage.getItem('aiQuoteDraftBackups') || '[]').map((x, i) => ({ id: `local_${i}`, createdAt: x.savedAt, aiDraft: x.aiDraft }));
    } catch { return []; }
  };

  const load = async () => {
    setStatus('Loading drafts…');
    root.innerHTML = '';
    let drafts = [];
    try {
      const response = await fetch('/api/ai-quote-drafts', { headers: { accept: 'application/json' } });
      const result = await response.json().catch(() => ({}));
      drafts = Array.isArray(result.drafts) ? result.drafts : [];
      if (!result.persisted) drafts = [...drafts, ...localBackups()];
    } catch {
      drafts = localBackups();
    }

    if (!drafts.length) {
      setStatus('No drafts found yet.');
      root.innerHTML = '<div class="draft-card"><h2>No AI drafts yet</h2><p>Submit a request from the homepage to generate the first draft.</p></div>';
      return;
    }

    setStatus(`${drafts.length} draft(s) found.`);
    root.innerHTML = drafts.map(renderDraft).join('');
  };

  refresh?.addEventListener('click', load);
  load();
})();
