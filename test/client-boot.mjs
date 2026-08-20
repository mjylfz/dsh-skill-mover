/**
 * Client-boot harness — catches exactly the failure class that has been
 * breaking the Desktop app (client loader entry apply throws → whole boot
 * fails). Runs the REAL api-gateway client bundle and OUR client bundle in
 * a Node replica of the client module topology (root context + loader-entry
 * child fibers), with real cordis + typert registry and stubbed browser
 * seams (document, slots, connection).
 *
 * Usage: node test/client-boot.mjs
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { Context, Service } from '@deepseek-ai/cordis';

const APP_NM = '/Applications/DSH Desktop.app/Contents/Resources/app.asar.unpacked/node_modules';
const appRequire = createRequire(APP_NM + '/x.js');
const cordis = appRequire('@deepseek-ai/cordis');

// ---- browser seams ----
const styleEl = () => ({ dataset: {}, setAttribute() {}, remove() {} });
globalThis.window = globalThis;
globalThis.document = {
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => styleEl(),
  head: { append() {}, appendChild() {} },
};
const factories = new Map();
globalThis.__ModuleLoader__ = { load: ({ id, factory }) => { factories.set(id, factory); } };

// ---- materialize a ModuleLoader bundle ----
async function loadBundle(file, requires) {
  await import(file); // executes window.__ModuleLoader__.load
  const factory = factories.get(requires.id);
  if (!factory) throw new Error(`bundle ${file} did not register ${requires.id}`);
  return factory((spec) => {
    if (requires[spec]) return requires[spec];
    throw new Error(`unexpected require("${spec}")`);
  });
}

// ---- real api-gateway client bundle ----
const gatewayClient = await loadBundle(APP_NM + '/@deepseek-ai/dsh-api-gateway/lib/client.js', {
  id: '@deepseek-ai/dsh-api-gateway',
  '@deepseek-ai/cordis': cordis,
});

// ---- our client bundle (built dist) ----
const clientPath = process.env.SKM_CLIENT || new URL('../dist/client.js', import.meta.url).href;
const ourClient = await loadBundle(clientPath, {
  id: 'dsh-skill-mover',
  react: appRequire('react'),
});
const ourPlugin = ourClient.default;

// ---- boot replica ----
const ctx = new Context();
ctx.plugin(appRequire('@deepseek-ai/dsh-typert-registry').default); // real typert
ctx.plugin({ name: 'fake-connection', apply: (c) => c.provide('connection', {
  rpc: { call: async () => ({ ok: true, value: { groups: [], sources: [] } }) },
}) });
ctx.plugin({ name: 'fake-slots', apply: (c) => c.provide('slots', {
  inject: (key, cb) => { const dispose = cb(); return () => dispose && dispose(); },
  register: (opts, render) => { console.log('   slot registered:', opts.id); capturedRender = render; return () => {}; },
}) });

const failures = [];
// api-gateway client as a loader-entry-like child fiber
try {
  const f = ctx.plugin({ name: 'api-gateway', inject: ['typert', 'connection'], apply: gatewayClient.apply });
  await f;
  console.log('api-gateway client: ✓');
} catch (e) { failures.push(`api-gateway: ${e.message}`); }

// our bundle client as another child fiber (same topology as the client loader)
let capturedRender = null;
try {
  const f = ctx.plugin({ name: 'dsh-skill-mover', inject: ourPlugin.inject || [], apply: ourPlugin.apply });
  await f;
  console.log('dsh-skill-mover client entry: ✓ (apply 完成,无异常)');
} catch (e) { failures.push(`dsh-skill-mover: ${e.message}`); }

// full pipeline: grab the api object out of the slot render closure and invoke scan
if (capturedRender) {
  try {
    const element = capturedRender();
    const api = element && element.props && element.props.api;
    if (!api) throw new Error('slot render 没拿到 api');
    const r = await api.scan({});
    console.log('api.scan() via slot render:', r && r.groups ? `✓ groups=${r.groups.length}` : `✗ ${JSON.stringify(r)}`);
  } catch (e) { failures.push(`api.scan: ${e.message}`); }
} else {
  failures.push('slot 未注册(settings.section 没挂上)');
}

if (failures.length) {
  console.error('CLIENT BOOT FAIL:');
  for (const f of failures) console.error('  ❌', f);
  process.exit(1);
}
console.log('CLIENT BOOT PASS');
