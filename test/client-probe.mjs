/**
 * Client-half probe: runs the real `client/client.js` bundle against stubs shaped
 * like the contracts verified in DSH 0.2.0-rc.2, and asserts what the badge
 * renders for each provider.
 *
 * Stubbed contracts (all read out of the 0.2.0-rc.2 build):
 *   window.__ModuleLoader__.load({ id, factory })   the shipped decoration template
 *   factory(require) with require("react")          resolved from the platform seed table
 *   ctx.get(name) / ctx.effect(fn, label)           the restricted Client Context
 *   slots.inject(key, cb) / slots.register({ name, id, order }, Component)
 *   modelDirectories.directoryFor(sessionId) -> ModelDirectory
 *     .store.subscribe / .store.getSnapshot / .available() / .load()
 *     snapshot.current = { provider, model, reasoningEffort } | null
 *   the conversation.input.right slot passes `sessionId`
 *
 * Run: node test/client-probe.mjs      (npm test runs this with the manifest probe)
 *
 * This probe protects the badge's own logic, not DSH: re-read the packages above
 * after an upgrade and refresh the stubs, or a green run stops meaning anything.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const CLIENT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'client', 'client.js');

/* ---------------------------------------------------------------- mini React */
let currentInst = null;
let hookIndex = 0;
const instances = new Map();
let pendingEffects = [];
let dirty = false;

const React = {
  createElement(type, props, ...children) {
    const p = { ...(props ?? {}) };
    if (children.length === 1) p.children = children[0];
    else if (children.length > 1) p.children = children;
    return { $$typeof: 'element', type, props: p };
  },
  useRef(init) {
    return (currentInst.hooks[hookIndex++] ??= { current: init });
  },
  useState(init) {
    const h = (currentInst.hooks[hookIndex++] ??= { value: typeof init === 'function' ? init() : init });
    return [h.value, (v) => {
      const next = typeof v === 'function' ? v(h.value) : v;
      if (next !== h.value) { h.value = next; dirty = true; }
    }];
  },
  useEffect(fn, deps) {
    const h = (currentInst.hooks[hookIndex++] ??= { deps: undefined, cleanup: undefined });
    const changed = h.deps === undefined || deps === undefined || deps.length !== h.deps.length || deps.some((d, i) => d !== h.deps[i]);
    if (changed) { h.deps = deps; h.fn = fn; pendingEffects.push(h); }
  },
  useSyncExternalStore(subscribe, getSnapshot) {
    const h = (currentInst.hooks[hookIndex++] ??= {});
    if (h.unsubscribe === undefined) h.unsubscribe = subscribe(() => { dirty = true; });
    h.getSnapshot = getSnapshot;
    return getSnapshot();
  },
};

/* Host DOM stub: one node per host-element path, with a measurable box. */
const HOST_NODES = new Map();
const makeNode = (tag) => ({ tag, parentElement: null, getBoundingClientRect: () => ({ width: 15, height: 22 }) });

function renderElement(el, elPath) {
  if (el === null || el === undefined || el === false) return null;
  if (typeof el !== 'object') return el;
  const { type, props } = el;
  if (typeof type === 'function') {
    const prevInst = currentInst;
    const prevIndex = hookIndex;
    let inst = instances.get(elPath);
    if (inst === undefined) { inst = { hooks: [] }; instances.set(elPath, inst); }
    currentInst = inst;
    hookIndex = 0;
    const out = type(props);
    currentInst = prevInst;
    hookIndex = prevIndex;
    return renderElement(out, elPath + '/0');
  }
  const resolved = { type, props: { ...props } };
  if (typeof props.ref === 'object' && props.ref !== null) props.ref.current = HOST_NODES.get(elPath) ?? null;
  const kids = props.children;
  const list = Array.isArray(kids) ? kids : kids === undefined ? [] : [kids];
  resolved.children = list.map((k, i) => renderElement(k, elPath + '/' + i));
  return resolved;
}

let CellComponent = null;

function render(props) {
  instances.clear();
  HOST_NODES.clear();
  dirty = false;
  let tree = null;
  for (let pass = 0; pass < 12; pass++) {
    pendingEffects = [];
    hookIndex = 0;
    currentInst = null;
    for (const p of ['/0/0/0/0', '/0/0/0/0/0']) if (!HOST_NODES.has(p)) HOST_NODES.set(p, makeNode('div'));
    tree = renderElement(React.createElement(CellComponent, props), '/0');
    const effects = pendingEffects;
    pendingEffects = [];
    for (const h of effects) {
      if (typeof h.cleanup === 'function') h.cleanup();
      h.cleanup = h.fn();
    }
    if (!dirty) break;
  }
  return tree;
}

