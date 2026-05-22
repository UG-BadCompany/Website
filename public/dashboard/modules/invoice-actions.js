(() => {
  const openClientPaymentLink = (checkoutUrl) => {
    if (!checkoutUrl) return;
    const popup = window.open(checkoutUrl, '_blank', 'noopener');
    if (!popup) window.location.href = checkoutUrl;
  };

  const attachClientInvoiceActions = (invoiceList, { renderClientInvoiceData } = {}) => {
    if (!invoiceList || invoiceList.dataset.boundPayLink) return;
    invoiceList.dataset.boundPayLink = 'true';
    invoiceList.addEventListener('click', async (event) => {
      const payButton = event.target.closest('[data-client-pay-invoice]');
      if (payButton) {
        openClientPaymentLink(payButton.dataset.clientPayInvoice);
        return;
      }

      const pendingButton = event.target.closest('[data-client-payment-link-pending]');
      if (!pendingButton) return;

      pendingButton.disabled = true;
      const priorText = pendingButton.textContent;
      pendingButton.textContent = 'Checking for payment link…';
      try {
        const response = await fetch('/api/client/invoices', { headers: { accept: 'application/json' } });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.message || 'Your invoices are not available.');
        if (typeof renderClientInvoiceData === 'function') renderClientInvoiceData(result);
        const invoiceId = pendingButton.dataset.clientInvoiceId;
        const refreshedInvoice = (result.invoices || []).find((invoice) => invoice.id === invoiceId);
        const checkoutUrl = refreshedInvoice?.provider?.checkoutUrl || '';
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
          return;
        }
        window.alert('This invoice still does not have a payment link yet. Please contact support to request the link.');
      } catch (error) {
        window.alert(error.message || 'We could not check for a payment link right now.');
      } finally {
        pendingButton.disabled = false;
        pendingButton.textContent = priorText;
      }
    });
  };

  const attachAdminInvoiceActions = (panel, { loadAdminInvoices } = {}) => {
    if (!panel || panel.dataset.invoiceActionsBound) return;
    panel.dataset.invoiceActionsBound = 'true';
    panel.addEventListener('click', async (event) => {
      const linkButton = event.target.closest('[data-admin-create-payment-link]');
      if (linkButton) {
        linkButton.disabled = true;
        const status = document.querySelector('[data-admin-invoices-status]');
        try {
          if (status) status.textContent = 'Creating Square payment link…';
          const response = await fetch('/api/admin/square/payment-link', {
            method: 'POST',
            headers: { accept: 'application/json', 'content-type': 'application/json' },
            body: JSON.stringify({ invoiceId: linkButton.dataset.adminCreatePaymentLink }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.ok) throw new Error(result.message || 'Could not create payment link.');
          if (typeof loadAdminInvoices === 'function') await loadAdminInvoices();
          if (status) status.textContent = 'Payment link created.';
        } catch (error) {
          if (status) {
            status.dataset.state = 'error';
            status.textContent = error.message;
          }
        } finally {
          linkButton.disabled = false;
        }
        return;
      }
    });
  };

  window.taInvoiceActions = {
    attachAdminInvoiceActions,
    attachClientInvoiceActions,
    openClientPaymentLink,
  };
})();
