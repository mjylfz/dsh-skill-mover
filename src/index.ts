/**
 * DSH Skill Mover — bundle host half.
 *
 * Exposes a Typert Remote service (`skillMover`) with three endpoints
 * (scan / migrate / uninstall) that the browser client half calls. The actual
 * scanning and migration logic lives in lib/core.js (shared with the
 * dynamic-plugin version of this plugin).
 *
 * Note: this file is compiled with `tsc` (NOT esbuild) because the `@Remote`
 * decorators need standard (stage-3) semantics, which esbuild lowers to the
 * legacy form the runtime rejects.
 *
 * Cross-version note: `@Remote` alone is only enough for the OLD typert
 * protocol (which stores markers in a module-private WeakMap). The NEW
 * protocol (0.1.5-rc.1+, embedded in DSH Desktop 2.0.9) reads a versioned
 * string descriptor on the class prototype instead. So we keep the decorators
 * AND plant that descriptor by hand after the class definition — see
 * src/remote-descriptor.ts for the full story.
 */
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { Context } from '@deepseek-ai/cordis';
import { createCore } from './core.js';
import { plantRemoteDescriptor } from './remote-descriptor.js';

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

  /**
   * Remove previously migrated skills (rollback).
   *
   * Note: the wire name must NOT be `remove` — the client-side
   * RemoteNamespaceService already owns a `remove` method, and mounting a
   * remote method with the same name fails client validation with
   * "method ... conflicts with its namespace service".
   */
  @Remote('uninstall')
  async uninstall(input: { slugs?: string[] }) {
    return await this.core.runRemove(input ?? {});
  }
}

/**
 * Wire 名清单：必须与上面 3 个 `@Remote(...)` 的参数逐一对应。
 *
 * 为什么要手写一份：`@Remote` 在旧代协议里只写模块私有 WeakMap，新代协议
 * 只读原型描述符。宿主运行时用哪一代，取决于插件目录解析到哪一份
 * `dsh-typert-protocol`，插件自己无法在运行时判断该走哪条路 ——
 * 所以两条路都铺：装饰器留给旧网关，这个描述符留给新网关。
 */
const REMOTE_METHOD_NAMES = ['scan', 'migrate', 'uninstall'] as const

// 必须在类定义「之后」执行：此时 SkillMoverGateway.prototype 已经存在。
// 幂等由 plantRemoteDescriptor 内部保证（原型上已有描述符时不重复种）。
plantRemoteDescriptor(SkillMoverGateway.prototype, REMOTE_METHOD_NAMES);
