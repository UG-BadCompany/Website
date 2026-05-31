import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readText } from './browser-qa-utils.mjs';

class FakeElement {
  constructor(tagName = 'div', attrs = {}) {
    this.tagName = tagName.toUpperCase();
    this.dataset = { ...(attrs.dataset || {}) };
    this.attributes = {};
    this.children = [];
    this.parentElement = null;
    this.hidden = Boolean(attrs.hidden);
    this.listeners = {};
    this.classList = { toggles: [], toggle: (name, active) => this.classList.toggles.push([name, active]) };
    this.textContent = attrs.textContent || '';
    this.id = attrs.id || '';
    this.href = attrs.href || '';
    this.scrolled = false;
  }
  append(child) { child.parentElement = this; this.children.push(child); return child; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  setAttribute(name, value) { this.attributes[name] = String(value); if (name === 'aria-expanded') this.ariaExpanded = String(value); }
  getAttribute(name) { if (name === 'href') return this.href; return this.attributes[name] || ''; }
  scrollIntoView() { this.scrolled = true; }
  focus() { this.focused = true; }
  matches(selector) { return matches(this, selector); }
  closest(selector) { let node = this; while (node) { if (matches(node, selector)) return node; node = node.parentElement; } return null; }
  dispatch(type) {
    const event = { type, target: this, prevented: false, preventDefault() { this.prevented = true; }, stopPropagation() {} };
    for (const handler of this.listeners[type] || []) handler(event);
    return event;
  }
}

const dataName = (selector) => selector.match(/^\[data-([\w-]+)\]$/)?.[1]?.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const matches = (el, selector) => selector.split(',').some((raw) => {
  const part = raw.trim();
  if (part === 'a') return el.tagName === 'A';
  if (part === 'button') return el.tagName === 'BUTTON';
  if (part.startsWith('#')) return el.id === part.slice(1);
  const data = dataName(part);
  return data ? Object.prototype.hasOwnProperty.call(el.dataset, data) : false;
});

const hasAncestor = (el, selector) => { let node = el.parentElement; while (node) { if (matches(node, selector)) return true; node = node.parentElement; } return false; };
const collect = (root, selector, out = []) => {
  if (selector.includes(' ')) {
    const [ancestorSelector, childSelector] = selector.split(/\s+/, 2);
    return collect(root, childSelector).filter((el) => hasAncestor(el, ancestorSelector));
  }
  if (matches(root, selector)) out.push(root);
  for (const child of root.children || []) collect(child, selector, out);
  return out;
};

test('dashboard view helpers expose admin/owner all-view access and toggle real section visibility', async () => {
  const bootstrap = await readText('public/dashboard/modules/dashboard/bootstrap.js');
  const start = bootstrap.indexOf('const applyDashboardSectionVisibility');
  const end = bootstrap.indexOf('const configureDashboardForUser');
  const snippet = bootstrap.slice(start, end);
  const context = { window: {} };
  vm.runInNewContext(snippet, context);
  const hooks = context.window.taDashboardViewTestHooks;

  assert.deepEqual(Array.from(hooks.getAvailableDashboardViews({ roles: ['owner'], permissions: { availableViews: ['admin'] } })), ['admin', 'client', 'worker']);
  assert.deepEqual(Array.from(hooks.getAvailableDashboardViews({ roles: [], permissions: { canManageUsers: true, availableViews: ['admin'] } })), ['admin', 'client', 'worker']);

  const admin = new FakeElement('section', { dataset: { views: 'admin' } });
  const client = new FakeElement('section', { dataset: { views: 'client' } });
  const worker = new FakeElement('section', { dataset: { views: 'worker' } });
  hooks.applyDashboardSectionVisibility([admin, client, worker], 'client', { permissions: {} });
  assert.equal(admin.hidden, true);
  assert.equal(client.hidden, false);
  assert.equal(worker.hidden, true);

  const adminButton = new FakeElement('button', { dataset: { viewButton: 'admin' } });
  const clientButton = new FakeElement('button', { dataset: { viewButton: 'client' } });
  hooks.applyDashboardViewButtonState([adminButton, clientButton], 'client');
  assert.equal(adminButton.attributes['aria-pressed'], 'false');
  assert.equal(clientButton.attributes['aria-pressed'], 'true');
});

test('mobile dashboard script opens FAB once and routes data-mobile-fab-action actions', async () => {
  const code = await readText('public/assets/mobile-dashboard-ux.js');
  const body = new FakeElement('body');
  const html = new FakeElement('html');
  const fab = body.append(new FakeElement('button', { dataset: { mobileFab: '' } }));
  const menu = body.append(new FakeElement('div', { dataset: { mobileFabMenu: '' }, hidden: true }));
  const request = menu.append(new FakeElement('a', { href: '#client-requests', dataset: { mobileFabAction: 'request', mobileWorkspaceLink: 'client-requests' } }));
  const customer = menu.append(new FakeElement('button', { dataset: { mobileFabAction: 'customer', mobileMoreKey: 'customers' } }));
  const clientTarget = body.append(new FakeElement('section', { id: 'client-requests' }));
  body.append(new FakeElement('section', { id: 'customer-experience-center' }));

  const workspaceCalls = [];
  const context = {
    window: {
      __taMobileDashboardUxLoaded: false,
      PointerEvent: function PointerEvent() {},
      innerWidth: 390,
      location: { href: '/dashboard/' },
      setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 1; },
      clearTimeout: () => {},
      requestIdleCallback: (fn) => fn(),
      addEventListener: () => {},
      taSetSidebarWorkspace: (workspace, options) => workspaceCalls.push([workspace, options]),
    },
    document: {
      body,
      documentElement: html,
      readyState: 'complete',
      querySelector: (selector) => collect(body, selector)[0] || (matches(html, selector) ? html : null),
      querySelectorAll: (selector) => collect(body, selector),
      addEventListener: () => {},
    },
    MutationObserver: class { observe() {} },
    setTimeout: (fn) => { if (typeof fn === 'function') fn(); return 1; },
    clearTimeout: () => {},
    console,
  };
  context.window.document = context.document;
  context.window.setTimeout = context.window.setTimeout;
  vm.runInNewContext(code, context);

  fab.dispatch('pointerup');
  assert.equal(menu.hidden, false, 'FAB should open on pointerup');
  fab.dispatch('click');
  assert.equal(menu.hidden, false, 'synthetic click after pointerup should not double-toggle closed');

  request.dispatch('pointerup');
  assert.deepEqual(workspaceCalls.at(-1)?.[0], 'client-requests');
  assert.equal(menu.hidden, true);
  assert.equal(clientTarget.scrolled, false, 'workspace API handles the route before fallback scrolling');

  menu.hidden = false;
  customer.dispatch('pointerup');
  assert.deepEqual(workspaceCalls.at(-1)?.[0], 'customer-status');
  assert.equal(menu.hidden, true);
});
