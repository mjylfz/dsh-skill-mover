/**
 * Host-core test — the shell seam, with no DSH process involved.
 *
 * `createCore(ctx)` talks to DSH only through `ctx.get('shell')` and
 * `ctx.get('fs')`, so a hand-built context is enough to pin the behaviour that
 * changed between the two runtime generations:
 *
 *  - 0.2.x removed `shell.run(spec)`. The executor now exposes
 *    `execute(spec)` → handle → `handle.result()`. A bundle that still calls
 *    `run()` dies with "shell.run is not a function" before it ever reads the
 *    filesystem, so this test asserts the new seam is the one used.
 *  - `execute().result()` resolves (does not reject) on a non-zero exit, so a
 *    failed `cp`/`ln`/`rm` must be turned back into a thrown error by the
 *    adapter — otherwise a broken migration is reported as `ok`.
 *
 * Scenario B is the discriminating one: the command prints a perfectly parseable
 * payload *and* exits 1. Without the exit-code check the core would cheerfully
 * report `platform: darwin`; with it, `detectEnv` falls back to `unknown`.
 *
 * Usage: node test/host-core.test.mjs   (plain node is fine — no DSH imports)
 */
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const { createCore } = await import(fileURLToPath(new URL('../dist/core.js', import.meta.url)))

let passed = 0
let failed = 0
async function check(label, fn) {
  try {
    await fn()
    passed += 1
    console.log(`  ✓ ${label}`)
  } catch (error) {
    failed += 1
    console.error(`  ✗ ${label}\n      ${error.message}`)
  }
}

/** A `ctx` whose `fs.resolve` always rejects, so scanning finds no roots. */
function makeCtx(shell) {
  const fs = {
    async resolve() { throw new Error('fake fs: no such file') },
    async stat() { throw new Error('fake fs: no such file') },
    async readText() { throw new Error('fake fs: no such file') },
    async writeText() { throw new Error('fake fs: read-only') },
    async listDir() { throw new Error('fake fs: no such directory') },
  }
  return { get: (name) => (name === 'shell' ? shell : name === 'fs' ? fs : undefined) }
}

/** Collect every command the core runs, and answer with a scripted result. */
function makeShell(reply) {
  const seen = { resolve: 0, execute: 0, run: 0, result: 0 }
  const shell = {
    resolve(request) { seen.resolve += 1; return { ...request, workdir: '/tmp', onExpiry: 'kill' } },
    async execute(spec) {
      seen.execute += 1
      const outcome = reply(spec.command)
      return {
        status: 'completed',
        exitCode: outcome.exitCode,
        async result() { seen.result += 1; return outcome },
        async done() {},
        kill() { return false },
        readOutput() { return { delta: '', lossy: false } },
      }
    },
  }
  return { shell, seen }
}

console.log('host-core shell-seam test')

await check('uses shell.execute()/handle.result(), never the removed shell.run()', async () => {
  const { shell, seen } = makeShell(() => ({
    exitCode: 0,
    signal: null,
    timedOut: false,
    stdout: { text: '/tmp/fakehome\nDarwin\n', truncated: false },
    stderr: { text: '', truncated: false },
  }))
  const core = createCore(makeCtx(shell))
  const result = await core.runScan({})

  assert.equal(seen.run, 0, 'shell.run must not be touched — it does not exist in 0.2.x')
  assert.ok(seen.execute > 0, 'shell.execute was never called')
  assert.equal(seen.result, seen.execute, 'every executed handle must have result() awaited')
  assert.equal(result.env.platform, 'darwin', 'the Darwin marker should select the unix flavour')
  assert.equal(result.env.home, '/tmp/fakehome', 'home should come from the echoed $HOME')
})

await check('still prefers the legacy shell.run() when the seam provides it', async () => {
  let runCalls = 0
  const legacy = {
    resolve: (request) => ({ ...request }),
    async run() {
      runCalls += 1
      return { exitCode: 0, stdout: { text: '/tmp/legacyhome\nDarwin\n' }, stderr: { text: '' } }
    },
  }
  const core = createCore(makeCtx(legacy))
  const result = await core.runScan({})
  assert.ok(runCalls > 0, 'legacy run() was not used')
  assert.equal(result.env.home, '/tmp/legacyhome')
})

await check('a non-zero exit is surfaced as a failure, not parsed as output', async () => {
  const { shell } = makeShell(() => ({
    exitCode: 1,
    signal: null,
    timedOut: false,
    // Perfectly parseable payload on stdout — the trap this guards against.
    stdout: { text: '/tmp/fakehome\nDarwin\n', truncated: false },
    stderr: { text: 'boom', truncated: false },
  }))
  const core = createCore(makeCtx(shell))
  const result = await core.runScan({})
  assert.equal(
    result.env.platform,
    'unknown',
    'exit code 1 must not be treated as a successful environment probe',
  )
  assert.equal(result.env.home, null)
})

await check('a timeout kill is surfaced as a failure too', async () => {
  const { shell } = makeShell(() => ({
    exitCode: null,
    signal: null,
    timedOut: true,
    stdout: { text: '/tmp/fakehome\nDarwin\n', truncated: false },
    stderr: { text: '', truncated: false },
  }))
  const core = createCore(makeCtx(shell))
  const result = await core.runScan({})
  assert.equal(result.env.platform, 'unknown')
})

await check('a shell exposing neither seam fails loudly', async () => {
  const core = createCore(makeCtx({ resolve: (r) => r }))
  const result = await core.runScan({})
  assert.equal(result.env.platform, 'unknown')
})

console.log('')
if (failed > 0) {
  console.error(`HOST CORE FAIL (${failed} failed, ${passed} passed)`)
  process.exit(1)
}
console.log(`HOST CORE PASS — ${passed}/${passed} checks`)
