/**
 * Locate the DSH Desktop application's runtime module root.
 *
 * The layout moved in DSH Desktop 2.0.10: the app.asar archive was dropped and
 * the application resources now live in a plain directory
 * (`Contents/Resources/app`). Older installs keep the unpacked runtime under
 * `Contents/Resources/app.asar.unpacked`. Probe both, newest first, so the
 * harnesses (and their `SKM_*` overrides) work on either version.
 *
 * @module dsh-skill-mover/test/app-runtime
 */
import { existsSync } from 'node:fs'

const RESOURCES = '/Applications/DSH Desktop.app/Contents/Resources'

function firstExisting(candidates) {
  for (const candidate of candidates) if (existsSync(candidate)) return candidate
  return candidates[candidates.length - 1]
}

/** Application resources directory that owns `node_modules`. */
export const APP_ROOT = firstExisting([
  `${RESOURCES}/app`,
  `${RESOURCES}/app.asar.unpacked`,
])

/** Absolute path of the application's `node_modules`. */
export const APP_NODE_MODULES = `${APP_ROOT}/node_modules`

/**
 * Absolute path of one package file inside the running application.
 * @param specifier - package-relative path, e.g. `@deepseek-ai/dsh-llm/lib/index.js`.
 * @returns absolute path.
 */
export function runtimeModule(specifier) {
  return `${APP_NODE_MODULES}/${specifier}`
}
