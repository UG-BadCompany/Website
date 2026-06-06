(() => {
  const escapeHtml = (value = '') => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[char]));
  const defaults = () => ({ ...window.TACompany?.fallback, ...window.TATheme?.defaults });
  const hexOk = (value) => /^#[0-9a-f]{6}$/i.test(String(value || '').trim());
  const paletteFallback = (key) => ({ sidebarBackgroundColor:'#0f172a', sidebarTextColor:'#e5edf7', sidebarActiveColor:'#2563eb', sidebarBorderColor:'#1e293b', sidebarHoverColor:'#1e293b', mobileNavBackgroundColor:'#0f172a', mobileNavTextColor:'#e5edf7', mobileNavActiveColor:'#2563eb', mobileNavBorderColor:'#1e293b' }[key] || defaults()[key] || '#2563EB');
  const normalizeHex = (value, fallback) => hexOk(value) ? String(value).trim().toUpperCase() : (hexOk(fallback) ? String(fallback).trim().toUpperCase() : '#2563EB');
  const colors = [
    ['primaryColor', 'Primary Color'],
    ['accentColor', 'Accent Color'],
    ['backgroundColor', 'Background Color'],
    ['surfaceColor', 'Surface / Card Color'],
    ['textColor', 'Text Color'],
    ['buttonColor', 'Button Color'],
    ['successColor', 'Success Color'],
    ['warningColor', 'Warning Color'],
    ['dangerColor', 'Danger Color'],
  ];
  const sidebarColors = [
    ['sidebarBackgroundColor', 'Sidebar Background Color'],
    ['sidebarTextColor', 'Sidebar Text Color'],
    ['sidebarActiveColor', 'Sidebar Active Item Color'],
    ['sidebarBorderColor', 'Sidebar Border Color'],
    ['sidebarHoverColor', 'Sidebar Hover Color'],
    ['mobileNavBackgroundColor', 'Mobile Bottom Nav Background Color'],
    ['mobileNavTextColor', 'Mobile Bottom Nav Text Color'],
    ['mobileNavActiveColor', 'Mobile Bottom Nav Active Color'],
    ['mobileNavBorderColor', 'Mobile Bottom Nav Border Color'],
  ];
  const allColors = [...colors, ...sidebarColors];

  window.TAModules.register({
    id: 'admin.brand-settings',
    role: 'admin',
    title: 'Brand Settings',
    icon: '🎨',
    permissions: ['branding.manage', 'company.manage'],
    async mount({ root, api }) { root = root?.querySelector ? root : root?.root || root?.element || document.querySelector('[data-module-root], #module-root'); if (!root?.querySelector) throw new TypeError('Module root element was not found.');
      let company = window.TACompany?.current || window.TACompany?.fallback || {};

      const readState = () => {
        const values = window.TAForms.values(root.querySelector('[data-brand-form]'));
        values.enableThemeToggle = Boolean(root.querySelector('[name="enableThemeToggle"]')?.checked);
        values.showCompanyNameInHeader = Boolean(root.querySelector('[name="showCompanyNameInHeader"]')?.checked);
        values.customSidebarColorsEnabled = Boolean(root.querySelector('[name="customSidebarColorsEnabled"]')?.checked);
        values.customMobileNavColorsEnabled = Boolean(root.querySelector('[name="customMobileNavColorsEnabled"]')?.checked);
        values.defaultTheme = values.themeMode || values.defaultTheme || 'system';
        for (const [key] of allColors) {
          const hex = root.querySelector(`[data-color-hex="${key}"]`)?.value;
          values[key] = normalizeHex(hex, paletteFallback(key));
        }
        return { ...company, ...values };
      };

      const applyPreview = () => {
        const state = readState();
        window.TATheme?.apply(state);
        renderPreview(state);
      };

      const renderColorControl = ([key, label]) => {
        const value = normalizeHex(company[key], paletteFallback(key));
        return `<label class="color-control" data-color-control="${key}">
          <span>${label}</span>
          <span class="color-control-row">
            <input type="color" name="${key}" value="${value}" data-color-swatch="${key}" aria-label="${label} swatch">
            <input class="color-hex" value="${value}" maxlength="7" data-color-hex="${key}" aria-label="${label} hex value">
            <button class="btn secondary" type="button" data-reset-color="${key}">Reset</button>
          </span>
        </label>`;
      };

      const renderPreview = (state) => {
        const preview = root.querySelector('[data-brand-preview]');
        if (!preview) return;
        const initials = window.TACompany?.initials?.(state.displayName || state.companyName) || 'YC';
        preview.style.setProperty('--preview-bg', state.backgroundColor || defaults().backgroundColor);
        preview.style.setProperty('--preview-surface', state.surfaceColor || defaults().surfaceColor);
        preview.style.setProperty('--preview-text', state.textColor || defaults().textColor);
        preview.style.setProperty('--preview-primary', state.primaryColor || defaults().primaryColor);
        preview.style.setProperty('--preview-button', state.buttonColor || state.primaryColor || defaults().buttonColor);
        const resolvedMode = window.TATheme?.resolveThemeMode?.(state.themeMode || state.defaultTheme || 'system') || 'light';
        const palette = window.TATheme?.palettes?.[resolvedMode] || {};
        preview.style.setProperty('--preview-sidebar-bg', state.customSidebarColorsEnabled ? (state.sidebarBackgroundColor || palette.sidebarBackgroundColor) : palette.sidebarBackgroundColor);
        preview.style.setProperty('--preview-sidebar-text', state.customSidebarColorsEnabled ? (state.sidebarTextColor || palette.sidebarTextColor) : palette.sidebarTextColor);
        preview.style.setProperty('--preview-sidebar-active', state.customSidebarColorsEnabled ? (state.sidebarActiveColor || palette.sidebarActiveColor) : palette.sidebarActiveColor);
        preview.innerHTML = `<div class="brand-preview-shell">
          <header class="brand-preview-header">
            <div class="brand-preview-brand">
              ${state.logoUrl ? `<img class="brand-logo" src="${escapeHtml(state.logoUrl)}" alt="Logo preview">` : `<span class="brand-logo">${escapeHtml(initials)}</span>`}
              ${state.showCompanyNameInHeader ? `<strong>${escapeHtml(state.displayName || state.companyName || 'Contractor Portal')}</strong>` : ''}
            </div>
            <nav class="brand-preview-nav" aria-label="Preview navigation"><span>Overview</span><span>Requests</span><span>Invoices</span></nav>
          </header>
          <aside class="brand-preview-sidebar"><strong>Sidebar</strong><span class="active">Active item</span><span>Hover preview</span></aside><article class="brand-preview-card">
            <span class="status-badge success">Live preview badge</span>
            <h3>${escapeHtml(state.displayName || state.companyName || 'Contractor Portal')}</h3>
            <p>Sample dashboard card using your saved theme colors.</p>
            <input value="Readable sample input" readonly>
            <div class="action-row">
              <button class="btn" type="button">Primary button</button>
              <button class="btn secondary" type="button">Secondary</button>
            </div>
          </article>
        </div>`;
      };

      const syncColor = (key, value, source) => {
        const fallback = paletteFallback(key);
        const normalized = normalizeHex(value, fallback);
        const swatch = root.querySelector(`[data-color-swatch="${key}"]`);
        const hex = root.querySelector(`[data-color-hex="${key}"]`);
        if (swatch && source !== 'swatch') swatch.value = normalized;
        if (hex && source !== 'hex') hex.value = normalized;
        applyPreview();
      };

      const bind = () => {
        root.querySelectorAll('[data-color-swatch]').forEach((input) => {
          input.addEventListener('input', () => syncColor(input.dataset.colorSwatch, input.value, 'swatch'));
          input.addEventListener('change', () => syncColor(input.dataset.colorSwatch, input.value, 'swatch'));
        });
        root.querySelectorAll('[data-color-hex]').forEach((input) => {
          input.addEventListener('input', () => {
            if (hexOk(input.value)) syncColor(input.dataset.colorHex, input.value, 'hex');
          });
          input.addEventListener('blur', () => syncColor(input.dataset.colorHex, input.value, 'hex'));
        });
        root.querySelectorAll('[data-reset-color]').forEach((button) => {
          button.addEventListener('click', () => syncColor(button.dataset.resetColor, defaults()[button.dataset.resetColor], 'reset'));
        });
        root.querySelector('[data-reset-theme]')?.addEventListener('click', () => {
          company = { ...company, ...defaults(), themeMode: 'system', defaultTheme: 'system' };
          render();
        });
        root.querySelectorAll('input:not([type="color"]), select').forEach((input) => {
          input.addEventListener('input', applyPreview);
          input.addEventListener('change', applyPreview);
        });
        root.querySelector('[data-brand-form]')?.addEventListener('submit', save);
      };

      const save = async (event) => {
        event.preventDefault();
        const button = root.querySelector('[data-save-brand]');
        const status = root.querySelector('[data-brand-status]');
        const payload = readState();
        const requiredPayload = {
          companyName: payload.companyName,
          displayName: payload.displayName,
          logoUrl: payload.logoUrl,
          faviconUrl: payload.faviconUrl,
          themeMode: payload.themeMode,
          defaultTheme: payload.defaultTheme,
          enableThemeToggle: payload.enableThemeToggle,
          showCompanyNameInHeader: payload.showCompanyNameInHeader,
          primaryColor: payload.primaryColor,
          accentColor: payload.accentColor,
          backgroundColor: payload.backgroundColor,
          surfaceColor: payload.surfaceColor,
          textColor: payload.textColor,
          buttonColor: payload.buttonColor,
          successColor: payload.successColor,
          warningColor: payload.warningColor,
          dangerColor: payload.dangerColor,
          selectedTheme: payload.themeMode,
          colorScheme: payload.themeMode,
          sidebarBackgroundColor: payload.sidebarBackgroundColor,
          sidebarTextColor: payload.sidebarTextColor,
          sidebarActiveColor: payload.sidebarActiveColor,
          sidebarBorderColor: payload.sidebarBorderColor,
          sidebarHoverColor: payload.sidebarHoverColor,
          mobileNavBackgroundColor: payload.mobileNavBackgroundColor,
          mobileNavTextColor: payload.mobileNavTextColor,
          mobileNavActiveColor: payload.mobileNavActiveColor,
          mobileNavBorderColor: payload.mobileNavBorderColor,
          customSidebarColorsEnabled: payload.customSidebarColorsEnabled,
          customMobileNavColorsEnabled: payload.customMobileNavColorsEnabled,
          hasCustomSidebarColors: payload.customSidebarColorsEnabled,
        };
        button.disabled = true;
        status.textContent = 'Saving brand settings...';
        try {
          const saved = await api.patch('/.netlify/functions/company-settings', requiredPayload);
          company = window.TACompany?.norm?.(saved.company || saved.settings || requiredPayload) || requiredPayload;
          window.TACompany?.apply(company);
          window.TAUi?.toast('Brand settings saved and applied.', 'success');
          status.textContent = 'Saved. Theme and brand preview are live.';
        } catch (error) {
          status.textContent = error.message || 'Unable to save brand settings.';
          window.TAUi?.toast(status.textContent, 'error');
        } finally {
          button.disabled = false;
        }
      };

      const render = () => {
        const mode = company.themeMode || company.defaultTheme || 'system';
        root.innerHTML = `<section class="module-page stack brand-settings-page">
          <form class="card module-section stack" data-brand-form>
            <div class="module-header brand-settings-head">
              <div>
                <p class="eyebrow">Theme Manager</p>
                <h2 class="module-title">🎨 Brand Settings</h2>
                <p class="module-description">Control company identity, theme mode, readable color tokens, and live dashboard branding without refreshing the page.</p>
              </div>
              <div class="module-actions action-row">
                <button class="btn secondary" type="button" data-reset-theme>Reset Theme Defaults</button>
                <button class="btn" type="submit" data-save-brand>Save Brand Settings</button>
              </div>
            </div>

            <div class="form-grid">
              <label class="field"><span>Company Name</span><input name="companyName" value="${escapeHtml(company.companyName || '')}" placeholder="Your company"></label>
              <label class="field"><span>Display Name</span><input name="displayName" value="${escapeHtml(company.displayName || '')}" placeholder="Contractor Portal"></label>
              <label class="field"><span>Logo URL</span><input name="logoUrl" value="${escapeHtml(company.logoUrl || '')}" placeholder="https://..."></label>
              <label class="field"><span>Favicon URL</span><input name="faviconUrl" value="${escapeHtml(company.faviconUrl || '')}" placeholder="https://..."></label>
              <label class="field"><span>Default Theme</span><select name="themeMode">
                ${['light', 'dark', 'system'].map((item) => `<option value="${item}" ${mode === item ? 'selected' : ''}>${item[0].toUpperCase() + item.slice(1)}</option>`).join('')}
              </select></label>
              <div class="field stack">
                <label class="pill"><input type="checkbox" name="enableThemeToggle" ${company.enableThemeToggle !== false ? 'checked' : ''}> Enable Theme Toggle</label>
                <label class="pill"><input type="checkbox" name="showCompanyNameInHeader" ${company.showCompanyNameInHeader ? 'checked' : ''}> Show Company Name Beside Logo</label>
              </div>
            </div>

            <h3>Core Theme Colors</h3>
            <div class="module-grid color-settings-grid">
              ${colors.map(renderColorControl).join('')}
            </div>
            <h3>Sidebar Colors</h3>
            <label class="pill"><input type="checkbox" name="customSidebarColorsEnabled" ${company.customSidebarColorsEnabled ? 'checked' : ''}> Use custom sidebar colors</label>
            <p class="notice">Leave unchecked to use the selected Light/Dark/System theme's default sidebar colors.</p>
            <div class="module-grid color-settings-grid" data-sidebar-color-controls>
              ${sidebarColors.slice(0, 5).map(renderColorControl).join('')}
            </div>
            <h3>Mobile Nav Colors</h3>
            <label class="pill"><input type="checkbox" name="customMobileNavColorsEnabled" ${company.customMobileNavColorsEnabled ? 'checked' : ''}> Use custom mobile nav colors</label>
            <p class="notice">Leave unchecked to use the selected Light/Dark/System theme's default mobile bottom nav colors.</p>
            <div class="module-grid color-settings-grid" data-mobile-nav-color-controls>
              ${sidebarColors.slice(5).map(renderColorControl).join('')}
            </div>

            <div class="grid grid-2 brand-preview-grid">
              <section class="card module-card stack">
                <h3>Live Preview Card</h3>
                <p>Every change updates this preview immediately, including light, dark, and system theme modes.</p>
                <div data-brand-preview class="brand-preview"></div>
              </section>
              <section class="card module-card stack">
                <h3>Readable Theme Checklist</h3>
                <p><span class="status-badge success">Inputs</span> Fields use theme-aware backgrounds, text, placeholders, and focus rings.</p>
                <p><span class="status-badge success">Buttons</span> Primary, secondary, ghost, danger, and disabled states remain legible.</p>
                <p><span class="status-badge success">Color pickers</span> Compact swatches and editable hex values stay visible in all themes.</p>
              </section>
            </div>

            <p class="notice" data-brand-status>Brand settings are ready to preview and save.</p>
          </form>
        </section>`;
        bind();
        applyPreview();
      };

      root.innerHTML = '<article class="card module-loading"><h3>Loading Brand Settings</h3><p>Preparing company theme controls...</p></article>';
      try {
        company = await window.TACompany?.load?.() || company;
      } finally {
        company = { ...defaults(), ...company };
        render();
      }
    },
    async destroy() {},
    async refresh() {},
  });
})();
