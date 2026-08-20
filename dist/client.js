window.__ModuleLoader__.load({
  id: "dsh-skill-mover",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.js
var index_exports = {};
__export(index_exports, {
  CSS: () => CSS,
  SkillMoverPage: () => SkillMoverPage,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");

// src/client/remote.js
var SKILL_MOVER_REMOTE = {
  package: "dsh-skill-mover",
  descriptors: [
    {
      id: "dsh-skill-mover#skillMover/scan",
      service: "skillMover",
      namespace: "skillMover",
      method: "scan",
      invocation: { kind: "direct" },
      parameters: [{ name: "input", wire: "input", source: "json", codec: { mode: "strict", typeSymbol: "json", schema: { parse: (v) => v } } }],
      result: { mode: "strict", typeSymbol: "json", schema: { parse: (v) => v } }
    },
    {
      id: "dsh-skill-mover#skillMover/migrate",
      service: "skillMover",
      namespace: "skillMover",
      method: "migrate",
      invocation: { kind: "direct" },
      parameters: [{ name: "input", wire: "input", source: "json", codec: { mode: "strict", typeSymbol: "json", schema: { parse: (v) => v } } }],
      result: { mode: "strict", typeSymbol: "json", schema: { parse: (v) => v } }
    },
    {
      id: "dsh-skill-mover#skillMover/remove",
      service: "skillMover",
      namespace: "skillMover",
      method: "remove",
      invocation: { kind: "direct" },
      parameters: [{ name: "input", wire: "input", source: "json", codec: { mode: "strict", typeSymbol: "json", schema: { parse: (v) => v } } }],
      result: { mode: "strict", typeSymbol: "json", schema: { parse: (v) => v } }
    }
  ]
};
function unwrap(result) {
  if (result && result.ok) return result.value;
  const err = result && result.error ? result.error : {};
  throw new Error(`${err.message || "remote call failed"}${err.code ? ` (${err.code})` : ""}`);
}

// src/client/index.js
var CSS = `
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
`;
function textValue(value, fallback = "") {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}
function SkillMoverPage(props) {
  const [phase, setPhase] = (0, import_react.useState)("loading");
  const [scan, setScan] = (0, import_react.useState)(null);
  const [selected, setSelected] = (0, import_react.useState)({});
  const [mode, setMode] = (0, import_react.useState)("copy");
  const [overwrite, setOverwrite] = (0, import_react.useState)(false);
  const [results, setResults] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)(null);
  const [openConflict, setOpenConflict] = (0, import_react.useState)({});
  const [openSources, setOpenSources] = (0, import_react.useState)({});
  (0, import_react.useEffect)(() => {
    doScan();
  }, []);
  async function doScan() {
    setPhase("loading");
    setError(null);
    setResults(null);
    try {
      const res = await props.api.scan({});
      if (!res) {
        setError("\u626B\u63CF\u5931\u8D25");
        setPhase("ready");
        return;
      }
      setScan(res);
      const sel = {};
      for (const g of res.groups || []) {
        const top = g.candidates[g.recommendedIndex] || {};
        sel[g.slug] = { on: !g.isNative && !g.installed && !top.duplicates.length, sourceIndex: g.recommendedIndex };
      }
      setSelected(sel);
      setOpenSources({});
      setPhase("ready");
    } catch (e) {
      setError(String(e && e.message || e));
      setPhase("ready");
    }
  }
  function toggle(slug, on) {
    setSelected((prev) => {
      const next = Object.assign({}, prev);
      const cur = next[slug] || { on: true, sourceIndex: 0 };
      next[slug] = Object.assign({}, cur, { on });
      return next;
    });
  }
  function pickSource(slug, index) {
    setSelected((prev) => {
      const next = Object.assign({}, prev);
      const cur = next[slug] || { on: true, sourceIndex: 0 };
      next[slug] = Object.assign({}, cur, { on: true, sourceIndex: index });
      return next;
    });
  }
  function toggleAll(sourceId, on) {
    const updates = [];
    for (const g of scan && scan.groups || []) {
      const idx = g.candidates.findIndex((c) => c.sourceId === sourceId);
      if (idx < 0) continue;
      updates.push({ slug: g.slug, idx });
    }
    setSelected((prev) => {
      const next = Object.assign({}, prev);
      for (const u of updates) {
        const cur = next[u.slug] || { on: true, sourceIndex: 0 };
        next[u.slug] = Object.assign({}, cur, { on, sourceIndex: on ? u.idx : cur.sourceIndex });
      }
      return next;
    });
  }
  function allCheckedFor(sourceId) {
    let total = 0;
    let on = 0;
    for (const g of scan && scan.groups || []) {
      if (!g.candidates.some((c) => c.sourceId === sourceId)) continue;
      total += 1;
      const cur = selected[g.slug];
      const top = cur && g.candidates[cur.sourceIndex];
      if (cur && cur.on && top && top.sourceId === sourceId) on += 1;
    }
    return { total, on };
  }
  function toggleSource(id, e) {
    if (e) e.stopPropagation();
    setOpenSources((prev) => {
      const next = Object.assign({}, prev);
      next[id] = !next[id];
      return next;
    });
  }
  function displayPath(p, home2) {
    const value = textValue(p);
    const homePath = textValue(home2);
    if (!value) return "";
    if (homePath && value.indexOf(homePath) === 0) return "~" + value.slice(homePath.length);
    return value;
  }
  async function doMigrate() {
    const selections = Object.keys(selected).filter((s) => selected[s] && selected[s].on).filter((s) => {
      const g = groupOf(s);
      return !(g && g.isNative);
    }).map((s) => ({ slug: s, sourceIndex: selected[s].sourceIndex }));
    if (!selections.length) return;
    setPhase("migrating");
    setError(null);
    try {
      const res = await props.api.migrate({ selections, mode: "copy", overwrite });
      if (!res) {
        setError("\u8FC1\u79FB\u5931\u8D25");
        setPhase("ready");
        return;
      }
      setResults(res.results || []);
      setPhase("done");
    } catch (e) {
      setError(String(e && e.message || e));
      setPhase("ready");
    }
  }
  async function doRemove(slugs) {
    setPhase("migrating");
    try {
      const res = await props.api.remove({ slugs });
      if (!res) {
        setError("\u79FB\u9664\u5931\u8D25");
        setPhase("done");
        return;
      }
      setResults((res.results || []).map((r) => Object.assign({}, r, { removed: true })));
      setPhase("done");
    } catch (e) {
      setError(String(e && e.message || e));
      setPhase("done");
    }
  }
  const groupOf = (slug) => (scan && scan.groups || []).find((g) => g.slug === slug);
  const h = import_react.createElement;
  if (phase === "loading") {
    return h(
      "div",
      { className: "skm" },
      h(
        "div",
        { className: "skm-progress" },
        h("span", { className: "skm-spinner" }),
        "\u6B63\u5728\u626B\u63CF\u672C\u673A\u5404 Agent \u7684\u6280\u80FD\u76EE\u5F55\u2026"
      )
    );
  }
  if (phase === "migrating") {
    return h(
      "div",
      { className: "skm" },
      h(
        "div",
        { className: "skm-progress" },
        h("span", { className: "skm-spinner" }),
        "\u6B63\u5728\u8FC1\u79FB,\u8BF7\u7A0D\u5019\u2026"
      )
    );
  }
  if (phase === "done" && results) {
    const ok = results.filter((r) => r.status === "ok");
    const skip = results.filter((r) => r.status === "skip");
    const fail = results.filter((r) => r.status === "fail");
    const depSlugs = ok.filter((r) => (r.deps || []).length);
    return h(
      "div",
      { className: "skm" },
      h(
        "div",
        { className: "skm-hero" },
        h("h2", null, "\u8FC1\u79FB\u5B8C\u6210"),
        h("p", { className: "skm-sub" }, "\u6210\u529F " + ok.length + " \u4E2A,\u8DF3\u8FC7 " + skip.length + " \u4E2A,\u5931\u8D25 " + fail.length + " \u4E2A\u3002\u65B0\u6280\u80FD\u4F1A\u88AB DSH \u81EA\u52A8\u53D1\u73B0,\u65E0\u9700\u91CD\u542F\u3002")
      ),
      error ? h("div", { className: "skm-error" }, error) : null,
      depSlugs.length ? h(
        "div",
        { className: "skm-banner" },
        "\u26A0\uFE0F \u8FD9\u4E9B\u6280\u80FD\u5E26\u6709\u4F9D\u8D56\u58F0\u660E(requirements.txt / package.json \u7B49),DSH \u4E0D\u4F1A\u81EA\u52A8\u5B89\u88C5\u4F9D\u8D56,\u9700\u8981\u65F6\u8BF7\u81EA\u884C\u5B89\u88C5:" + depSlugs.map((r) => r.slug).join("\u3001")
      ) : null,
      h(
        "div",
        { className: "skm-results" },
        results.map((r) => {
          const cls = r.status === "ok" ? "skm-result-ok" : r.status === "skip" ? "skm-result-skip" : "skm-result-fail";
          const text = r.status === "ok" ? "\u2713 " + r.slug + " \u5DF2\u8FC1\u79FB" : r.status === "skip" ? "\u2013 " + r.slug + " \u8DF3\u8FC7:" + (r.reason || "") : "\u2717 " + r.slug + " \u5931\u8D25";
          return h(
            "div",
            { key: r.slug, className: "skm-result-item " + cls },
            h("span", null, text),
            r.error ? h("span", { className: "skm-result-err" }, r.error) : null
          );
        })
      ),
      h(
        "div",
        { className: "skm-foot" },
        h("span", { className: "skm-summary" }, "\u8FC1\u79FB\u4E3A\u590D\u5236\u6A21\u5F0F:DSH \u5185\u662F\u72EC\u7ACB\u526F\u672C,\u539F\u76EE\u5F55\u5220\u9664\u4E5F\u4E0D\u53D7\u5F71\u54CD\u3002"),
        h("span", { className: "skm-spacer" }, null),
        h("button", { className: "skm-btn", onClick: () => doScan() }, "\u91CD\u65B0\u626B\u63CF"),
        h("button", { className: "skm-btn", onClick: () => doRemove(ok.map((r) => r.slug)) }, "\u79FB\u9664\u672C\u6B21\u8FC1\u79FB")
      )
    );
  }
  const countOn = Object.keys(selected).filter((s) => selected[s] && selected[s].on).length;
  const countAll = (scan && scan.groups || []).length;
  const countInstalled = (scan && scan.groups || []).filter((g) => g.installed).length;
  const foundPlatforms = (scan && scan.sources || []).filter((s) => s.skillCount > 0).length;
  const home = scan && scan.env && scan.env.home;
  return h(
    "div",
    { className: "skm" },
    h(
      "div",
      { className: "skm-hero" },
      h("h2", null, "Skill \u8FC1\u79FB"),
      h(
        "p",
        { className: "skm-sub" },
        "\u628A\u7535\u8111\u4E0A\u5176\u4ED6 Agent \u5DF2\u7ECF\u88C5\u597D\u7684\u6280\u80FD,\u4E00\u952E\u642C\u8FDB DeepSeek Harness\u3002",
        h("span", { className: "skm-q", "data-tip": "\u5C06\u5B89\u88C5\u5230: " + displayPath(scan && scan.targetRoot, home) + " (DSH \u7684\u6280\u80FD\u76EE\u5F55)" }, "\u24D8")
      )
    ),
    h(
      "div",
      { className: "skm-bar" },
      h(
        "span",
        null,
        "\u5171\u53D1\u73B0 ",
        h("span", { className: "skm-stat" }, countAll),
        " \u4E2A\u6280\u80FD\u7EC4 \xB7 \u5DF2\u52FE\u9009 ",
        h("span", { className: "skm-stat" }, countOn),
        " \u4E2A \xB7 \u6765\u81EA ",
        h("span", { className: "skm-stat" }, foundPlatforms),
        " \u4E2A\u5E73\u53F0"
      ),
      h("span", { className: "skm-spacer", style: { flex: 1 } }, null),
      h("button", { className: "skm-btn", onClick: () => doScan() }, "\u91CD\u65B0\u626B\u63CF")
    ),
    error ? h("div", { className: "skm-error" }, error) : null,
    (scan && scan.sources || []).map((src) => {
      const rows = (src.slugs || []).filter((slug) => !!groupOf(slug));
      const exists = src.roots.some((r) => r.exists);
      const rootPath = src.roots[0] && src.roots[0].path || "";
      const c = allCheckedFor(src.id);
      const indeterminate = c.on > 0 && c.on < c.total;
      const open = !!openSources[src.id];
      const isNative = !!src.native;
      if (!exists && !rows.length) {
        return h(
          "div",
          { key: src.id, className: "skm-source" },
          h(
            "div",
            { className: "skm-source-head", onClick: () => toggleSource(src.id) },
            h("span", { className: "skm-arrow" }, open ? "\u25BC" : "\u25B6"),
            h("input", {
              type: "checkbox",
              checked: false,
              disabled: true,
              onClick: (e) => e.stopPropagation()
            }),
            h("span", null, textValue(src.name, "\u672A\u77E5\u6765\u6E90")),
            h("span", { className: "skm-count" }, "\u672A\u5B89\u88C5"),
            h("span", { className: "skm-tag skm-tag-missing" }, "\u65E0\u6280\u80FD\u76EE\u5F55"),
            h("span", { className: "skm-spacer", style: { flex: 1 } }, null)
          ),
          open ? h(
            "div",
            { className: "skm-missing" },
            "\u672A\u68C0\u6D4B\u5230\u6280\u80FD\u76EE\u5F55 " + rootPath + " \u3002\u82E5\u5DF2\u5B89\u88C5\u6B64\u5DE5\u5177,\u53EF\u68C0\u67E5\u5176\u914D\u7F6E\u76EE\u5F55\u662F\u5426\u6B63\u786E\u3002"
          ) : null
        );
      }
      return h(
        "div",
        { key: src.id, className: "skm-source" },
        h(
          "div",
          { className: "skm-source-head", onClick: () => toggleSource(src.id) },
          h("span", { className: "skm-arrow" }, open ? "\u25BC" : "\u25B6"),
          h("input", {
            type: "checkbox",
            checked: isNative ? true : c.total > 0 && c.on === c.total,
            disabled: isNative,
            ref: (el) => {
              if (el) el.indeterminate = !isNative && indeterminate;
            },
            onClick: (e) => e.stopPropagation(),
            onChange: (e) => {
              if (!isNative) toggleAll(src.id, e.target.checked);
            }
          }),
          h("span", null, textValue(src.name, "\u672A\u77E5\u6765\u6E90")),
          h("span", { className: "skm-count" }, rows.length + " \u4E2A\u6280\u80FD"),
          isNative ? h("span", { className: "skm-tag skm-tag-native" }, "DSH \u539F\u751F\u652F\u6301") : null,
          !isNative && exists ? h("span", { className: "skm-tag skm-tag-ok" }, "\u5DF2\u68C0\u6D4B") : null,
          isNative ? h("span", { className: "skm-q", "data-tip": "\u5171\u4EAB\u5C42\u7684\u6280\u80FD DSH \u76F4\u63A5\u5C31\u80FD\u7528,\u4E0D\u7528\u8FC1\u79FB\u3002", onClick: (e) => e.stopPropagation() }, "\u24D8") : null
        ),
        open ? h(
          "div",
          null,
          exists ? h("div", { className: "skm-root" }, displayPath(rootPath, home)) : null,
          rows.map((slug) => renderSkillRow(h, slug, groupOf(slug), selected, openConflict, toggle, pickSource, setOpenConflict, isNative, src.id))
        ) : null
      );
    }),
    !countAll ? h(
      "div",
      { className: "skm-empty" },
      h("div", null, "\u6CA1\u6709\u53D1\u73B0\u4EFB\u4F55\u53EF\u8FC1\u79FB\u7684\u6280\u80FD\u3002"),
      h("div", null, "\u6280\u80FD\u901A\u5E38\u653E\u5728 ~/.cursor/skills\u3001~/.codex/skills\u3001~/.hermes/skills \u7B49\u76EE\u5F55\u3002"),
      h("div", null, "\u786E\u8BA4\u67D0\u4E2A\u5DE5\u5177\u5DF2\u7ECF\u5B89\u88C5\u8FC7\u6280\u80FD\u540E,\u518D\u70B9\u300C\u91CD\u65B0\u626B\u63CF\u300D\u3002")
    ) : null,
    h(
      "div",
      { className: "skm-foot" },
      h(
        "label",
        null,
        h("input", { type: "checkbox", checked: overwrite, onChange: (e) => setOverwrite(e.target.checked) }),
        "\u8986\u76D6\u5DF2\u5B89\u88C5"
      ),
      h("span", { className: "skm-spacer" }, null),
      h(
        "button",
        { className: "skm-btn skm-btn-primary", disabled: countOn === 0, onClick: doMigrate },
        "\u8FC1\u79FB\u6240\u9009 " + countOn + " \u4E2A\u6280\u80FD"
      )
    )
  );
}
function renderSkillRow(h, slug, group, selected, openConflict, toggle, pickSource, setOpenConflict, locked, sourceId) {
  if (!group) return null;
  const cur = selected[slug] || { on: true, sourceIndex: group.recommendedIndex };
  const top = group.candidates[cur.sourceIndex] || group.candidates[0];
  const topCand = group.candidates[group.recommendedIndex];
  const isFromOtherSource = top && topCand && top.sourceId !== topCand.sourceId;
  const isThisSource = !!(top && top.sourceId === sourceId);
  const rowChecked = isThisSource && !!cur.on;
  const onRowChange = (e) => {
    if (locked) return;
    if (e.target.checked) {
      const idx = group.candidates.findIndex((c) => c.sourceId === sourceId);
      if (idx >= 0) pickSource(slug, idx);
    } else {
      toggle(slug, false);
    }
  };
  const badges = [];
  if (group.installed) badges.push(h("span", { key: "i", className: "skm-badge" }, "\u5DF2\u5728 DSH"));
  if (group.hasConflict) badges.push(h("span", { key: "c", className: "skm-badge skm-badge-warn" }, "\u540C\u540D " + group.candidates.length + " \u5904\u6765\u6E90"));
  if (top && top.duplicates && top.duplicates.length) badges.push(h("span", { key: "d", className: "skm-badge skm-badge-info" }, "\u4E0E\u5171\u4EAB\u5C42\u91CD\u590D"));
  if (group.deps.length) badges.push(h("span", { key: "p", className: "skm-badge skm-badge-warn" }, "\u542B\u4F9D\u8D56"));
  if (top && top.needsRename) badges.push(h("span", { key: "n", className: "skm-badge skm-badge-info" }, "\u81EA\u52A8\u89C4\u8303\u547D\u540D"));
  const conflictOpen = openConflict[slug];
  const conflictView = group.hasConflict && !locked ? h(
    "div",
    null,
    h(
      "button",
      { className: "skm-switch", onClick: () => setOpenConflict(Object.assign({}, openConflict, { [slug]: !conflictOpen })) },
      conflictOpen ? "\u25B2 \u6536\u8D77" : "\u25BC \u540C\u540D\u591A\u4E2A\u6765\u6E90,\u5F53\u524D\u9009:" + textValue(top && top.sourceName, "\u672A\u77E5\u6765\u6E90") + ",\u70B9\u51FB\u5207\u6362"
    ),
    conflictOpen ? h(
      "div",
      { className: "skm-conflict" },
      group.candidates.map((c, i) => h(
        "label",
        { key: c.sourceId, className: "skm-conflict-row" },
        h("input", { type: "radio", name: "skm-src-" + slug, checked: cur.sourceIndex === i, onChange: () => pickSource(slug, i) }),
        h(
          "span",
          null,
          textValue(c.sourceName, "\u672A\u77E5\u6765\u6E90"),
          i === group.recommendedIndex ? h("span", { className: "skm-recommend" }, " \u63A8\u8350") : null
        ),
        c.version ? h("span", null, "v" + c.version) : null,
        h("span", { className: "skm-path" }, textValue(c.path, ""))
      ))
    ) : null
  ) : null;
  const depsView = top && top.deps && top.deps.length ? h("div", { className: "skm-deps" }, "\u26A0 \u4F9D\u8D56\u58F0\u660E:" + top.deps.join("\u3001") + " \u2014 \u9700\u81EA\u884C\u5B89\u88C5,DSH \u4E0D\u4F1A\u81EA\u52A8\u88C5") : null;
  const sourceLine = isFromOtherSource && top ? h(
    "div",
    { className: "skm-deps", style: { color: "var(--dsw-alias-label-secondary)" } },
    "\u6765\u6E90:" + textValue(top.sourceName, "\u672A\u77E5\u6765\u6E90") + (top.version ? " v" + textValue(top.version) : "")
  ) : null;
  return h(
    "div",
    { key: slug, className: "skm-skill" },
    h("input", {
      type: "checkbox",
      checked: locked ? true : rowChecked,
      disabled: locked,
      onChange: onRowChange
    }),
    h(
      "div",
      { className: "skm-skill-main" },
      h(
        "div",
        { className: "skm-skill-name" },
        h("span", null, slug),
        badges
      ),
      sourceLine,
      conflictView,
      depsView
    )
  );
}
var index_default = {
  inject: ["slots", "remote"],
  async apply(ctx) {
    ctx.remote.$mount(SKILL_MOVER_REMOTE);
    const remote = ctx.remote.skillMover;
    const api = {
      scan: async (args) => unwrap(await remote.scan(args || {})),
      migrate: async (args) => unwrap(await remote.migrate(args || {})),
      remove: async (args) => unwrap(await remote.remove(args || {}))
    };
    if (typeof document !== "undefined" && document.querySelector('style[data-plugin-css="dsh-skill-mover"]') === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = "dsh-skill-mover";
      tag.dataset.pluginCss = "dsh-skill-mover";
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }
    ctx.slots.inject("settings.section", () => ctx.slots.register(
      { name: "settings.section", id: "skill-mover", order: 50, label: () => "Skill \u8FC1\u79FB" },
      () => (0, import_react.createElement)(SkillMoverPage, { api })
    ));
  }
};
return module.exports;
  }
});

