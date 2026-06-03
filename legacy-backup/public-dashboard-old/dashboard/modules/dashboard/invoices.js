(function(){
  const formatInvoiceStatusLabel = (filter = 'open') => {
    if (filter === 'paid') return 'paid invoice';
    if (filter === 'all') return 'invoice';
    return 'open invoice';
  };

  const formatInvoiceEmptyLabel = (filter = 'open') => {
    if (filter === 'paid') return 'No paid invoices found.';
    if (filter === 'all') return 'No invoices found.';
    return 'No open invoices found.';
  };

  window.TADashboardInvoices = window.TADashboardInvoices || {};
  window.TADashboardInvoices.name = 'invoices';
  window.TADashboardInvoices.version = '1.1.0';
  window.TADashboardInvoices.formatInvoiceStatusLabel = formatInvoiceStatusLabel;
  window.TADashboardInvoices.formatInvoiceEmptyLabel = formatInvoiceEmptyLabel;
})();
