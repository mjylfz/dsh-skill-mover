// DSH Skill Mover — bundle client half (ModuleLoader handoff bundle).
// UI extracted from the dynamic-plugin client half; RPC switched from
// host.call to the Typert Remote service `skillMover`.
import { createElement, useState, useEffect } from 'react';
import { SKILL_MOVER_REMOTE, unwrap } from './remote.js';

export const CSS = `
.skm { padding: 8px 4px 32px; max-width: 880px; color: var(--dsw-alias-label-primary); }
.skm-hero { padding: 4px 2px 0; }
.skm-hero h2 { margin: 0 0 8px; font-size: 17px; letter-spacing: .2px; }
.skm-sub { margin: 0 0 8px; font-size: 14px; font-weight: 600; line-height: 1.6; color: var(--dsw-alias-label-primary); }
.skm-q { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; font-size: 13px; color: var(--dsw-alias-label-secondary); margin-left: 4px; cursor: help; vertical-align: -2px; flex: none; line-height: 1; }
.skm-q::after { content: attr(data-tip); position: absolute; left: 50%; top: calc(100% + 8px); transform: translateX(-50%); background: var(--dsw-alias-bg-overlay); color: var(--dsw-alias-label-primary); border: 1px solid var(--dsw-alias-border-l2); padding: 8px 12px; border-radius: 8px; font-size: 11.5px; font-weight: 400; line-height: 1.6; width: max-content; max-width: 320px; white-space: normal; word-break: break-word; box-shadow: 0 4px 14px rgba(0,0,0,.14); opacity: 0; pointer-events: none; transition: opacity .15s; z-index: 40; }
.skm-q:hover::after { opacity: 1; }
.skm-bar { display: flex; align-items: center; gap: 10px; margin: 12px 0; font-size: 12.5px; color: var(--dsw-alias-label-secondary); }
.skm-bar .skm-stat { font-weight: 600; color: var(--dsw-alias-label-primary); }
.skm-btn { border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); border-radius: 8px; padding: 6px 14px; font-size: 12.5px; cursor: pointer; transition: border-color .15s, background .15s; }
.skm-btn:hover:not(:disabled) { border-color: var(--dsw-alias-brand-primary); }
.skm-btn:disabled { opacity: .45; cursor: default; }
.skm-btn-primary { background: var(--dsw-alias-brand-primary); border-color: transparent; color: #fff; font-weight: 600; padding: 7px 18px; }
.skm-btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
.skm-error { margin: 10px 0; padding: 10px 14px; border: 1px solid var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); border-radius: 8px; font-size: 12.5px; line-height: 1.6; }
.skm-source { border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; margin-bottom: 10px; background: var(--dsw-alias-bg-layer-1); box-shadow: 0 1px 2px rgba(0,0,0,.04); }
.skm-source-head { display: flex; align-items: center; gap: 9px; padding: 10px 14px; font-size: 13px; font-weight: 600; cursor: pointer; user-select: none; border-radius: 12px 12px 0 0; }
.skm-source-head:hover { background: var(--dsw-alias-bg-layer-2); }
.skm-source-head .skm-arrow { font-size: 10px; color: var(--dsw-alias-label-secondary); width: 12px; flex: none; transition: transform .12s; }
.skm-source-head .skm-ic { font-size: 15px; }
.skm-source-head .skm-count { font-weight: 400; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.skm-source-head input[type=checkbox] { margin: 0; accent-color: var(--dsw-alias-brand-primary); width: 14px; height: 14px; cursor: pointer; }
.skm-tag { margin-left: auto; font-size: 10.5px; padding: 2px 9px; border-radius: 11px; white-space: nowrap; font-weight: 500; flex: none; }
.skm-tag-native { background: var(--dsw-alias-brand-primary); color: #fff; }
.skm-tag-missing { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); border: 1px solid var(--dsw-alias-border-l1); }
.skm-tag-ok { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent); color: var(--dsw-alias-state-success-primary); }
.skm-root { padding: 0 14px 8px; font-size: 10.5px; color: var(--dsw-alias-label-secondary); opacity: .85; word-break: break-all; }
.skm-skill { display: flex; align-items: flex-start; gap: 10px; padding: 9px 14px 9px 10px; border-top: 1px solid var(--dsw-alias-border-l1); transition: background .12s; }
.skm-skill:hover { background: var(--dsw-alias-bg-layer-2); }
.skm-skill:last-child { border-radius: 0 0 12px 12px; }
.skm-missing { padding: 10px 14px; border-top: 1px solid var(--dsw-alias-border-l1); font-size: 11.5px; color: var(--dsw-alias-label-secondary); line-height: 1.6; border-radius: 0 0 12px 12px; }
.skm-skill input[type=checkbox] { margin-top: 3px; accent-color: var(--dsw-alias-brand-primary); width: 14px; height: 14px; }
.skm-skill-main { flex: 1; min-width: 0; }
.skm-skill-name { font-size: 13px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-weight: 500; }
.skm-badge { font-size: 10px; padding: 1px 8px; border-radius: 10px; border: 1px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); white-space: nowrap; font-weight: 400; }
.skm-badge-warn { border-color: var(--dsw-alias-state-warn-primary); color: var(--dsw-alias-state-warn-primary); }
.skm-badge-info { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.skm-conflict { margin: 6px 0 2px 24px; padding: 8px 12px; border: 1px dashed var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-layer-2); }
.skm-conflict-row { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 4px 0; }
.skm-conflict-row input { accent-color: var(--dsw-alias-brand-primary); }
.skm-conflict-row .skm-path { color: var(--dsw-alias-label-secondary); font-size: 10.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px; }
.skm-recommend { font-size: 10px; color: var(--dsw-alias-brand-primary); font-weight: 600; }
.skm-deps { margin: 5px 0 1px 24px; font-size: 11px; color: var(--dsw-alias-state-warn-primary); }
.skm-switch { margin-left: 24px; font-size: 11px; color: var(--dsw-alias-brand-primary); background: none; border: none; cursor: pointer; padding: 2px 0; }
.skm-missing { padding: 10px 14px; border-top: 1px solid var(--dsw-alias-border-l1); font-size: 11.5px; color: var(--dsw-alias-label-secondary); line-height: 1.6; }
.skm-foot { position: sticky; bottom: 0; margin-top: 16px; padding: 12px 16px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; background: var(--dsw-alias-bg-overlay); display: flex; align-items: center; gap: 16px; flex-wrap: wrap; box-shadow: 0 -4px 16px rgba(0,0,0,.06); }
.skm-foot label { font-size: 12.5px; display: inline-flex; align-items: center; gap: 5px; cursor: pointer; }
.skm-foot input { accent-color: var(--dsw-alias-brand-primary); }
.skm-foot .skm-spacer { flex: 1; }
.skm-progress { padding: 48px 0; text-align: center; font-size: 13.5px; color: var(--dsw-alias-label-secondary); }
.skm-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid var(--dsw-alias-border-l2); border-top-color: var(--dsw-alias-brand-primary); border-radius: 50%; margin-right: 8px; vertical-align: -2px; animation: skm-spin .8s linear infinite; }
@keyframes skm-spin { to { transform: rotate(360deg); } }
.skm-results { margin-top: 10px; }
.skm-result-item { display: flex; align-items: baseline; gap: 8px; padding: 9px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; margin-bottom: 7px; font-size: 12.5px; }
.skm-result-ok { border-left: 3px solid var(--dsw-alias-state-success-primary); }
.skm-result-skip { border-left: 3px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); }
.skm-result-fail { border-left: 3px solid var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
.skm-result-err { font-size: 11px; color: var(--dsw-alias-state-error-primary); margin-left: 4px; word-break: break-all; }
.skm-empty { padding: 48px 0; text-align: center; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 1.8; }
.skm-summary { font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
.skm-banner { margin: 10px 0; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--dsw-alias-state-warn-primary); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 8%, transparent); font-size: 12px; line-height: 1.7; color: var(--dsw-alias-label-primary); }
`

