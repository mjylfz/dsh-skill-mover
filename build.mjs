/**
 * Build script for the dsh-skill-mover plugin.
 *
 *  - Host half: compile src/index.ts (with src/core.js) → dist/ with `tsc`.
 *    MUST be tsc (not esbuild): the `@Remote()` decorators from
 *    @deepseek-ai/dsh-typert-protocol are stage-3 decorators, and esbuild
 *    lowers them to the legacy form whose context shape the runtime rejects.
 *    Imports of @deepseek-ai/* stay external and resolve from the profile's
 *    node_modules at runtime.
 *  - Client half: bundle src/client/index.js → dist/client.js in the
 *    ModuleLoader handoff format:
 *
 *        window.__ModuleLoader__.load({ id: "dsh-skill-mover", factory: (require) => {...} })
 *
 *    Platform seed words (react, @deepseek-ai/cordis, …) stay external so the
 *    browser module table resolves them. The client half is plain JS
 *    (React.createElement, no JSX) so esbuild bundles it directly.
 *
 * Usage: node build.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));

rmSync(join(here, 'dist'), { recursive: true, force: true });
mkdirSync(join(here, 'dist'), { recursive: true });

// ── host half: tsc ─────────────────────────────────────────────────────────
execFileSync(process.execPath, [
  join(here, 'node_modules', 'typescript', 'bin', 'tsc'),
  '-p', join(here, 'tsconfig.host.json'),
  '--pretty', 'false',
], { stdio: 'inherit' });
console.log('[skill-mover] host compiled → dist/');

// ── client half: esbuild (ModuleLoader handoff) ────────────────────────────
// ModuleLoader platform seed words — see getStaticModules() in @deepseek-ai/dsh-client-web.
const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-schema-form',
  '@deepseek-ai/dsh-client-runtime/client',
  '@deepseek-ai/dsh-client-connection/client',
  '@deepseek-ai/dsh-api-gateway/client',
];

const CLIENT_BANNER = `
window.__ModuleLoader__.load({
  id: "dsh-skill-mover",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
`.trimStart();

const CLIENT_FOOTER = `
    return module.exports;
  }
});
`.trimStart();

await build({
  bundle: true,
  sourcemap: false,
  logLevel: 'info',
  entryPoints: [join(here, 'src/client/index.js')],
  outfile: join(here, 'dist/client.js'),
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  external: CLIENT_EXTERNALS,
  banner: { js: CLIENT_BANNER },
  footer: { js: CLIENT_FOOTER },
});
console.log('[skill-mover] client bundle built → dist/client.js');
console.log('[skill-mover] build complete');
