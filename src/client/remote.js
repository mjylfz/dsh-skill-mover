/**
 * Client-side Remote contribution for the `skillMover` namespace.
 *
 * Descriptors mirror the `@Remote()` endpoints on the host
 * `SkillMoverGateway` (src/index.ts). The client mounts them via
 * `ctx.remote.$mount(...)`, after which `ctx.remote.skillMover.*` is callable.
 * Each method takes one flat JSON parameter (`input`) and returns a
 * `RemoteResult` envelope, unwrapped by `unwrap()`.
 */
export const SKILL_MOVER_REMOTE = {
  package: 'dsh-skill-mover',
  descriptors: [
    {
      id: 'dsh-skill-mover#skillMover/scan',
      service: 'skillMover',
      namespace: 'skillMover',
      method: 'scan',
      invocation: { kind: 'direct' },
      parameters: [{ name: 'input', wire: 'input', source: 'json', codec: { mode: 'strict', typeSymbol: 'json', schema: { parse: (v) => v } } }],
      result: { mode: 'strict', typeSymbol: 'json', schema: { parse: (v) => v } },
    },
    {
      id: 'dsh-skill-mover#skillMover/migrate',
      service: 'skillMover',
      namespace: 'skillMover',
      method: 'migrate',
      invocation: { kind: 'direct' },
      parameters: [{ name: 'input', wire: 'input', source: 'json', codec: { mode: 'strict', typeSymbol: 'json', schema: { parse: (v) => v } } }],
      result: { mode: 'strict', typeSymbol: 'json', schema: { parse: (v) => v } },
    },
    {
      id: 'dsh-skill-mover#skillMover/uninstall',
      service: 'skillMover',
      namespace: 'skillMover',
      method: 'uninstall',
      invocation: { kind: 'direct' },
      parameters: [{ name: 'input', wire: 'input', source: 'json', codec: { mode: 'strict', typeSymbol: 'json', schema: { parse: (v) => v } } }],
      result: { mode: 'strict', typeSymbol: 'json', schema: { parse: (v) => v } },
    },
  ],
};

/** Unwrap a RemoteResult: return `value`, throw a readable Error on failure. */
export function unwrap(result) {
  if (result && result.ok) return result.value;
  const err = result && result.error ? result.error : {};
  throw new Error(`${err.message || 'remote call failed'}${err.code ? ` (${err.code})` : ''}`);
}
