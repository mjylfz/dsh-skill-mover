#!/usr/bin/env node
/**
 * 回归测试：host 半身必须同时被「新旧两代」typert 协议发现。
 *
 * 背景（真机复现的 bug）：
 *  - 旧代协议（0.1.0-rc.x / 0.1.1-rc.2）：`@Remote()` 把标记写进模块私有 WeakMap。
 *  - 新代协议（0.1.5-rc.1，DSH Desktop 2.0.9 内嵌）：`remoteMethods()` 只读类原型上的
 *    `@deepseek-ai/dsh-typert-protocol/remote-methods` 字符串描述符。
 * 插件目录解析到旧代时，新网关读不到任何 marker → claims 为空 →
 * 不发布 `/api/skillMover/*` 路由 → 客户端全部 404，且日志无报错。
 *
 * 本测试同时断言两条路都在：
 *   A. 原型描述符（喂新网关）
 *   B. `@Remote()` 装饰器仍然保留，且旧代 `remoteMethods()` 能读到 3 个方法（喂旧网关）
 *
 * 用法（必须用 Electron-as-node 才能读 app.asar 里的运行时模块）：
 *   ELECTRON_RUN_AS_NODE=1 "/Applications/DSH Desktop.app/Contents/MacOS/DSH Desktop" \
 *     test/remote-descriptor.test.mjs
 *
 * 可用 SKM_RUNTIME_TYPERT 覆盖运行时 typert 模块路径（换机器 / 换版本时用）。
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runtimeModule } from './app-runtime.mjs'

/** 新代协议存放 Remote 描述符的原型属性 key（必须与运行时内部常量逐字一致）。 */
const DESCRIPTOR_KEY = '@deepseek-ai/dsh-typert-protocol/remote-methods'
/** 期望暴露的 wire 方法名，顺序 = 类声明顺序。 */
const EXPECTED_METHODS = ['scan', 'migrate', 'uninstall']

// DSH Desktop 2.0.10 起取消 app.asar，运行时模块在 Resources/app/node_modules。
// 早期版本在 Resources/app.asar.unpacked/node_modules —— 由 app-runtime.mjs 探测。
const DEFAULT_RUNTIME_TYPERT = runtimeModule('@deepseek-ai/dsh-typert-protocol/lib/index.js')
const RUNTIME_TYPERT = process.env.SKM_RUNTIME_TYPERT || DEFAULT_RUNTIME_TYPERT

const DIST_INDEX = fileURLToPath(new URL('../dist/index.js', import.meta.url))
const DIST_INDEX_SOURCE = readFileSync(DIST_INDEX, 'utf8')

/** 收集每条断言的结果；失败不中断，最后统一以非 0 退出。 */
const results = []
async function check(label, fn) {
  try {
    await fn()
    results.push({ label, ok: true })
    console.log(`  ✓ ${label}`)
  } catch (error) {
    results.push({ label, ok: false, error })
    const detail = String((error && error.message) || error).replace(/\n/g, '\n      ')
    console.error(`  ✗ ${label}\n      ${detail}`)
  }
}

console.log('remote-descriptor regression test')
console.log(`  dist/index.js   : ${DIST_INDEX}`)
console.log(`  runtime typert  : ${RUNTIME_TYPERT}`)
console.log('')

// ── 0. 采样：所有证据都在这里一次性读取 ─────────────────────────────────────
// 说明：后面的「幂等」用例会真的去调 plantRemoteDescriptor，那一步本身会写入原型。
// 如果把它放在读证据之前，「描述符缺失」的故障就会被它顺手补上，测试变成假绿。
// 所以先把所有判据快照下来，再做任何有副作用的调用。
const mod = await import(new URL('../dist/index.js', import.meta.url).href)
const Gateway = mod.default
const prototype = Gateway && Gateway.prototype
const descriptor = Object.getOwnPropertyDescriptor(prototype, DESCRIPTOR_KEY)?.value
const descriptorProp = Object.getOwnPropertyDescriptor(prototype, DESCRIPTOR_KEY)