// Values returned over RPC are external input. Only render scalar text here;
// this prevents accidental object coercion such as "[object Object]".
function textValue(value, fallback = '') {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
}

export function SkillMoverPage(props) {
  const [phase, setPhase] = useState('loading')
  const [scan, setScan] = useState(null)
  const [selected, setSelected] = useState({})
  const [mode, setMode] = useState('copy')
  const [overwrite, setOverwrite] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [openConflict, setOpenConflict] = useState({})
  const [openSources, setOpenSources] = useState({})

  useEffect(() => { doScan() }, [])

  async function doScan() {
    setPhase('loading')
    setError(null)
    setResults(null)
    try {
      const res = await props.api.scan({})
      if (!res) { setError('扫描失败'); setPhase('ready'); return }
      setScan(res)
      const sel = {}
      for (const g of res.groups || []) {
        const top = g.candidates[g.recommendedIndex] || {}
        sel[g.slug] = { on: !g.isNative && !g.installed && !top.duplicates.length, sourceIndex: g.recommendedIndex }
      }
      setSelected(sel)
      setOpenSources({})
      setPhase('ready')
    } catch (e) {
      setError(String((e && e.message) || e))
      setPhase('ready')
    }
  }

  function toggle(slug, on) {
    setSelected(prev => {
      const next = Object.assign({}, prev)
      const cur = next[slug] || { on: true, sourceIndex: 0 }
      next[slug] = Object.assign({}, cur, { on })
      return next
    })
  }

  function pickSource(slug, index) {
    setSelected(prev => {
      const next = Object.assign({}, prev)
      const cur = next[slug] || { on: true, sourceIndex: 0 }
      next[slug] = Object.assign({}, cur, { on: true, sourceIndex: index })
      return next
    })
  }

  function toggleAll(sourceId, on) {
    const updates = []
    for (const g of (scan && scan.groups) || []) {
      const idx = g.candidates.findIndex(c => c.sourceId === sourceId)
      if (idx < 0) continue
      updates.push({ slug: g.slug, idx })
    }
    setSelected(prev => {
      const next = Object.assign({}, prev)
      for (const u of updates) {
        const cur = next[u.slug] || { on: true, sourceIndex: 0 }
        next[u.slug] = Object.assign({}, cur, { on: on, sourceIndex: on ? u.idx : cur.sourceIndex })
      }
      return next
    })
  }

  function allCheckedFor(sourceId) {
    let total = 0; let on = 0
    for (const g of (scan && scan.groups) || []) {
      if (!g.candidates.some(c => c.sourceId === sourceId)) continue
      total += 1
      const cur = selected[g.slug]
      const top = cur && g.candidates[cur.sourceIndex]
      if (cur && cur.on && top && top.sourceId === sourceId) on += 1
    }
    return { total, on }
  }

  function toggleSource(id, e) {
    if (e) e.stopPropagation()
    setOpenSources(prev => {
      const next = Object.assign({}, prev)
      next[id] = !next[id]
      return next
    })
  }

  function displayPath(p, home) {
    const value = textValue(p)
    const homePath = textValue(home)
    if (!value) return ''
    if (homePath && value.indexOf(homePath) === 0) return '~' + value.slice(homePath.length)
    return value
  }

  async function doMigrate() {
    const selections = Object.keys(selected)
      .filter(s => selected[s] && selected[s].on)
      .filter(s => {
        const g = groupOf(s)
        return !(g && g.isNative)
      })
      .map(s => ({ slug: s, sourceIndex: selected[s].sourceIndex }))
    if (!selections.length) return
    setPhase('migrating')
    setError(null)
    try {
      const res = await props.api.migrate({ selections, mode: 'copy', overwrite })
      if (!res) { setError('迁移失败'); setPhase('ready'); return }
      setResults(res.results || [])
      setPhase('done')
    } catch (e) {
      setError(String((e && e.message) || e))
      setPhase('ready')
    }
  }

  async function doRemove(slugs) {
    setPhase('migrating')
    try {
      const res = await props.api.remove({ slugs })
      if (!res) { setError('移除失败'); setPhase('done'); return }
      setResults((res.results || []).map(r => Object.assign({}, r, { removed: true })))
      setPhase('done')
    } catch (e) {
      setError(String((e && e.message) || e))
      setPhase('done')
    }
  }

  const groupOf = (slug) => (scan && scan.groups || []).find(g => g.slug === slug)

  // ---- render ----
  const h = createElement

  if (phase === 'loading') {
    return h('div', { className: 'skm' },
      h('div', { className: 'skm-progress' },
        h('span', { className: 'skm-spinner' }),
        '正在扫描本机各 Agent 的技能目录…'))
  }

  if (phase === 'migrating') {
    return h('div', { className: 'skm' },
      h('div', { className: 'skm-progress' },
        h('span', { className: 'skm-spinner' }),
        '正在迁移,请稍候…'))
  }

  if (phase === 'done' && results) {
    const ok = results.filter(r => r.status === 'ok')
    const skip = results.filter(r => r.status === 'skip')
    const fail = results.filter(r => r.status === 'fail')
    const depSlugs = ok.filter(r => (r.deps || []).length)
    return h('div', { className: 'skm' },
      h('div', { className: 'skm-hero' },
        h('h2', null, '迁移完成'),
        h('p', { className: 'skm-sub' }, '成功 ' + ok.length + ' 个,跳过 ' + skip.length + ' 个,失败 ' + fail.length + ' 个。新技能会被 DSH 自动发现,无需重启。')),
      error ? h('div', { className: 'skm-error' }, error) : null,
      depSlugs.length ? h('div', { className: 'skm-banner' },
        '⚠️ 这些技能带有依赖声明(requirements.txt / package.json 等),DSH 不会自动安装依赖,需要时请自行安装:' +
        depSlugs.map(r => r.slug).join('、')) : null,
      h('div', { className: 'skm-results' },
        results.map(r => {
          const cls = r.status === 'ok' ? 'skm-result-ok' : r.status === 'skip' ? 'skm-result-skip' : 'skm-result-fail'
          const text = r.status === 'ok' ? '✓ ' + r.slug + ' 已迁移' : r.status === 'skip' ? '– ' + r.slug + ' 跳过:' + (r.reason || '') : '✗ ' + r.slug + ' 失败'
          return h('div', { key: r.slug, className: 'skm-result-item ' + cls },
            h('span', null, text),
            r.error ? h('span', { className: 'skm-result-err' }, r.error) : null)
        })),
      h('div', { className: 'skm-foot' },
        h('span', { className: 'skm-summary' }, '迁移为复制模式:DSH 内是独立副本,原目录删除也不受影响。'),
        h('span', { className: 'skm-spacer' }, null),
        h('button', { className: 'skm-btn', onClick: () => doScan() }, '重新扫描'),
        h('button', { className: 'skm-btn', onClick: () => doRemove(ok.map(r => r.slug)) }, '移除本次迁移'),
      ))
  }

  // phase === 'ready'
  const countOn = Object.keys(selected).filter(s => selected[s] && selected[s].on).length
  const countAll = (scan && scan.groups || []).length
  const countInstalled = (scan && scan.groups || []).filter(g => g.installed).length
  const foundPlatforms = (scan && scan.sources || []).filter(s => s.skillCount > 0).length
  const home = scan && scan.env && scan.env.home

  return h('div', { className: 'skm' },
    h('div', { className: 'skm-hero' },
      h('h2', null, 'Skill 迁移'),
      h('p', { className: 'skm-sub' },
        '把电脑上其他 Agent 已经装好的技能,一键搬进 DeepSeek Harness。',
        h('span', { className: 'skm-q', 'data-tip': '将安装到: ' + displayPath(scan && scan.targetRoot, home) + ' (DSH 的技能目录)' }, 'ⓘ'))),
    h('div', { className: 'skm-bar' },
      h('span', null, '共发现 ',
        h('span', { className: 'skm-stat' }, countAll),
        ' 个技能组 · 已勾选 ',
        h('span', { className: 'skm-stat' }, countOn),
        ' 个 · 来自 ',
        h('span', { className: 'skm-stat' }, foundPlatforms),
        ' 个平台'),
      h('span', { className: 'skm-spacer', style: { flex: 1 } }, null),
      h('button', { className: 'skm-btn', onClick: () => doScan() }, '重新扫描')),
    error ? h('div', { className: 'skm-error' }, error) : null,
    (scan && scan.sources || []).map(src => {
      const rows = (src.slugs || []).filter(slug => !!groupOf(slug))
      const exists = src.roots.some(r => r.exists)
      const rootPath = (src.roots[0] && src.roots[0].path) || ''
      const c = allCheckedFor(src.id)
      const indeterminate = c.on > 0 && c.on < c.total
      const open = !!openSources[src.id]
      const isNative = !!src.native
      if (!exists && !rows.length) {
        return h('div', { key: src.id, className: 'skm-source' },
          h('div', { className: 'skm-source-head', onClick: () => toggleSource(src.id) },
            h('span', { className: 'skm-arrow' }, open ? '▼' : '▶'),
            h('input', {
              type: 'checkbox',
              checked: false,
              disabled: true,
              onClick: e => e.stopPropagation(),
            }),
            h('span', null, textValue(src.name, '未知来源')),
            h('span', { className: 'skm-count' }, '未安装'),
            h('span', { className: 'skm-tag skm-tag-missing' }, '无技能目录'),
            h('span', { className: 'skm-spacer', style: { flex: 1 } }, null)),
          open ? h('div', { className: 'skm-missing' },
            '未检测到技能目录 ' + rootPath + ' 。若已安装此工具,可检查其配置目录是否正确。') : null)
      }
      return h('div', { key: src.id, className: 'skm-source' },
        h('div', { className: 'skm-source-head', onClick: () => toggleSource(src.id) },
          h('span', { className: 'skm-arrow' }, open ? '▼' : '▶'),
          h('input', {
            type: 'checkbox',
            checked: isNative ? true : (c.total > 0 && c.on === c.total),
            disabled: isNative,
            ref: el => { if (el) el.indeterminate = !isNative && indeterminate },
            onClick: e => e.stopPropagation(),
            onChange: e => { if (!isNative) toggleAll(src.id, e.target.checked) },
          }),
          h('span', null, textValue(src.name, '未知来源')),
          h('span', { className: 'skm-count' }, rows.length + ' 个技能'),
          isNative ? h('span', { className: 'skm-tag skm-tag-native' }, 'DSH 原生支持') : null,
          !isNative && exists ? h('span', { className: 'skm-tag skm-tag-ok' }, '已检测') : null,
          isNative ? h('span', { className: 'skm-q', 'data-tip': '共享层的技能 DSH 直接就能用,不用迁移。', onClick: e => e.stopPropagation() }, 'ⓘ') : null,
        ),
        open ? h('div', null,
          exists ? h('div', { className: 'skm-root' }, displayPath(rootPath, home)) : null,
          rows.map(slug => renderSkillRow(h, slug, groupOf(slug), selected, openConflict, toggle, pickSource, setOpenConflict, isNative, src.id)),
        ) : null,
      )
    }),
    !countAll ? h('div', { className: 'skm-empty' },
      h('div', null, '没有发现任何可迁移的技能。'),
      h('div', null, '技能通常放在 ~/.cursor/skills、~/.codex/skills、~/.hermes/skills 等目录。'),
      h('div', null, '确认某个工具已经安装过技能后,再点「重新扫描」。')) : null,
    h('div', { className: 'skm-foot' },
      h('label', null,
        h('input', { type: 'checkbox', checked: overwrite, onChange: e => setOverwrite(e.target.checked) }),
        '覆盖已安装'),
      h('span', { className: 'skm-spacer' }, null),
      h('button', { className: 'skm-btn skm-btn-primary', disabled: countOn === 0, onClick: doMigrate },
        '迁移所选 ' + countOn + ' 个技能'),
    ))
}

