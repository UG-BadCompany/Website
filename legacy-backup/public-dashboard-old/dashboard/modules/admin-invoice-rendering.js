(() => {
  const renderAdminInvoiceSummaryCards = (invoices = [], { formatMoney, escapeHtml } = {}) => {
    const openCount = invoices.filter((invoice) => String(invoice.status || '').toLowerCase() !== 'paid').length;
    const paidCount = invoices.length - openCount;
    const openBalanceCents = invoices
      .filter((invoice) => String(invoice.status || '').toLowerCase() !== 'paid')
      .reduce((sum, invoice) => sum + Number(invoice.balanceDueCents ?? invoice.amountDueCents ?? invoice.amountCents ?? 0), 0);
    return `
      <article class="admin-request"><span class="admin-request-badge">Open invoices</span><strong>${openCount}</strong><p>awaiting payment</p></article>
      <article class="admin-request"><span class="admin-request-badge">Paid invoices</span><strong>${paidCount}</strong><p>closed billing records</p></article>
      <article class="admin-request"><span class="admin-request-badge">Open balance</span><strong>${escapeHtml(formatMoney(openBalanceCents))}</strong><p>outstanding amount</p></article>
    `;
  };

  const getInvoiceSearchText = (invoice = {}) => [
    invoice.title,
    invoice.status,
    invoice.client?.fullName,
    invoice.client?.email,
    invoice.jobRequest?.serviceType,
    invoice.jobRequest?.streetAddress,
    invoice.jobRequest?.city,
    invoice.payment?.method,
    invoice.payment?.reference,
  ].filter(Boolean).join(' ').toLowerCase();

  const renderAdminInvoiceData = (
    result,
    { formatMoney, renderInvoiceCard, renderSummaryCards = renderAdminInvoiceSummaryCards, escapeHtml, searchTerm = '' } = {},
  ) => {
    const status = document.querySelector('[data-admin-invoices-status]');
    const list = document.querySelector('[data-admin-invoice-list]');
    const summaryCards = document.querySelector('[data-admin-invoice-kpi-summary]');
    const invoices = result.invoices || [];
    const normalizedSearchTerm = String(searchTerm || '').trim().toLowerCase();
    const visibleInvoices = normalizedSearchTerm
      ? invoices.filter((invoice) => getInvoiceSearchText(invoice).includes(normalizedSearchTerm))
      : invoices;
    const amountDue = result.summary?.amountDueCents || 0;

    if (status) {
      status.dataset.state = 'ready';
      status.textContent = visibleInvoices.length ? `${visibleInvoices.length} invoice${visibleInvoices.length === 1 ? '' : 's'} need follow-up. Open balance: ${formatMoney(amountDue)}.` : 'No open invoices need payment follow-up.';
    }
    if (summaryCards) {
      summaryCards.innerHTML = renderSummaryCards(visibleInvoices, { formatMoney, escapeHtml });
    }
    if (list) {
      list.innerHTML = visibleInvoices.length ? visibleInvoices.map((invoice) => renderInvoiceCard(invoice, { admin: true })).join('') : '<p class="session-status">No invoices match this view.</p>';
    }
  };

  window.taAdminInvoiceRendering = {
    renderAdminInvoiceData,
    renderAdminInvoiceSummaryCards,
  };
})();
