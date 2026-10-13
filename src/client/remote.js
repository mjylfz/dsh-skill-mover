/**
 * Client-side Remote contribution for the `skillMover` namespace.
 *
 * Descriptors mirror the `@Remote()` endpoints on the host
 * `SkillMoverGateway` (src/index.ts). The client mounts them via
 * `ctx.remote.$mount(...)`, after which `ctx.remote.skillMover.*` is callable.
 * Each method takes one flat JSON parameter (`input`) and returns a
 * `RemoteResult` envelope, unwrapped by `unwrap()`.
 */
/**
 * Build one strict codec for an unconstrained JSON wire value.
 *
 * The two gateway generations shape a strict codec differently, and the
 * 0.2.x registry hard-rejects the old spelling:
 *
 *  - old (≤ 0.1.x): `{ mode: 'strict', typeSymbol, schema }` — nothing read it,
 *    the shape was decorative.
 *  - new (0.2.x):   `{ mode: 'strict', typeSymbol, create }`, where `create` is
 *    a *factory* returning the schema. `validateCodec()` in
 *    `@deepseek-ai/dsh-typert-registry` throws
 *    `typert: <id> ... strict codec has no create() factory` when `create` is
 *    missing, and the host's `decode()` calls `codec.create().parse(value)`.
 *
 * So declare `create` and keep `schema` off: the identity `parse` makes the
 * wire value pass through unchanged, which is what an unconstrained JSON
 * parameter/result needs.
 *
 * @param typeSymbol - non-empty wire type identity recorded on the codec.
 * @returns a codec accepted by both generations.
 */
function jsonCodec(typeSymbol) {
  return {
    mode: 'strict',
    typeSymbol,
    create: () => ({ parse: (value) => value }),
  };
}

/** The single flat JSON parameter every `skillMover` method accepts. */
const INPUT_PARAMETER = { name: 'input', wire: 'input', source: 'json', codec: jsonCodec('json') };

export const SKILL_MOVER_REMOTE = {
  package: 'dsh-skill-mover',
  descriptors: [
    {
      id: 'dsh-skill-mover#skillMover/scan',
      service: 'skillMover',
      namespace: 'skillMover',
      method: 'scan',
      invocation: { kind: 'direct' },
      parameters: [INPUT_PARAMETER],
      result: jsonCodec('json'),
    },
    {
      id: 'dsh-skill-mover#skillMover/migrate',
      service: 'skillMover',
      namespace: 'skillMover',
      method: 'migrate',
      invocation: { kind: 'direct' },
      parameters: [INPUT_PARAMETER],
      result: jsonCodec('json'),
    },
    {
      id: 'dsh-skill-mover#skillMover/uninstall',
      service: 'skillMover',
      namespace: 'skillMover',
      method: 'uninstall',
      invocation: { kind: 'direct' },
      parameters: [INPUT_PARAMETER],
      result: jsonCodec('json'),
    },
  ],
};

/** Unwrap a RemoteResult: return `value`, throw a readable Error on failure. */
export function unwrap(result) {
  if (result && result.ok) return result.value;
  const err = result && result.error ? result.error : {};
  throw new Error(`${err.message || 'remote call failed'}${err.code ? ` (${err.code})` : ''}`);
}