function renderSkillRow(h, slug, group, selected, openConflict, toggle, pickSource, setOpenConflict, locked, sourceId) {
  if (!group) return null
  const cur = selected[slug] || { on: true, sourceIndex: group.recommendedIndex }
  const top = group.candidates[cur.sourceIndex] || group.candidates[0]
  const topCand = group.candidates[group.recommendedIndex]
  const isFromOtherSource = top && topCand && top.sourceId !== topCand.sourceId
  // 行的勾选状态 = 组已勾选 且 组当前来源属于本平台;点击行 = 切换来源到本平台并勾选
  const isThisSource = !!(top && top.sourceId === sourceId)
  const rowChecked = isThisSource && !!cur.on
  const onRowChange = (e) => {
    if (locked) return
    if (e.target.checked) {
      const idx = group.candidates.findIndex(c => c.sourceId === sourceId)
      if (idx >= 0) pickSource(slug, idx)
    } else {
      toggle(slug, false)
    }
  }
  const badges = []
  if (group.installed) badges.push(h('span', { key: 'i', className: 'skm-badge' }, '已在 DSH'))
  if (group.hasConflict) badges.push(h('span', { key: 'c', className: 'skm-badge skm-badge-warn' }, '同名 ' + group.candidates.length + ' 处来源'))
  if (top && top.duplicates && top.duplicates.length) badges.push(h('span', { key: 'd', className: 'skm-badge skm-badge-info' }, '与共享层重复'))
  if (group.deps.length) badges.push(h('span', { key: 'p', className: 'skm-badge skm-badge-warn' }, '含依赖'))
  if (top && top.needsRename) badges.push(h('span', { key: 'n', className: 'skm-badge skm-badge-info' }, '自动规范命名'))

  const conflictOpen = openConflict[slug]
  const conflictView = group.hasConflict && !locked ? h('div', null,
    h('button', { className: 'skm-switch', onClick: () => setOpenConflict(Object.assign({}, openConflict, { [slug]: !conflictOpen })) },
      conflictOpen ? '▲ 收起' : '▼ 同名多个来源,当前选:' + textValue(top && top.sourceName, '未知来源') + ',点击切换'),
    conflictOpen ? h('div', { className: 'skm-conflict' },
      group.candidates.map((c, i) => h('label', { key: c.sourceId, className: 'skm-conflict-row' },
        h('input', { type: 'radio', name: 'skm-src-' + slug, checked: cur.sourceIndex === i, onChange: () => pickSource(slug, i) }),
        h('span', null,
          textValue(c.sourceName, '未知来源'),
          i === group.recommendedIndex ? h('span', { className: 'skm-recommend' }, ' 推荐') : null),
        c.version ? h('span', null, 'v' + c.version) : null,
        h('span', { className: 'skm-path' }, textValue(c.path, ''))))) : null) : null

  const depsView = top && top.deps && top.deps.length
    ? h('div', { className: 'skm-deps' }, '⚠ 依赖声明:' + top.deps.join('、') + ' — 需自行安装,DSH 不会自动装')
    : null

  const sourceLine = isFromOtherSource && top
    ? h('div', { className: 'skm-deps', style: { color: 'var(--dsw-alias-label-secondary)' } },
        '来源:' + textValue(top.sourceName, '未知来源') + (top.version ? ' v' + textValue(top.version) : ''))
    : null

  return h('div', { key: slug, className: 'skm-skill' },
    h('input', { type: 'checkbox', checked: locked ? true : rowChecked, disabled: locked,
      onChange: onRowChange }),
    h('div', { className: 'skm-skill-main' },
      h('div', { className: 'skm-skill-name' },
        h('span', null, slug),
        badges),
      sourceLine,
      conflictView,
      depsView))
}