let runtimeTypert = null
let runtimeImportError = null
try {
  runtimeTypert = await import(RUNTIME_TYPERT)
} catch (error) {
  runtimeImportError = error
}
/** 运行时（新代）remoteMethods 对「影子实例」的读取结果，提前快照。 */
const runtimeSeen = runtimeTypert
  ? runtimeTypert.remoteMethods(Object.create(prototype)).map((m) => m.exportName ?? m.method)
  : null
/** 运行时读到的原始 marker，提前快照。 */
const runtimeMarkers = runtimeTypert ? runtimeTypert.remoteMethods(Object.create(prototype)) : null

// ── 1. 构建产物 + 默认导出 ───────────────────────────────────────────────────
await check('dist/index.js 默认导出是一个类（有 prototype）', () => {
  assert.equal(typeof Gateway, 'function', 'default export 不是类/构造函数')
  assert.ok(prototype && typeof prototype === 'object', 'default export 没有 prototype')
})

// ── 2. 原型描述符静态断言（新网关路径） ─────────────────────────────────────
await check(`原型上有 own property "${DESCRIPTOR_KEY}"`, () => {
  assert.ok(
    Object.prototype.hasOwnProperty.call(prototype, DESCRIPTOR_KEY),
    '原型上没有该描述符 —— 新代网关会读到 0 个方法（正是本次修复的 bug）',
  )
})

await check('描述符以 Object.defineProperty 语义挂载（configurable: true）', () => {
  assert.ok(descriptorProp, `原型上没有 "${DESCRIPTOR_KEY}" 属性`)
  assert.equal(descriptorProp.configurable, true, 'configurable 应为 true')
  assert.ok(descriptorProp.value && typeof descriptorProp.value === 'object', '描述符 value 应为对象')
})

await check('descriptor.version === 1', () => {
  assert.equal(descriptor?.version, 1, `version 应为 1，实际 ${String(descriptor?.version)}`)
  assert.ok(descriptor, '描述符缺失')
})

await check('descriptor.methods 是数组且方法名依次为 scan, migrate, uninstall', () => {
  assert.ok(descriptor, '描述符缺失')
  assert.ok(Array.isArray(descriptor.methods), 'methods 不是数组（运行时 readRemoteMethodDescriptor 会抛错）')
  assert.deepEqual(
    descriptor.methods.map((m) => m.method),
    EXPECTED_METHODS,
  )
})

await check('每个 marker：无 exportName、无 mode、invocation.kind === "direct"', () => {
  assert.ok(descriptor, '描述符缺失')
  assert.ok(Array.isArray(descriptor.methods), 'methods 不是数组')
  assert.equal(descriptor.methods.length, EXPECTED_METHODS.length)
  descriptor.methods.forEach((marker, i) => {
    const where = `methods[${i}] (${EXPECTED_METHODS[i]})`
    // 坑 1：wire 名等于方法名时写 exportName 会让新版装饰器判重失败并抛
    //       "conflicting invocation markers"。
    assert.equal(
      Object.prototype.hasOwnProperty.call(marker, 'exportName'),
      false,
      `${where} 不应携带 exportName 字段`,
    )
    assert.deepEqual(Object.keys(marker).sort(), ['invocation', 'method'], `${where} 只应有 method / invocation`)
    // 坑 2：mode 只用于流式方法。
    assert.equal(Object.prototype.hasOwnProperty.call(marker, 'mode'), false, `${where} 不应携带 mode 字段`)
    // 坑 3：invocation 必须是 direct。
    assert.equal(marker.invocation?.kind, 'direct', `${where} invocation.kind 应为 'direct'`)
    assert.equal(marker.method, EXPECTED_METHODS[i], `${where} marker.method 与 wire 名不一致`)
  })
})

// ── 3. 用「运行时那份」remoteMethods 再验证一遍（关键证据） ──────────────────
await check('import 运行时 typert 模块（需 ELECTRON_RUN_AS_NODE=1）', () => {
  assert.equal(
    runtimeImportError,
    null,
    `无法 import ${RUNTIME_TYPERT}: ${runtimeImportError?.message}\n` +
      '请用：ELECTRON_RUN_AS_NODE=1 "/Applications/DSH Desktop.app/Contents/MacOS/DSH Desktop" test/remote-descriptor.test.mjs',
  )
})

