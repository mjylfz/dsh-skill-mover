/**
 * Client-boot harness — catches exactly the failure class that has been
 * breaking the Desktop app (client loader entry apply throws, or silently never
 * runs, → the whole UI half is dead).
 *
 * It runs the REAL api-gateway client bundle and OUR built client bundle in a
 * Node replica of the client module topology (root context + loader-entry child
 * fibers), with the REAL typert registry and stubbed browser seams (document,
 * slots, connection).
 *
 * Two traps this harness is built to avoid:
 *  - Mixing two cordis copies. A Context from the repo's dev copy and a Service
 *    from the application's copy fail each other's `instanceof` checks, so
 *    `ctx.provide()` silently never lands and every dependent fiber parks.
 *  - Trusting `await ctx.plugin(...)`. A fiber whose `inject` is unmet resolves
 *    that await anyway while never calling `apply`, so "no exception" proves
 *    nothing. Every step below asserts an observable result instead.
 *
 * Usage: node test/client-boot.mjs
 */
import { createRequire } from 'node:module';
import { APP_NODE_MODULES, runtimeModule } from './app-runtime.mjs';

const APP_NM = APP_NODE_MODULES;
const appRequire = createRequire(APP_NM + '/x.js');
// ONE cordis instance: the application's own, shared with both bundles.
const cordis = await import(runtimeModule('@deepseek-ai/cordis/lib/index.js'));
const { Context } = cordis;

const failures = [];
const ok = (label) => console.log(`  ✓ ${label}`);
const fail = (label, detail) => {
  failures.push(`${label}: ${detail}`);
  console.error(`  ✗ ${label}: ${detail}`);
};

