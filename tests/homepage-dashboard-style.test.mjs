import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const loadHomeHtml = () => readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const loadHomeCss = () => readFile(new URL('../public/assets/css/public.css', import.meta.url), 'utf8');

test('homepage is customer-facing and avoids platform sales language', async () => {
  const html = await loadHomeHtml();

  assert.match(html, /Contracting help without the runaround\./, 'homepage should lead with a customer-facing contracting message');
  assert.match(html, /T&amp;A Contracting helps homeowners, landlords, property managers, and small businesses/, 'homepage should describe who the company helps');
  assert.match(html, /Serving Phoenix, Goodyear, Surprise, Scottsdale, Chandler/, 'homepage should state the service area');
  assert.match(html, />Request Estimate</, 'homepage should expose Request Estimate as the primary CTA');
  assert.match(html, />View Services</, 'homepage should expose a simple services CTA');
  assert.doesNotMatch(html, /Start Free|Request Demo|Revenue|Jobs Managed|AI Estimates Created|Contractor CMMS \+ AI Quoting Platform|Run Your Entire Contracting Business From One Platform/, 'homepage should not use SaaS/platform or internal metrics language');
});

test('homepage type-of-work options match the approved customer categories', async () => {
  const html = await loadHomeHtml();
  const expected = ['HVAC','Water Heaters','Plumbing','Electrical','Drywall','Painting','Doors','Windows','Appliances','Handyman','Facilities Maintenance','Property Maintenance','Commercial Maintenance','General Contracting','Tenant Improvements','Other / Not Sure'];

  for (const option of expected) assert.match(html, new RegExp(`<option>${option.replace('/', '\\/')}</option>|<span>${option.replace('/', '\\/')}</span>`), `${option} should appear as an approved type of work`);
  assert.doesNotMatch(html, /Roofing|Flooring|Mini Splits/, 'removed categories should not be shown on the public homepage');
});

test('homepage customer cleanup styles support larger logos, cards, form, and mobile layout', async () => {
  const css = await loadHomeCss();

  assert.match(css, /\/\* Customer-facing homepage cleanup \*\//, 'homepage should include the customer cleanup style layer');
  assert.match(css, /\.customer-public-header \.brand-logo \{[\s\S]*height: clamp\(52px, 5vw, 64px\)/, 'desktop logo should be larger');
  assert.match(css, /@media \(max-width: 820px\) \{[\s\S]*\.customer-public-header \.brand-logo \{[\s\S]*height: clamp\(42px, 12vw, 48px\)/, 'mobile logo should stay large and clean');
  assert.match(css, /\.customer-service-grid \.card \{[\s\S]*border-radius: 26px/, 'service cards should receive customer-facing polish');
  assert.match(css, /\.request-estimate-card \.field input,[\s\S]*min-height: 48px/, 'request form fields should be easy to tap');
});

test('generated out homepage matches the customer-facing public homepage', async () => {
  const [publicHtml, outHtml] = await Promise.all([
    readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../out/index.html', import.meta.url), 'utf8'),
  ]);

  for (const signature of [
    'Contracting help without the runaround.',
    'Request Estimate',
    'Other / Not Sure',
    'Client Portal / Dashboard',
  ]) {
    assert.equal(publicHtml.includes(signature), true, `public homepage should include ${signature}`);
    assert.equal(outHtml.includes(signature), true, `out homepage should include ${signature}`);
  }
}
);