export default {
  inject: ['slots', 'remote'],
  async apply(ctx) {
    // $mount 是异步的:它把 descriptors 注册进 typert.remotes 并安装
    // remote.skillMover 命名空间服务。不等它的话命名空间还不存在。
    //
    // 必须用 ctx.get('remote.skillMover') 读取,不能用
    // ctx.remote.skillMover:后者走 fiber 链解析,而命名空间服务由
    // api-gateway client 的上下文提供,我们是旁支 entry,解析不到,
    // 会抛 "cannot get property "remote.skillMover" without inject",
    // 导致整个 client boot 失败(Desktop 直接打不开)。
    await ctx.remote.$mount(SKILL_MOVER_REMOTE);
    const remote = ctx.get('remote.skillMover');
    const api = {
      scan: async (args) => unwrap(await remote.scan(args || {})),
      migrate: async (args) => unwrap(await remote.migrate(args || {})),
      remove: async (args) => unwrap(await remote.uninstall(args || {})),
    };
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="dsh-skill-mover"]') === null) {
      const tag = document.createElement('style');
      tag.dataset.plugin = 'dsh-skill-mover';
      tag.dataset.pluginCss = 'dsh-skill-mover';
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }
    ctx.slots.inject('settings.section', () => ctx.slots.register(
      { name: 'settings.section', id: 'skill-mover', order: 50, label: () => 'Skill 迁移' },
      () => createElement(SkillMoverPage, { api }),
    ));
  },
};
