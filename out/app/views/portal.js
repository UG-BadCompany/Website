import { renderShell } from '../components/shell.js';

export function renderPortal(app, type) {
  const isClient = type === 'client';
  renderShell(app, `
    <section class="grid cards">
      <article class="card"><h2>${isClient ? 'My Requests' : 'Assigned Jobs'}</h2><p>${isClient ? 'Track estimate requests, quotes, approvals, invoices, payments, and photos.' : 'View assigned work, schedule, job details, photos, materials used, and completion tasks.'}</p></article>
      <article class="card"><h2>${isClient ? 'Approvals & Payments' : 'Completion Actions'}</h2><p>${isClient ? 'Approve quotes and view payment instructions even when Square is not configured.' : 'Submit completion notes, photos, and material usage for admin review.'}</p></article>
    </section>`,
    isClient ? 'Client Portal' : 'Worker Portal',
  );
}
