/**
 * 新旧两代 @deepseek-ai/dsh-typert-protocol 的 Remote 标记兼容层。
 *
 * 为什么需要这个文件：
 * 两代协议把「哪些方法可以被 Gateway 远程调用」这条信息存在了不同的地方。
 *
 *  - 旧代（0.1.0-rc.x / 0.1.1-rc.2）：
 *    `@Remote()` 把标记写进模块私有的 `new WeakMap<prototype, Map<method, marker>>()`，
 *    同一个模块里的 `remoteMethods(service)` 也从那个 WeakMap 里读。
 *  - 新代（0.1.5-rc.1 起）：
 *    `@Remote()` 把标记写成「类原型上的一个字符串 key 属性」，
 *    `remoteMethods(service)` 只读这个原型描述符，完全不再看 WeakMap。
 *
 * 麻烦在于插件和宿主运行时各自解析自己的那份 `dsh-typert-protocol`。
 * 插件目录里装的是旧代时，`@Remote()` 写的是旧代的 WeakMap；
 * 而宿主 2.0.9 内嵌的运行时网关是新代，只读原型描述符 —— 于是
 * `remoteMethods()` 返回空数组，Gateway 一个 `/api/skillMover/*` 路由都不发布，
 * 客户端每个请求 404，且日志里没有任何报错。
 *
 * 解法是两条路都铺一遍：
 *  - 保留 `@Remote()` 装饰器 → 喂饱旧网关（它读 WeakMap）；
 *  - 类定义之后额外把新代描述符种到原型上 → 喂饱新网关（它读原型）。
 *
 * @module dsh-skill-mover/remote-descriptor
 */

/**
 * 新代协议用来存放 Remote 方法描述符的属性 key。
 *
 * 这个字符串必须和运行时 `@deepseek-ai/dsh-typert-protocol` 内部的常量逐字一致。
 * 它没有被包导出（0.1.5-rc.1 的 lib/index.js 只导出 Remote / RemoteScope /
 * TypertRemoteService / bindTypertRemote / isTypertRemoteSegment / remoteErrorOf /
 * remoteMethods），所以这里只能硬编码，不能 import。
 */
export const REMOTE_METHOD_DESCRIPTOR = '@deepseek-ai/dsh-typert-protocol/remote-methods'

/** 新代描述符要求的版本号；`remoteMethods()` 读到的 version 不是 1 就直接抛错。 */
const REMOTE_METHOD_DESCRIPTOR_VERSION = 1

/**
 * 把一个方法名塑造成新代协议接受的 marker。
 *
 * 三个必须遵守的约束（违反其一会被运行时的判重逻辑抛错）：
 *
 *  1. wire 名等于方法名时**不能写 `exportName`**。新代装饰器在重复探测时用
 *     `current.exportName === marker.exportName` 判重，而它在 wire 名等于方法名时
 *     会省略该字段。我们要是写 `exportName: 'scan'`，判重就变成
 *     `'scan' !== undefined`，直接抛
 *     `typert-protocol: Remote method "scan" has conflicting invocation markers`。
 *  2. `mode` 只在流式方法上写（`mode: 'stream'`）。本项目 3 个方法都是普通直调，
 *     所以这里一律不写。
 *  3. `invocation` 必须是 `{ kind: 'direct' }`。
 *
 * @param method 方法名，同时也是 wire 上的 export 名。
 * @returns 冻结后的 marker。
 */
function buildRemoteMethodMarker(method: string) {
  return Object.freeze({
    method,
    invocation: Object.freeze({ kind: 'direct' as const }),
  })
}

/**
 * 把新代 Remote 描述符种到类原型上，让读原型的新网关也能发现这些远程方法。
 *
 * 幂等：原型上已经有这个描述符时直接返回 `false` 不做任何事。
 * 这一步是防御 HMR / 重复加载 —— 新代协议的 `mark()` 是往已有描述符里
 * **追加** marker 的，重复种会叠加出重复项。
 *
 * 注意 `@Remote` 装饰器在 tsc 的 stage-3 产物里是挂在实例字段初始化器上的
 * （`core = __runInitializers(this, _instanceExtraInitializers)`），
 * 也就是**构造实例时**才写标记，晚于本函数在模块求值期的执行。
 * 所以本函数先种、装饰器后跑时，新代的判重逻辑会认出来并提前 return，
 * 不会冲突、也不会重复。
 *
 * @param prototype 目标类原型，例如 `SkillMoverGateway.prototype`。
 * @param methods 需要暴露给 Gateway 的方法名（wire 名与 TS 方法名一致）。
 * @returns 真正种下去了返回 `true`；原型上已有描述符而跳过则返回 `false`。
 */
export function plantRemoteDescriptor(prototype: object, methods: readonly string[]): boolean {
  if (prototype === null || prototype === undefined) {
    throw new TypeError('typert-protocol: cannot plant Remote descriptor on a null prototype')
  }
  if (Object.prototype.hasOwnProperty.call(prototype, REMOTE_METHOD_DESCRIPTOR)) {
    return false
  }
  Object.defineProperty(prototype, REMOTE_METHOD_DESCRIPTOR, {
    configurable: true,
    value: Object.freeze({
      version: REMOTE_METHOD_DESCRIPTOR_VERSION,
      methods: Object.freeze(methods.map(buildRemoteMethodMarker)),
    }),
  })
  return true
}
