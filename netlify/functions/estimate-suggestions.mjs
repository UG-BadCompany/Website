const json = (status, body) => Response.json(body, {
  status,
  headers: {
    'cache-control': 'no-store',
  },
});

const clean = (value, max = 2000) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const loadDatabase = async () => {
  const { getDatabase } = await import('@netlify/database');
  return getDatabase();
};

const parseTerms = (value) => value.toLowerCase().split(',').map((term) => term.trim()).filter(Boolean);

const includesAny = (text, terms) => terms.length === 0 || terms.some((term) => text.includes(term));

const hasMeasurement = (value) => /(\b\d+\s*(ft|feet|foot|in|inch|inches|sq\s*ft|sqft|gallon|gal|ton|tons|amp|amps|v|volt|volts)\b)/.test(value);

const fallbackPrompts = (context) => {
  const suggestions = [];

  if (!/address|street|unit|apt|suite|property/.test(context)) suggestions.push('Exact job location (address, unit/suite, and gate/access notes).');
  if (!/asap|urgent|week|date|schedule|timeframe|tomorrow|today|next|flexible/.test(context)) suggestions.push('Preferred schedule/timeframe (ASAP, this week, or flexible).');
  if (!hasMeasurement(context)) suggestions.push('Approximate quantities or measurements (feet, dimensions, count, voltage, etc.).');

  if (/mini split|minisplit|mini-split/.test(context) && /new install|installation|install/.test(context)) {
    if (!/(\b\d+\s*(ft|feet|foot)\b)|(electrical run)/.test(context)) suggestions.push('About how many feet of electrical will need to be run for the mini split install?');
    if (!/(110|115|120|208|220|230|240)\s*v|voltage/.test(context)) suggestions.push('What voltage is needed (for example 120V or 240V)?');
    if (!/breaker|amp|amperage|panel/.test(context)) suggestions.push('What breaker size is expected, and is new panel space needed?');
  }

  return suggestions;
};

export const createEstimateSuggestionsHandler = ({ getDatabase = loadDatabase } = {}) => async (request) => {
  if (request.method !== 'GET') {
    return json(405, { ok: false, message: 'Method not allowed.' });
  }

  const url = new URL(request.url);
  const q = clean(url.searchParams.get('q') || '');
  const service = clean(url.searchParams.get('service') || '', 120).toLowerCase();
  const scope = clean(url.searchParams.get('scope') || '', 120).toLowerCase();
  const category = clean(url.searchParams.get('category') || '', 120).toLowerCase();
  const context = `${q} ${service} ${scope} ${category}`.toLowerCase().trim();

  if (!context) {
    return json(200, { ok: true, suggestions: [] });
  }

  try {
    const db = await getDatabase();
    const rules = await db.sql`
      select id, trigger_terms, prompt_text, service_filter, scope_filter, category_filter
      from estimate_prompt_rules
      where is_active = true
      order by priority asc, id asc
      limit 200
    `;

    const suggestions = [];
    for (const rule of rules) {
      if (!includesAny(context, parseTerms(rule.trigger_terms || ''))) continue;
      if (rule.service_filter && !includesAny(service, parseTerms(rule.service_filter))) continue;
      if (rule.scope_filter && !includesAny(scope, parseTerms(rule.scope_filter))) continue;
      if (rule.category_filter && !includesAny(category, parseTerms(rule.category_filter))) continue;
      suggestions.push(rule.prompt_text);
    }

    const merged = [...new Set([...suggestions, ...fallbackPrompts(context)])].slice(0, 8);
    return json(200, { ok: true, suggestions: merged });
  } catch (error) {
    console.error('Failed to load estimate suggestion prompts', error);
    return json(200, { ok: true, suggestions: fallbackPrompts(context), fallback: true });
  }
};

export default createEstimateSuggestionsHandler();

export const config = {
  path: '/api/estimate-suggestions',
};
