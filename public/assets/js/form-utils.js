(() => {
  const canQuery = (root) => root && typeof root.querySelectorAll === 'function';
  const resolveRoot = (root) => canQuery(root) ? root : (root?.root || root?.element || document);
  const normalizeValue = (value) => typeof value === 'string' ? value.trim() : value;
  const escapeSelectorValue = (value) => window.CSS?.escape ? CSS.escape(value) : String(value).replace(/[\\"']/g, '\\$&');

  const addValue = (result, key, value) => {
    if (!key) return;
    const normalized = normalizeValue(value);
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      result[key] = Array.isArray(result[key]) ? result[key] : [result[key]];
      result[key].push(normalized);
      return;
    }
    result[key] = normalized;
  };

  window.TAForms = {
    values(form, options = {}) {
      if (!form || typeof form.querySelectorAll !== 'function') return {};
      const result = {};
      const fields = Array.from(form.querySelectorAll('input, textarea, select'));

      fields.forEach((field) => {
        const name = field.name;
        if (!name) return;
        if (field.disabled && !options.includeDisabled) return;

        const type = String(field.type || '').toLowerCase();
        if (type === 'checkbox') {
          if (field.checked) addValue(result, name, field.value || 'on');
          return;
        }
        if (type === 'radio') {
          if (field.checked) addValue(result, name, field.value);
          return;
        }
        if (field.tagName === 'SELECT' && field.multiple) {
          const selected = Array.from(field.selectedOptions || []).map((option) => normalizeValue(option.value));
          if (selected.length) result[name] = selected;
          return;
        }
        if (type === 'file') {
          const files = Array.from(field.files || []);
          if (files.length) result[name] = field.multiple ? files : files[0];
          return;
        }
        addValue(result, name, field.value);
      });

      return result;
    },
    checkedValues(root, name) {
      const scope = resolveRoot(root);
      if (!canQuery(scope) || !name) return [];
      return Array.from(scope.querySelectorAll(`input[name="${escapeSelectorValue(name)}"]:checked`))
        .filter((input) => !input.disabled)
        .map((input) => normalizeValue(input.value));
    },
    lines(root, selector) {
      const scope = resolveRoot(root);
      if (!canQuery(scope) || !selector) return [];
      return Array.from(scope.querySelectorAll(selector)).map((row) => this.values(row));
    },
    moneyToCents(value) { return Math.round(Math.max(0, Number(value || 0)) * 100); },
    centsToMoney(value) { return (Number(value || 0) / 100).toFixed(2); },
  };
})();