await check('运行时 remoteMethods 存在', () => {
  assert.ok(runtimeTypert, '运行时 typert 模块未能加载')
  assert.equal(typeof runtimeTypert.remoteMethods, 'function', '运行时模块没有导出 remoteMethods')
})

await check('运行时 remoteMethods(Object.create(prototype)) === [scan, migrate, uninstall]', () => {
  assert.deepEqual(runtimeSeen, EXPECTED_METHODS)
})

await check('运行时读到的 marker 未携带 exportName / mode（网关 exportName ?? method 取到方法名）', () => {
  assert.ok(runtimeMarkers, '运行时 typert 模块未能加载')
  assert.equal(runtimeMarkers.length, EXPECTED_METHODS.length)
  for (const marker of runtimeMarkers) {
    assert.equal(Object.prototype.hasOwnProperty.call(marker, 'exportName'), false, `${marker.method} 带了 exportName`)
    assert.equal(Object.prototype.hasOwnProperty.call(marker, 'mode'), false, `${marker.method} 带了 mode`)
    assert.equal(marker.invocation?.kind, 'direct', `${marker.method} 不是 direct 调用`)
  }
})

// 真实实例（不是 Object.create 的影子对象）：走一遍 Gateway 实际会做的事。
await check('运行时 remoteMethods(真实实例) 也能读到 3 个方法', async () => {
  assert.ok(runtimeTypert, '运行时 typert 模块未能加载')
  const { Context } = await import('@deepseek-ai/cordis')
  const instance = new Gateway(new Context())
  const seen = runtimeTypert.remoteMethods(instance).map((m) => m.exportName ?? m.method)
  assert.deepEqual(seen, EXPECTED_METHODS)
})

// ── 4. 旧网关路径：@Remote 装饰器必须仍然有效 ────────────────────────────────
// 旧代协议把标记写在模块私有 WeakMap 里，且只在「构造实例」时写入
// （tsc stage-3 产物把 initializer 挂在实例字段上）。所以这里必须真的 new 一个。
await check('旧代（本地安装的 dsh-typert-protocol）remoteMethods(真实实例) 仍能读到 3 个方法', async () => {
  const localTypert = await import('@deepseek-ai/dsh-typert-protocol')
  const { Context } = await import('@deepseek-ai/cordis')
  const instance = new Gateway(new Context())
  const seen = localTypert.remoteMethods(instance).map((m) => m.exportName ?? m.method)
  assert.deepEqual(seen, EXPECTED_METHODS, '旧网关读 WeakMap 失败 —— @Remote 装饰器被破坏或丢失')
})

await check('dist/index.js 源码里保留了 @Remote(...) 标记调用（旧网关依赖它）', () => {
  for (const method of EXPECTED_METHODS) {
    assert.ok(
      DIST_INDEX_SOURCE.includes(`Remote('${method}')`),
      `dist/index.js 里找不到 Remote('${method}') —— 旧代网关会失效`,
    )
  }
})

// ── 5. 幂等性（防 HMR / 重复加载叠加） ──────────────────────────────────────
// 放最后：这一步会真的调用 plantRemoteDescriptor 并有写入原型的可能，
// 不能让它影响上面任何一条「描述符是否存在」的判据。
await check('plantRemoteDescriptor 幂等（一次性对象）：首次种 true、再次种 false、方法不叠加', async () => {
  const { plantRemoteDescriptor } = await import(new URL('../dist/remote-descriptor.js', import.meta.url).href)
  const target = {}
  assert.equal(plantRemoteDescriptor(target, EXPECTED_METHODS), true, '首次种植应返回 true')
  assert.equal(plantRemoteDescriptor(target, EXPECTED_METHODS), false, '重复种植应返回 false（跳过）')
  assert.deepEqual(
    target[DESCRIPTOR_KEY].methods.map((m) => m.method),
    EXPECTED_METHODS,
    '重复种植后方法列表被改变/叠加了',
  )
})