/* ------------------------------------------------------------- DSH env stubs */
const elements = { styles: [], head: [] };
const documentStub = {
  createElement(tag) { const el = { tag, dataset: {}, textContent: '', removed: false, remove() { this.removed = true; } }; elements.styles.push(el); return el; },
  head: { append(el) { elements.head.push(el); } },
  querySelectorAll: () => [],
};

const listeners = [];
const windowStub = {
  __ModuleLoader__: { load(reg) { windowStub.__registration = reg; } },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  addEventListener: (n, fn) => listeners.push([n, fn]),
  removeEventListener: () => {},
};

globalThis.window = windowStub;
globalThis.document = documentStub;
globalThis.ResizeObserver = class { constructor(fn) { this.fn = fn; } observe() {} disconnect() {} };

/* ------------------------------------------------------------------ load it */
vm.runInThisContext(fs.readFileSync(CLIENT, 'utf8'), { filename: CLIENT });

const reg = windowStub.__registration;
assert.ok(reg, 'window.__ModuleLoader__.load was never called');
assert.equal(reg.id, 'dsh-provider-badge', 'registration id must equal the package name');

const mod = reg.factory((spec) => {
  if (spec === 'react') return React;
  throw new Error('unexpected require: ' + spec);
});

assert.equal(typeof mod.apply, 'function', 'client half must export apply');
assert.deepEqual([...mod.inject], ['slots', 'modelDirectories']);
assert.equal(mod.name, 'provider-badge');

/* ------------------------------------------------------- slot + service stub */
function makeStore(initial) {
  let snap = initial;
  const subs = new Set();
  return {
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
    getSnapshot: () => snap,
    set(next) { snap = next; for (const fn of subs) fn(); },
  };
}

const registrations = [];
const slots = {
  inject(key, cb) { registrations.push({ key }); return cb(); },
  register(options, Component) { registrations.push({ options, Component }); return () => {}; },
};

const directory = {
  store: makeStore({ status: 'ready', groups: [], current: null, pending: null, error: null }),
  available: () => true,
  load: async () => directory.store.getSnapshot(),
  select: async () => ({ ok: true }),
};

const modelDirectories = {
  directoryFor(sessionId) {
    if (String(sessionId) !== 'session-1') throw new Error('unknown session ' + sessionId);
    return directory;
  },
};

const effects = [];
const ctx = {
  get(name) { return { slots, modelDirectories }[name]; },
  effect(cb, label) { effects.push({ cb, label }); return () => {}; },
  on() { return () => {}; },
  provide() { return () => {}; },
};

mod.apply(ctx);

/* --------------------------------------------------------------- assertions */
const slotReg = registrations.find((r) => r.options);
assert.ok(slotReg, 'no slot registration happened');
assert.equal(slotReg.options.name, 'conversation.input.right');
assert.equal(slotReg.options.id, 'provider-badge');
assert.equal(slotReg.options.order, -1);
assert.equal(registrations[0].key, 'conversation.input.right', 'injects into the composer right slot');