// ---- browser seams ----
const styleEl = () => ({ dataset: {}, setAttribute() {}, remove() {} });
globalThis.window = globalThis;
globalThis.document = {
  // The gateway client derives its Remote-stream WebSocket URL from
  // document.baseURI (falling back to __DSH_TRANSPORT__.streamBaseUrl), so a
  // browser-like document must carry one or `new URL()` throws "Invalid URL".
  baseURI: 'http://127.0.0.1:43120/',
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

console.log('client-boot harness');
console.log(`  app modules : ${APP_NM}`);

// ---- real api-gateway client bundle ----
const gatewayClient = await loadBundle(runtimeModule('@deepseek-ai/dsh-api-gateway/lib/client.js'), {
  id: '@deepseek-ai/dsh-api-gateway',
  '@deepseek-ai/cordis': cordis,
});

// ---- real typert registry, CLIENT face (what the browser actually boots) ----
const typertClient = await loadBundle(runtimeModule('@deepseek-ai/dsh-typert-registry/lib/client.js'), {
  id: '@deepseek-ai/dsh-typert-registry',
  '@deepseek-ai/cordis': cordis,
});

// ---- our built client bundle ----
const clientPath = process.env.SKM_CLIENT || new URL('../dist/client.js', import.meta.url).href;
const ourClient = await loadBundle(clientPath, {
  id: 'dsh-skill-mover',
  react: appRequire('react'),
});
const ourPlugin = ourClient.default;

// ---- boot replica ----
let capturedRender = null;
const ctx = new Context();

// Cordis defers a plugin's apply to a microtask, so `ctx.plugin(...)` must be
// awaited before anything reads the service it provides. A bare call here made
// ctx.get('typert') undefined and cascaded into four bogus failures.
await ctx.plugin({ name: 'typert-client', inject: typertClient.inject || [], apply: typertClient.apply });
// The api-gateway client's constructor registers a generation source and then
// calls connection.start(...), so the stub must expose the whole surface the
// real dsh-client-connection service does (registerGenerationSource / start /
// state / reconnect), not just the two fields the happy path reads.
await ctx.plugin({
  name: 'fake-connection',
  apply: (c) => c.provide('connection', {
    isLoopback: true,
    rpc: { call: async () => ({ ok: true, value: { groups: [], sources: [], env: {}, targetRoot: null } }) },
    generation: { getSnapshot: () => ({ id: 1, host: { home: '/tmp' } }), subscribe: () => () => {} },
    state: { getSnapshot: () => ({ phase: 'ready' }), subscribe: () => () => {} },
    reconnect() {},
    registerGenerationSource: () => () => {},
    start: () => ({ stop() {} }),
  }),
});
await ctx.plugin({
  name: 'fake-slots',
  apply: (c) => c.provide('slots', {
    inject: (key, cb) => { const dispose = cb(); return () => dispose && dispose(); },
    register: (opts, render) => { capturedRender = render; return () => {}; },
  }),
});

if (ctx.get('typert') === undefined) fail('typert registry service', 'ctx.get("typert") is undefined');
else ok('typert registry service (client face) installed');

// api-gateway client as a loader-entry-like child fiber
let gatewayRan = false;
try {
  await ctx.plugin({
    name: 'api-gateway',
    inject: gatewayClient.inject || [],
    apply: (c) => { gatewayRan = true; return gatewayClient.apply(c); },
  });
} catch (e) { fail('api-gateway client', e.message); }
if (!gatewayRan) fail('api-gateway client', 'apply never ran (inject unmet: parked fiber)');
else if (ctx.get('remote') === undefined) fail('api-gateway client', 'ctx.get("remote") is undefined after apply');
else ok('api-gateway client: apply ran, remote service installed');

// our bundle client as another child fiber (same topology as the client loader)
let ourRan = false;
try {
  await ctx.plugin({
    name: 'dsh-skill-mover',
    inject: ourPlugin.inject || [],
    apply: (c) => { ourRan = true; return ourPlugin.apply(c); },
  });
} catch (e) { fail('dsh-skill-mover client entry', e.message); }
if (!ourRan) fail('dsh-skill-mover client entry', 'apply never ran (inject unmet: parked fiber)');
else if (ctx.get('remote.skillMover') === undefined) fail('dsh-skill-mover client entry', 'ctx.get("remote.skillMover") is undefined — descriptors were not mounted');
else ok('dsh-skill-mover client entry: apply ran, remote.skillMover mounted');

// full pipeline: grab the api object out of the slot render closure and invoke scan
if (capturedRender) {
  ok('slot registered: settings.section/skill-mover');
  try {
    const element = capturedRender();
    const api = element && element.props && element.props.api;
    if (!api) throw new Error('slot render 没拿到 api');
    const r = await api.scan({});
    if (r && Array.isArray(r.groups)) ok(`api.scan() via slot render: groups=${r.groups.length}`);
    else fail('api.scan', `unexpected result ${JSON.stringify(r)}`);
  } catch (e) { fail('api.scan', e.message); }
} else {
  fail('slot registered', 'settings.section 没挂上 (capturedRender is null)');
}

// Before/after for the strict-codec break, mounted through the REAL gateway so
// the verdict comes from @deepseek-ai/dsh-typert-registry, not from us.
// 0.2.x validateCodec() demands `create` and ignores the old `schema` field.
async function tryMount(codecMaker, name) {
  const descriptor = (method) => ({
    id: `probe#probe/${method}`,
    service: 'probe',
    namespace: 'probe',
    method,
    invocation: { kind: 'direct' },
    parameters: [{ name: 'input', wire: 'input', source: 'json', codec: codecMaker() }],
    result: codecMaker(),
  });
  try {
    await ctx.remote.$mount({ package: name, descriptors: [descriptor('echo')] });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
const OLD_CODEC = () => ({ mode: 'strict', typeSymbol: 'json', schema: { parse: (v) => v } });
const NEW_CODEC = () => ({ mode: 'strict', typeSymbol: 'json', create: () => ({ parse: (v) => v }) });

const oldMount = await tryMount(OLD_CODEC, 'dsh-skill-mover-probe-old');
if (oldMount.ok) fail('codec before/after', '旧 {schema} codec 竟然被接受了 —— 断言失效,请复查 registry 行为');
else if (!/has no create\(\) factory/.test(oldMount.error)) fail('codec before/after', `旧 codec 被拒但错误不是预期的: ${oldMount.error}`);
else ok(`旧 {schema} codec 被真实 gateway 拒绝: "${oldMount.error}"`);

const newMount = await tryMount(NEW_CODEC, 'dsh-skill-mover-probe-new');
if (!newMount.ok) fail('codec before/after', `新 {create} codec 被拒: ${newMount.error}`);
else ok('新 {create} codec 被真实 gateway 接受');

console.log('');
if (failures.length) {
  console.error(`CLIENT BOOT FAIL (${failures.length})`);
  for (const f of failures) console.error('  ❌', f);
  process.exit(1);
}
console.log('CLIENT BOOT PASS');