await check('plantRemoteDescriptor 幂等（真实原型）：已有描述符时返回 false、方法数不变', async () => {
  const { plantRemoteDescriptor } = await import(new URL('../dist/remote-descriptor.js', import.meta.url).href)
  const planted = plantRemoteDescriptor(prototype, EXPECTED_METHODS)
  assert.equal(planted, false, '真实原型上已有描述符，重复种植应返回 false')
  assert.deepEqual(
    Object.getOwnPropertyDescriptor(prototype, DESCRIPTOR_KEY).value.methods.map((m) => m.method),
    EXPECTED_METHODS,
  )
})

// ── 6. 与新版装饰器共存：插件自己解析到新代协议时的路径 ──────────────────────
// 场景：插件目录里装的就是 0.1.5+。此时 `@Remote()` 在「构造实例」时也会去写同一个
// 原型描述符（tsc 的 stage-3 产物把它挂在实例字段初始化器上），而我们的描述符在
// 模块求值期就已经种下 —— 必须让新版的判重逻辑认可它并提前 return，而不是抛
// `conflicting invocation markers`。这里按真实时序复刻：先收集 initializer
// （类定义期）→ 再种描述符（模块求值期）→ 最后跑 initializer（构造期）。
function simulateNewDecorator(exportNameForDecorator, method) {
  const extraInitializers = []
  const decoratorContext = {
    kind: 'method',
    name: method,
    static: false,
    private: false,
    access: {},
    addInitializer: (fn) => extraInitializers.push(fn),
  }
  runtimeTypert.Remote(exportNameForDecorator)(function () {}, decoratorContext)
  const fakePrototype = { [method]() {} }
  plantRemoteDescriptorInto(fakePrototype, [method])
  for (const init of extraInitializers) init.call(Object.create(fakePrototype))
  return {
    seen: runtimeTypert.remoteMethods(Object.create(fakePrototype)).map((m) => m.exportName ?? m.method),
    markerCount: Object.getOwnPropertyDescriptor(fakePrototype, DESCRIPTOR_KEY).value.methods.length,
  }
}

let plantRemoteDescriptorInto = () => {
  throw new Error('plantRemoteDescriptor 未加载')
}

await check('新版装饰器 + 我们的描述符共存：不抛 conflicting markers、不产生重复项', async () => {
  assert.ok(runtimeTypert, '运行时 typert 模块未能加载')
  plantRemoteDescriptorInto = (await import(new URL('../dist/remote-descriptor.js', import.meta.url).href))
    .plantRemoteDescriptor
  for (const method of EXPECTED_METHODS) {
    const { seen, markerCount } = simulateNewDecorator(method, method)
    assert.deepEqual(seen, [method], `${method}: 新版 remoteMethods 结果不对`)
    assert.equal(markerCount, 1, `${method}: 描述符里出现了重复 marker（叠加）`)
  }
})

await check('坑 1 实证：wire 名等于方法名却写 exportName 时，新版装饰器确实抛错', () => {
  assert.ok(runtimeTypert, '运行时 typert 模块未能加载')
  const extraInitializers = []
  const decoratorContext = {
    kind: 'method',
    name: 'scan',
    static: false,
    private: false,
    access: {},
    addInitializer: (fn) => extraInitializers.push(fn),
  }
  runtimeTypert.Remote('scan')(function () {}, decoratorContext)
  const fakePrototype = { scan() {} }
  Object.defineProperty(fakePrototype, DESCRIPTOR_KEY, {
    configurable: true,
    value: Object.freeze({
      version: 1,
      methods: Object.freeze([
        Object.freeze({ method: 'scan', exportName: 'scan', invocation: Object.freeze({ kind: 'direct' }) }),
      ]),
    }),
  })
  assert.throws(
    () => {
      for (const init of extraInitializers) init.call(Object.create(fakePrototype))
    },
    /conflicting invocation markers/,
    '这条约束失效了：写 exportName 竟然没报错',
  )
})

// ── 汇总 ────────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.ok)
console.log('')
if (failed.length > 0) {
  console.error(`REMOTE DESCRIPTOR TEST FAIL — ${failed.length}/${results.length} 条断言失败:`)
  for (const f of failed) console.error(`  ❌ ${f.label}`)
  process.exit(1)
}
console.log(`REMOTE DESCRIPTOR TEST PASS — ${results.length}/${results.length} 条断言通过`)
console.log('  新网关：原型描述符 ✓    旧网关：@Remote 装饰器 ✓')
