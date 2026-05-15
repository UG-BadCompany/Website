const fs = require('node:fs');

const files = [
  'public/dashboard/index.html',
  'out/dashboard/index.html',
];

const replacement = `      const loadSignedInDashboard = async () => {
        try {
          const response = await fetch('/api/me', {
            headers: { accept: 'application/json' },
          });
          const result = await response.json().catch(() => ({}));

          if (!response.ok || !result.authenticated) {
            status.dataset.state = 'error';
            status.innerHTML = 'Secure dashboard access requires a verified magic-link session. <a href="/login/">Request a magic link</a>.';
            return;
          }

          status.dataset.state = 'ready';
          status.textContent = \`Signed in as \${result.user.email}. Roles: \${result.user.roles.join(', ') || 'none yet'}.\`;
          renderClientProfile(result.user);

          if (logoutButton) {
            logoutButton.hidden = false;
          }

          if (profileButton) {
            profileButton.hidden = false;
          }

          bindLogout();
          bindClientProfileButton();
          bindRequestEstimateLink();
          configureDashboardForUser(result.user);

          if (result.user.permissions?.canViewClientTools) {
            bindClientProfileForm();
            bindClientRequestForm();
            bindClientRequestEditActions();
            bindClientPropertyActions();
            bindQuoteDecisionActions();
            loadClientRequests();
            loadClientQuotes();
          }

          if (result.user.permissions?.canViewWorkerTools) {
            bindWorkerJobActions();
            loadWorkerJobs();
          }

          if (result.user.permissions?.canManageRequests) {
            loadAdminRequests();
          }

          if (result.user.permissions?.canManageUsers || result.user.permissions?.canManageRoles) {
            loadAdminAccess();
          }
        } catch {
          status.dataset.state = 'error';
          status.textContent = 'Session check is unavailable in this local/static preview. Deploy Netlify Functions to verify portal access.';
        }
      };

      loadSignedInDashboard();
`;

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.warn(`Skipped missing file: ${file}`);
    continue;
  }

  const original = fs.readFileSync(file, 'utf8');

  const fetchStart = original.lastIndexOf("      fetch('/api/me'");
  const iifeEnd = original.indexOf('    })();', fetchStart);

  if (fetchStart === -1 || iifeEnd === -1) {
    throw new Error(`Could not find the dashboard session block in ${file}`);
  }

  const updated = `${original.slice(0, fetchStart)}${replacement}${original.slice(iifeEnd)}`;

  fs.writeFileSync(file, updated);
  console.log(`Updated ${file}`);
}
