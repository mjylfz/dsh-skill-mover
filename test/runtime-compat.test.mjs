/**
 * Runtime compatibility test — run it with the *application's* Node.
 *
 *   ELECTRON_RUN_AS_NODE=1 "/Applications/DSH Desktop.app/Contents/MacOS/DSH Desktop" \
 *     test/runtime-compat.test.mjs
 *
 * Four independent checks, all against the live DSH Desktop runtime:
 *
 *  1. The runtime version the app reports (`@deepseek-ai/dsh-app-boot`).
 *  2. DSH's OWN plugin compatibility gate (`evaluatePluginCompatibility`) on the
 *     shipped manifest vs. the v1.1.0 manifest — before must be rejected, after
 *     must be accepted. Using the real gate is the point: a hand-rolled semver
 *     check can disagree with it, and this project has been bitten by exactly
 *     that (a "wide" range silently matching no prerelease).
 *  3. Every named import the built artifacts take from `@deepseek-ai/*` really
 *     exists in the application's copy of that package.
 *  4. `dist/index.js` loads with `@deepseek-ai/*` aliased to the application,
 *     and the live protocol's `remoteMethods()` sees all three wire methods.
 *
 * Usage: node test/runtime-compat.test.mjs
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire, register } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { APP_NODE_MODULES, runtimeModule } from './app-runtime.mjs'

const ROOT = new URL('../', import.meta.url)
const DIST_INDEX = fileURLToPath(new URL('../dist/index.js', import.meta.url))
const DIST_CLIENT = fileURLToPath(new URL('../dist/client.js', import.meta.url))
/** Fresh module instance per import, so a cached copy cannot mask a failure. */
const fresh = (path, tag) => `${pathToFileURL(path).href}?${tag}=${Date.now()}`
const appRequire = createRequire(`${APP_NODE_MODULES}/x.js`)

let passed = 0
let failed = 0
function check(label, fn) {
  try {
    fn()
    passed += 1
    console.log(`  ✓ ${label}`)
  } catch (error) {
    failed += 1
    console.error(`  ✗ ${label}\n      ${error.message}`)
  }
}
async function checkAsync(label, fn) {
  try {
    await fn()
    passed += 1
    console.log(`  ✓ ${label}`)
  } catch (error) {
    failed += 1
    console.error(`  ✗ ${label}\n      ${error.message}`)
  }
}

console.log('runtime-compat test')
console.log(`  app modules : ${APP_NODE_MODULES}`)

// ─── 1. runtime version ────────────────────────────────────────────────────
const boot = await import(runtimeModule('@deepseek-ai/dsh-app-boot/lib/index.js'))
const { evaluatePluginCompatibility, getDshRuntimeVersion } = boot
const runtimeVersion = getDshRuntimeVersion()
console.log(`  runtime     : ${runtimeVersion}`)

// ─── 2. DSH's own gate, before vs. after ───────────────────────────────────
const manifestAfter = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

/** The v1.1.0 manifest, read from the git tag so "before" cannot drift. */
function manifestBefore() {
  try {
    const raw = execFileSync('git', ['show', 'v1.1.0:package.json'], { cwd: fileURLToPath(ROOT), encoding: 'utf8' })
    return JSON.parse(raw)
  } catch {
    // Fallback keeps the test honest on a tarball without git history.
    return {
      name: 'dsh-skill-mover',
      version: '1.1.0',
      peerDependencies: {
        '@deepseek-ai/cordis': '^4.0.1',
        '@deepseek-ai/dsh-typert-protocol': '^0.1.0-rc.6 || ^0.1.5-rc.1',
      },
    }
  }
}

const before = manifestBefore()
const after = manifestAfter

console.log('')
console.log('gate (DSH\'s evaluatePluginCompatibility) — before / after')
for (const v of ['0.1.0-rc.6', '0.1.5-rc.1', '0.2.0-rc.2', '0.2.0', '0.3.0-rc.1']) {
  const b = evaluatePluginCompatibility(before, {}, v)
  const a = evaluatePluginCompatibility(after, {}, v)
  console.log(`  runtime ${v.padEnd(11)} before=${b ? 'REJECTED' : 'accepted'}  after=${a ? 'REJECTED' : 'accepted'}`)
}

check(`before-manifest @ ${runtimeVersion} is REJECTED by the gate`, () => {
  const issue = evaluatePluginCompatibility(before, {}, runtimeVersion)
  assert.ok(issue, 'expected the old peer range to be rejected')
  assert.ok(issue.peers['@deepseek-ai/dsh-typert-protocol'], 'expected dsh-typert-protocol in the incompatible peers')
})
check(`after-manifest @ ${runtimeVersion} is ACCEPTED by the gate (undefined)`, () => {
  assert.equal(evaluatePluginCompatibility(after, {}, runtimeVersion), undefined)
})
check('after-manifest still accepts the 0.1.x line it claims to support', () => {
  for (const v of ['0.1.0-rc.6', '0.1.5-rc.1']) {
    assert.equal(evaluatePluginCompatibility(after, {}, v), undefined, `${v} should be accepted`)
  }
})
check('after-manifest accepts 0.2.0-rc.1+, 0.2.0 final, and no 0.3.0 prerelease', () => {
  for (const v of ['0.2.0-rc.1', '0.2.0-rc.2', '0.2.0']) {
    assert.equal(evaluatePluginCompatibility(after, {}, v), undefined, `${v} should be accepted`)
  }
  assert.ok(evaluatePluginCompatibility(after, {}, '0.3.0-rc.1'), '0.3.0-rc.1 must stay out of range')
})
check('after-manifest declares no bare "*" peer range', () => {
  for (const [name, range] of Object.entries(after.peerDependencies)) {
    assert.notEqual(range.trim(), '*', `${name} must not use "*"`)
  }
})