const styleTag = elements.styles[0];
assert.equal(styleTag.dataset.plugin, 'dsh-provider-badge');
assert.match(styleTag.textContent, /\.prvd-badge\{/);
assert.ok(styleTag.textContent.includes('var(--dsw-alias-label-caption)'));
assert.equal(effects.length, 1, 'ctx.effect registered for the stylesheet');

CellComponent = slotReg.Component;

function collect(tree, out = []) {
  if (tree === null || tree === undefined || typeof tree !== 'object') return out;
  out.push(tree);
  const kids = tree.children;
  if (Array.isArray(kids)) for (const k of kids) collect(k, out);
  else collect(kids, out);
  return out;
}

const TUNING = { iconScale: 1.2, yOffset: 1, color: 'var(--dsw-alias-label-caption)' };
const shapeOf = (nodes) => nodes.find((n) => n.type === 'path')?.props.d;

function badgeFor(provider, model) {
  directory.store.set({ status: 'ready', groups: [], current: { provider, model, reasoningEffort: 'high' }, pending: null, error: null });
  const tree = render({ sessionId: 'session-1', models: modelDirectories, tuning: TUNING });
  return { tree, nodes: collect(tree) };
}

const results = [];
function check(name, fn) {
  try { fn(); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', name + ' — ' + e.message]); }
}

check('current === null renders nothing', () => {
  directory.store.set({ status: 'ready', groups: [], current: null, pending: null, error: null });
  assert.equal(render({ sessionId: 'session-1', models: modelDirectories, tuning: TUNING }), null);
});

check('deepseek -> whale path', () => {
  const { nodes } = badgeFor('deepseek', 'deepseek-v4.1-flash');
  const cell = nodes.find((n) => n.type === 'div');
  assert.ok(cell, 'badge cell missing');
  assert.equal(cell.props.title, 'deepseek · deepseek-v4.1-flash');
  assert.equal(cell.props.className, 'prvd-badge');
  const svg = nodes.find((n) => n.type === 'svg');
  assert.ok(svg, 'no svg rendered');
  assert.equal(svg.props.viewBox, '0 0 24 24');
  assert.equal(svg.props.width, Math.round(13 * TUNING.iconScale));
  assert.ok(shapeOf(nodes).startsWith('M23.748 4.482'), 'whale path not intact');
});

check('opencode -> ZEN wordmark', () => {
  const { nodes } = badgeFor('opencode', 'x');
  assert.equal(nodes.find((n) => n.type === 'svg').props.height, Math.round(10 * TUNING.iconScale));
  assert.ok(shapeOf(nodes).length > 0);
});

check('opencode-go -> GO wordmark', () => {
  assert.notEqual(shapeOf(badgeFor('opencode-go', 'x').nodes), shapeOf(badgeFor('zen', 'x').nodes), 'GO and ZEN must differ');
});

check('zen -> ZEN wordmark', () => {
  assert.equal(shapeOf(badgeFor('zen', 'x').nodes), shapeOf(badgeFor('opencode', 'x').nodes));
});

check('go -> GO wordmark', () => {
  assert.equal(shapeOf(badgeFor('go', 'x').nodes), shapeOf(badgeFor('opencode-go', 'x').nodes));
});

check('other provider -> blocky initials', () => {
  assert.equal(shapeOf(badgeFor('anthropic', 'claude').nodes).length > 0, true);
  const numeric = badgeFor('123', 'x');
  assert.equal(numeric.nodes.filter((n) => n.type === 'svg').length, 0, 'no glyph for a letters-less provider');
  assert.ok(numeric.tree, 'cell still occupies its slot (pre-existing cosmetic behaviour)');
});

check('live subscription: store update repaints', () => {
  const before = shapeOf(badgeFor('deepseek', 'm1').nodes);
  directory.store.set({ status: 'ready', groups: [], current: { provider: 'opencode-go', model: 'm2' }, pending: null, error: null });
  const after = shapeOf(collect(render({ sessionId: 'session-1', models: modelDirectories, tuning: TUNING })));
  assert.notEqual(before, after, 'icon did not follow the store');
});

check('unknown sessionId does not throw', () => {
  assert.equal(render({ sessionId: 'nope', models: modelDirectories, tuning: TUNING }), null);
});

check('missing modelDirectories service degrades silently', () => {
  const ctx2 = { get: (n) => (n === 'slots' ? slots : undefined), effect: () => () => {}, on: () => () => {} };
  registrations.length = 0;
  mod.apply(ctx2);
  const r = registrations.find((x) => x.options);
  assert.ok(r, 'still registers the cell');
  const previous = CellComponent;
  CellComponent = r.Component; // the cell this apply registered closes over its own `models`
  assert.equal(render({ sessionId: 'session-1', models: modelDirectories, tuning: TUNING }), null, 'renders nothing without the service, without throwing');
  CellComponent = previous;
});

check('missing slots service aborts apply without throwing', () => {
  mod.apply({ get: () => undefined, effect: () => () => {}, on: () => () => {} });
});

/* -------------------------------------------------------------------- report */
let failed = 0;
for (const [status, name] of results) {
  if (status === 'FAIL') failed++;
  console.log(status.padEnd(5), name);
}
console.log('\nclient: ' + (results.length - failed) + '/' + results.length + ' checks passed');
process.exitCode = failed === 0 ? 0 : 1;
