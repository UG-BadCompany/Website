(() => {
  const confirmAdminPayment = async ({
    invoiceId,
    amountCents,
    formatMoney,
    loadAdminInvoices,
  } = {}) => {
    const status = document.querySelector('[data-admin-invoices-status]');
    const method = window.prompt('Payment method (cash, check, card, ACH, etc.)', 'cash');
    if (method === null) return;
    const reference = window.prompt('Payment reference or receipt number (optional)', '') || '';
    if (status) status.textContent = 'Confirming payment…';

    const response = await fetch('/api/admin/invoices', {
      method: 'PATCH',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ invoiceId, amountCents: Number(amountCents), method, reference }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.message || 'Payment could not be confirmed.');
    if (typeof loadAdminInvoices === 'function') await loadAdminInvoices();
    if (status && typeof formatMoney === 'function') {
      status.textContent = `Payment confirmed for ${formatMoney(result.payment?.amountCents || amountCents)}.`;
    }
  };

  const bindAdminConfirmPaymentActions = (panel, options = {}) => {
    if (!panel || panel.dataset.adminConfirmPaymentBound) return;
    panel.dataset.adminConfirmPaymentBound = 'true';
    panel.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-admin-confirm-payment]');
      if (!button) return;
      button.disabled = true;
      try {
        await confirmAdminPayment({
          invoiceId: button.dataset.adminConfirmPayment,
          amountCents: button.dataset.adminPaymentAmount,
          formatMoney: options.formatMoney,
          loadAdminInvoices: options.loadAdminInvoices,
        });
      } catch (error) {
        const status = document.querySelector('[data-admin-invoices-status]');
        if (status) {
          status.dataset.state = 'error';
          status.textContent = error.message;
        }
      } finally {
        button.disabled = false;
      }
    });
  };

  window.taAdminInvoicePayments = {
    bindAdminConfirmPaymentActions,
    confirmAdminPayment,
  };
})();