// ─── 3. named imports exist in the application's packages ──────────────────
/** Pull `import { a, b } from 'spec'` bindings out of an ES module's source. */
function namedImportsOf(source) {
  const out = new Map()
  const re = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(source)) !== null) {
    const spec = m[2]
    if (!spec.startsWith('@deepseek-ai/')) continue
    const names = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean)
    out.set(spec, [...(out.get(spec) ?? []), ...names])
  }
  return out
}

console.log('')
console.log('named exports vs. the application\'s runtime')
const hostSource = readFileSync(DIST_INDEX, 'utf8')
const hostImports = namedImportsOf(hostSource)
check('dist/index.js imports at least one @deepseek-ai package', () => {
  assert.ok(hostImports.size > 0, 'no @deepseek-ai imports found — did the build change?')
})
for (const [spec, names] of hostImports) {
  await checkAsync(`${spec}: ${names.join(', ')}`, async () => {
    const mod = await import(runtimeModule(`${spec.replace('@deepseek-ai/', '@deepseek-ai/')}/lib/index.js`))
    const missing = names.filter((n) => !(n in mod))
    assert.deepEqual(missing, [], `missing exports: ${missing.join(', ')} (have: ${Object.keys(mod).join(', ')})`)
  })
}

// The client bundle keeps react external; same idea, resolved from the app.
const clientRequires = [...new Set([...readFileSync(DIST_CLIENT, 'utf8').matchAll(/require\("([^"]+)"\)/g)].map((m) => m[1]))]
await checkAsync(`dist/client.js externals resolvable: ${clientRequires.join(', ')}`, async () => {
  for (const spec of clientRequires) {
    const mod = appRequire(spec)
    assert.ok(mod, `${spec} did not resolve from the application`)
  }
  const react = appRequire('react')
  for (const n of ['createElement', 'useState', 'useEffect']) assert.equal(typeof react[n], 'function', `react.${n} missing`)
})

// ─── 4. load the built host half against the application's protocol ────────
console.log('')
console.log('built artifacts against the application\'s protocol')
register('./runtime-alias-hook.mjs', import.meta.url)
await checkAsync('dist/index.js imports without throwing (protocol aliased to the app)', async () => {
  await import(fresh(DIST_INDEX, 'compat'))
})
await checkAsync('exported class is discoverable by the app\'s remoteMethods()', async () => {
  const mod = await import(fresh(DIST_INDEX, 'compat2'))
  const Gateway = mod.default
  assert.equal(typeof Gateway, 'function', 'default export must be the gateway class')
  const protocol = await import(runtimeModule('@deepseek-ai/dsh-typert-protocol/lib/index.js'))
  const names = protocol.remoteMethods(Object.create(Gateway.prototype)).map((m) => m.method)
  assert.deepEqual(names, ['scan', 'migrate', 'uninstall'])
})

await checkAsync('dist/client.js registers a ModuleLoader bundle and exports the plugin', async () => {
  assert.ok(readFileSync(DIST_CLIENT, 'utf8').includes('__ModuleLoader__'), 'bundle must call __ModuleLoader__.load')
  const factories = new Map()
  globalThis.window = globalThis
  globalThis.__ModuleLoader__ = { load: ({ id, factory }) => factories.set(id, factory) }
  await import(fresh(DIST_CLIENT, 'compat'))
  const factory = factories.get('dsh-skill-mover')
  assert.ok(factory, 'bundle did not register under id dsh-skill-mover')
  const mod = factory((spec) => {
    if (spec === 'react') return appRequire('react')
    throw new Error(`unexpected require("${spec}")`)
  })
  assert.equal(typeof mod.default, 'object')
  assert.deepEqual(mod.default.inject, ['slots', 'remote'])
  assert.equal(typeof mod.default.apply, 'function')
})

console.log('')
if (failed > 0) {
  console.error(`RUNTIME COMPAT FAIL (${failed} failed, ${passed} passed)`)
  process.exit(1)
}
console.log(`RUNTIME COMPAT PASS — ${passed}/${passed} checks`)
console.log(`  旧 manifest 被闸门拒绝 → 新 manifest 被接受（runtime ${runtimeVersion}）`)
if (!existsSync(DIST_INDEX)) console.error('  (warning: dist/index.js missing)')
