/**
 * DSH Skill Mover — bundle host half.
 *
 * Exposes a Typert Remote service (`skillMover`) with three endpoints
 * (scan / migrate / remove) that the browser client half calls. The actual
 * scanning and migration logic lives in lib/core.js (shared with the
 * dynamic-plugin version of this plugin).
 *
 * Note: this file is compiled with `tsc` (NOT esbuild) because the `@Remote`
 * decorators need standard (stage-3) semantics, which esbuild lowers to the
 * legacy form the runtime rejects.
 */
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { Context } from '@deepseek-ai/cordis';
import { createCore } from './core.js';

export default class SkillMoverGateway extends TypertRemoteService {
  private core: ReturnType<typeof createCore>;

  constructor(ctx: Context) {
    super(ctx, 'skillMover');
    this.core = createCore(ctx);
  }

  /**
   * Scan all agent skill directories and build conflict groups.
   *
   * Note: parameters must be plain identifiers without defaults — the Typert
   * gateway derives wire signatures by parsing the method source, and
   * defaults/destructuring make it throw `signature-invalid`.
   */
  @Remote('scan')
  async scan(input: { overrides?: Record<string, string[]> }) {
    return await this.core.runScan(input?.overrides ?? {});
  }

  /** Migrate the selected skills (copy mode). */
  @Remote('migrate')
  async migrate(input: { selections?: Array<{ slug: string; sourceIndex?: number }>; mode?: string; overwrite?: boolean }) {
    return await this.core.runMigrate(input ?? {});
  }

  /** Remove previously migrated skills (rollback). */
  @Remote('remove')
  async remove(input: { slugs?: string[] }) {
    return await this.core.runRemove(input ?? {});
  }
}
