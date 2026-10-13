/**
 * Node ESM resolver hook: alias `@deepseek-ai/*` to the DSH Desktop runtime copy.
 *
 * Why this exists: `dist/index.js` keeps its `@deepseek-ai/*` imports external
 * and lets the host resolve them. Inside this repo those bare specifiers fall
 * back to the *devDependency* copies in `./node_modules` — deliberately pinned
 * to the 0.1.x protocol so the old-gateway path stays testable. So a plain
 * `import('./dist/index.js')` proves nothing about the runtime that actually
 * loads the plugin.
 *
 * Registering this hook in front of the import makes `@deepseek-ai/*` resolve to
 * the application's own packages — the very modules the gateway uses — so the
 * compatibility test exercises a single copy of the protocol.
 *
 * Usage:
 *   import { register } from 'node:module'
 *   register('./runtime-alias-hook.mjs', import.meta.url)
 *   const mod = await import('../dist/index.js')
 *
 * @module dsh-skill-mover/test/runtime-alias-hook
 */
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const RESOURCES = '/Applications/DSH Desktop.app/Contents/Resources'
const APP_ROOT = existsSync(`${RESOURCES}/app`)
  ? `${RESOURCES}/app`
  : `${RESOURCES}/app.asar.unpacked`
const APP_NODE_MODULES = `${APP_ROOT}/node_modules`

// Resolve through the *application's* require, so each package's own `exports`
// map decides its entry point instead of us guessing a path.
const appRequire = createRequire(`${APP_NODE_MODULES}/x.js`)

/** Cache of specifier → file URL, so resolution errors surface once. */
const aliasCache = new Map()

function appUrl(specifier) {
  if (aliasCache.has(specifier)) return aliasCache.get(specifier)
  let url
  try {
    url = pathToFileURL(appRequire.resolve(specifier)).href
  } catch {
    url = undefined
  }
  aliasCache.set(specifier, url)
  return url
}

/** Rewrite any `@deepseek-ai/*` specifier to the application's installed copy. */
export function resolve(specifier, context, next) {
  if (specifier.startsWith('@deepseek-ai/')) {
    const url = appUrl(specifier)
    if (url !== undefined) return { url, shortCircuit: true }
  }
  return next(specifier, context)
}
