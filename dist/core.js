// DSH Skill Mover — shared core logic (used by the bundle host gateway).
// Extracted from the dynamic-plugin host half so both versions stay in sync.
// Pure logic over DSH services: ctx.get('fs') / ctx.get('shell').
// DSH Skill Migrator — Host half (plain JS, no imports)
// Scans other agents' skill directories, plans conflicts, migrates into DSH skills root.
const SKIP_NAMES = ['.DS_Store', 'node_modules', '__pycache__', '.git', '.svn', '.hg', '.idea', '.vscode', '.system'];
const DEP_FILES = ['requirements.txt', 'package.json', 'install.sh', 'setup.sh', 'setup.py', 'pyproject.toml', 'Makefile', 'Gemfile', 'install.ps1'];
const LOG_FILE = '.migrator-log.json';
const MAX_DEPTH = 5;
const LOG_LIMIT = 500;
// Declarative source registry: add one row to support a new platform.
// Display order = array order; priority = conflict recommendation (lower wins).
const SOURCES = [
    { id: 'agents', name: '共享层 ~/.agents', priority: 1, native: true, nested: false, roots: ['.agents/skills'] },
    { id: 'codex', name: 'Codex', priority: 2, nested: false, roots: ['.codex/skills'] },
    { id: 'claude', name: 'Claude Code', priority: 3, nested: false, roots: ['.claude/skills'] },
    { id: 'cursor', name: 'Cursor', priority: 4, nested: true, roots: ['.cursor/skills'] },
    { id: 'opencode', name: 'OpenCode', priority: 5, nested: false, roots: ['.config/opencode/skills'] },
    { id: 'hermes', name: 'Hermes Agent', priority: 6, nested: true, roots: ['.hermes/skills'], winRoots: ['AppData/Local/hermes/skills'], skipNames: ['.hub', '.bundled_manifest', '_org'] },
    { id: 'openclaw', name: 'OpenClaw', priority: 7, nested: false, roots: ['.openclaw/skills'] },
    { id: 'kimi', name: 'Kimi Code CLI', priority: 8, nested: false, roots: ['.kimi/skills'] },
    { id: 'trae', name: 'Trae', priority: 9, nested: false, roots: ['.trae/skills'] },
    { id: 'traecn', name: 'Trae CN', priority: 10, nested: false, roots: ['.trae-cn/skills'] },
    { id: 'codebuddy', name: 'CodeBuddy', priority: 11, nested: false, roots: ['.codebuddy/skills'] },
    { id: 'qwen', name: 'Qwen Code', priority: 12, nested: false, roots: ['.qwen/skills'] },
    { id: 'qoder', name: 'Qoder CLI', priority: 13, nested: false, roots: ['.qoder/skills'] },
    { id: 'qodercn', name: 'Qoder CN CLI', priority: 14, nested: false, roots: ['.qoder-cn/skills'] },
    { id: 'qoderwork', name: 'QoderWork', priority: 15, nested: false, roots: ['.qoderwork/skills'] },
];
function slugify(name) {
    return String(name == null ? '' : name)
        .trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'unnamed';
}
function sepOf(platform) { return platform === 'win32' ? '\\' : '/'; }
function joinPath(home, rel, platform) {
    const sep = sepOf(platform);
    return home + sep + String(rel).split('/').join(sep);
}
function nativePath(p, platform) { return platform === 'win32' ? String(p).split('/').join('\\') : String(p); }
function basename(p) { const parts = String(p).split(/[\\/]/); return parts[parts.length - 1] || ''; }
function firstLine(text, max) {
    const t = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max) + '…' : t;
}
function errMsg(e) { return e && e.message ? String(e.message) : String(e); }
// ShellRunResult.stdout is an object { text, truncated, spillPath? } in the real
// executor but a plain string in some mocks — normalize both shapes.
function stdoutText(res) {
    const s = res && res.stdout;
    if (s == null)
        return '';
    return typeof s === 'string' ? s : (typeof s.text === 'string' ? s.text : '');
}
// Minimal YAML frontmatter parser: scalar keys only, tolerant of quotes/comments/multiline.
function parseFrontmatter(text) {
    if (typeof text !== 'string')
        return null;
    const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    if (!m)
        return null;
    const lines = m[1].split(/\r?\n/);
    const out = {};
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
        if (!kv) {
            i += 1;
            continue;
        }
        const key = kv[1];
        let value = kv[2];
        if (/^[|>][-+]?$/.test(value)) {
            const parts = [];
            i += 1;
            while (i < lines.length && /^[ \t]/.test(lines[i])) {
                parts.push(lines[i].replace(/^[ \t]+/, ''));
                i += 1;
            }
            out[key] = parts.join(value[0] === '>' ? ' ' : '\n');
            continue;
        }
        value = value.trim();
        if (value.length >= 2 && ((value[0] === '"' && value[value.length - 1] === '"') || (value[0] === "'" && value[value.length - 1] === "'"))) {
            value = value.slice(1, -1);
        }
        if (value === '')
            value = null;
        out[key] = value;
        i += 1;
    }
    return out;
}
function isKebab(name) { return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(name || '')); }
export function createCore(ctx) {
    let envCache = null;
    const getFs = () => ctx.get('fs');
    const getShell = () => ctx.get('shell');
    async function detectEnv() {
        if (envCache)
            return envCache;
        const shell = getShell();
        if (!shell) {
            envCache = { platform: 'unknown', home: null };
            return envCache;
        }
        try {
            const spec = shell.resolve({ command: 'echo "$HOME"; uname -s 2>/dev/null || true', timeoutMs: 8000, stdoutMaxBytes: 8192 });
            const res = await shell.run(spec);
            const lines = stdoutText(res).split('\n').map(l => l.trim()).filter(Boolean);
            const home = lines[0] || null;
            const uname = lines[1] || '';
            const platform = uname.includes('Darwin') ? 'darwin' : uname ? 'linux' : 'win32';
            envCache = { platform, home };
        }
        catch (e) {
            envCache = { platform: 'unknown', home: null };
        }
        return envCache;
    }
    async function runShell(command, timeoutMs) {
        const shell = getShell();
        if (!shell)
            throw new Error('shell 服务不可用');
        const spec = shell.resolve({ command, timeoutMs: timeoutMs || 60000, stdoutMaxBytes: 4 * 1024 * 1024 });
        return await shell.run(spec);
    }
    async function pathExists(fs, path) {
        try {
            const t = await fs.resolve(path);
            const st = await fs.stat(t);
            return !!st;
        }
        catch (e) {
            return false;
        }
    }
    async function readJson(fs, path) {
        try {
            const t = await fs.resolve(path);
            return JSON.parse(await fs.readText(t));
        }
        catch (e) {
            return null;
        }
    }
    async function writeJsonFile(fs, path, obj) {
        const t = await fs.resolve(path);
        await fs.writeText(t, JSON.stringify(obj, null, 2));
    }
    async function targetRootPath(env) {
        if (!env.home)
            return null;
        let root = null;
        try {
            const res = await runShell('echo "${DSH_HOME:-}"', 8000);
            const line = stdoutText(res).trim();
            root = line ? joinPath(line, 'skills', env.platform) : joinPath(env.home, '.dsh/skills', env.platform);
        }
        catch (e) {
            root = joinPath(env.home, '.dsh/skills', env.platform);
        }
        return root;
    }
    async function readLog(fs, targetRoot) {
        if (!targetRoot)
            return [];
        const log = await readJson(fs, joinPath(targetRoot, LOG_FILE, 'posix'));
        return Array.isArray(log) ? log : [];
    }
    // --- scanning ---
    async function readSkill(fs, skillPath, dirPath, env) {
        const sep = sepOf(env.platform);
        const out = {
            path: dirPath, name: basename(dirPath), slug: slugify(basename(dirPath)),
            description: '', version: null, deps: [], warnings: [], needsRename: false,
        };
        try {
            const target = await fs.resolve(skillPath);
            const text = await fs.readText(target);
            const fm = parseFrontmatter(text);
            if (!fm) {
                out.warnings.push('缺少 YAML frontmatter(DSH 无法自动发现)');
                out.needsRename = true;
            }
            else {
                if (fm.name) {
                    out.name = String(fm.name);
                    const slug = slugify(fm.name);
                    if (slug !== String(fm.name).trim()) {
                        out.needsRename = true;
                        out.warnings.push('frontmatter name 非 kebab-case,迁移时将规范化为 ' + slug);
                    }
                    out.slug = slug;
                }
                else {
                    out.warnings.push('frontmatter 缺少 name,将使用目录名');
                    out.needsRename = true;
                }
                if (!fm.description)
                    out.warnings.push('frontmatter 缺少 description(DSH 无法自动发现)');
                out.description = firstLine(fm.description, 140);
                if (fm.version)
                    out.version = String(fm.version);
            }
        }
        catch (e) {
            out.warnings.push('读取 SKILL.md 失败: ' + errMsg(e));
        }
        for (const dep of DEP_FILES) {
            if (await pathExists(fs, dirPath + sep + dep))
                out.deps.push(dep);
        }
        return out;
    }
    async function walkDir(fs, dirPath, depth, source, env, out) {
        if (depth > MAX_DEPTH)
            return;
        let entries;
        try {
            entries = await fs.listDir(await fs.resolve(dirPath));
        }
        catch (e) {
            return;
        }
        const sep = sepOf(env.platform);
        for (const entry of entries) {
            const name = entry.name;
            if (SKIP_NAMES.includes(name) || (source.skipNames || []).includes(name))
                continue;
            const childPath = entry.target.displayPath;
            // Symlinked dirs may surface as non-directory types; probe SKILL.md for
            // every non-flat-file entry instead of trusting entry.type alone.
            if (entry.type === 'file' && name.endsWith('.md') && depth === 0) {
                out.push(await readSkill(fs, childPath, dirPath, env));
                continue;
            }
            const skillPath = childPath + sep + 'SKILL.md';
            if (await pathExists(fs, skillPath)) {
                out.push(await readSkill(fs, skillPath, childPath, env));
            }
            else if (source.nested) {
                await walkDir(fs, childPath, depth + 1, source, env, out);
            }
        }
    }
    async function scanSource(source, env, overrides) {
        const fs = getFs();
        const out = { id: source.id, name: source.name, native: !!source.native, roots: [], skills: [] };
        if (!env.home || env.platform === 'unknown')
            return out;
        const rels = (overrides && overrides[source.id]) || (source.winRoots && env.platform === 'win32' ? source.winRoots : source.roots);
        for (const rel of rels) {
            const rootPath = /^[\\/]|^[A-Za-z]:[\\/]/.test(rel) ? rel : joinPath(env.home, rel, env.platform);
            const rootInfo = { path: rootPath, exists: false };
            out.roots.push(rootInfo);
            let target;
            try {
                target = await fs.resolve(rootPath);
            }
            catch (e) {
                continue;
            }
            let entries;
            try {
                entries = await fs.listDir(target);
            }
            catch (e) {
                continue;
            }
            rootInfo.exists = true;
            const found = [];
            await walkDir(fs, target.displayPath, 0, source, env, found);
            out.skills.push(...found);
        }
        return out;
    }
    // --- planning ---
    function buildGroups(sources, installed, env) {
        const candidates = [];
        for (const src of sources) {
            for (const s of src.skills) {
                candidates.push(Object.assign({}, s, {
                    sourceId: src.id, sourceName: src.name, sourcePriority: src.priority, sourceNative: src.native,
                }));
            }
        }
        // dedupe by real path (fs.resolve already follows symlinks)
        const seen = new Map();
        const unique = [];
        for (const c of candidates) {
            if (seen.has(c.path)) {
                seen.get(c.path).duplicates.push(c.sourceId);
                continue;
            }
            const copy = Object.assign({}, c, { duplicates: [] });
            seen.set(c.path, copy);
            unique.push(copy);
        }
        const map = new Map();
        for (const c of unique) {
            if (!map.has(c.slug))
                map.set(c.slug, []);
            map.get(c.slug).push(c);
        }
        const groups = [];
        for (const entry of map) {
            const slug = entry[0];
            const cands = entry[1].sort((a, b) => a.sourcePriority - b.sourcePriority);
            const first = cands[0];
            const warnings = [];
            const deps = [];
            for (const c of cands) {
                for (const w of c.warnings)
                    if (!warnings.includes(w))
                        warnings.push(w);
                for (const d of c.deps)
                    if (!deps.includes(d))
                        deps.push(d);
            }
            const installedPath = installed.get(slug) || null;
            groups.push({
                slug,
                name: first.name,
                description: first.description || '',
                warnings,
                deps,
                installed: installedPath ? { path: installedPath } : null,
                isNative: first.sourceNative,
                hasConflict: cands.length > 1,
                recommendedIndex: 0,
                candidates: cands.map(c => ({
                    sourceId: c.sourceId, sourceName: c.sourceName, version: c.version,
                    path: c.path, deps: c.deps, duplicates: c.duplicates, needsRename: c.needsRename,
                    warnings: c.warnings, sourceNative: c.sourceNative,
                })),
            });
        }
        groups.sort((a, b) => a.slug.localeCompare(b.slug));
        return groups;
    }
    // --- execution ---
    async function rmPath(env, p) {
        const path = nativePath(p, env.platform);
        const cmd = env.platform === 'win32'
            ? 'Remove-Item -Recurse -Force "' + path + '"'
            : 'rm -rf "' + path + '"';
        await runShell(cmd, 30000);
    }
    async function fixFrontmatterName(fs, skillPath, slug) {
        const t = await fs.resolve(skillPath);
        const text = await fs.readText(t);
        const lines = text.split('\n');
        if (!lines.length || lines[0].trim() !== '---')
            return;
        let fmEnd = -1;
        for (let i = 1; i < lines.length; i += 1) {
            if (lines[i].trim() === '---') {
                fmEnd = i;
                break;
            }
        }
        if (fmEnd < 0)
            return;
        let replaced = false;
        for (let i = 1; i < fmEnd; i += 1) {
            if (/^name\s*:/.test(lines[i])) {
                lines[i] = 'name: ' + slug;
                replaced = true;
                break;
            }
        }
        if (!replaced)
            lines.splice(1, 0, 'name: ' + slug);
        await fs.writeText(t, lines.join('\n'));
    }
    async function runMigrate(payload) {
        const env = await detectEnv();
        const fs = getFs();
        const scan = await runScan();
        const targetRoot = scan.targetRoot;
        const results = [];
        if (!targetRoot)
            return { results: [{ slug: '', status: 'fail', error: '无法确定 DSH skills 根目录' }] };
        const log = await readLog(fs, targetRoot);
        const sep = sepOf(env.platform);
        for (const sel of payload.selections || []) {
            const group = (scan.groups || []).find(g => g.slug === sel.slug);
            const cand = group && group.candidates[typeof sel.sourceIndex === 'number' ? sel.sourceIndex : group.recommendedIndex];
            if (!group || !cand) {
                results.push({ slug: sel.slug, status: 'fail', error: '未找到候选技能' });
                continue;
            }
            if (cand.sourceNative) {
                results.push({ slug: sel.slug, status: 'skip', reason: '共享层技能 DSH 原生可用,无需迁移' });
                continue;
            }
            const slug = sel.slug;
            const dst = joinPath(targetRoot, slug, env.platform);
            const exists = await pathExists(fs, dst);
            if (exists) {
                const dstMeta = await readJson(fs, joinPath(dst, '_skillhub_meta.json', env.platform));
                const ours = dstMeta && String(dstMeta.source || '').startsWith('migrated:');
                if (!payload.overwrite && !ours) {
                    results.push({ slug, status: 'skip', reason: '目标已存在非迁移安装,未覆盖' });
                    continue;
                }
                await rmPath(env, dst);
            }
            const mode = payload.mode === 'link' ? 'link' : 'copy';
            try {
                const src = nativePath(cand.path, env.platform);
                const dest = nativePath(dst, env.platform);
                if (mode === 'copy') {
                    const cmd = env.platform === 'win32'
                        ? 'New-Item -ItemType Directory -Force -Path "' + dest + '" | Out-Null; $r = robocopy "' + src + '" "' + dest + '" /E /COPY:DAT /R:1 /W:1; if ($LASTEXITCODE -ge 8) { exit 1 }'
                        : 'mkdir -p "' + dest + '" && cp -RL "' + src + '/." "' + dest + '/"';
                    await runShell(cmd, 120000);
                }
                else {
                    const cmd = env.platform === 'win32'
                        ? 'New-Item -ItemType Junction -Path "' + dest + '" -Target "' + src + '"'
                        : 'ln -s "' + src + '" "' + dest + '"';
                    await runShell(cmd, 30000);
                }
                if (cand.needsRename && mode === 'copy') {
                    await fixFrontmatterName(fs, joinPath(dst, 'SKILL.md', env.platform), slug);
                }
                const installedAt = Date.now();
                if (mode === 'copy') {
                    await writeJsonFile(fs, joinPath(dst, '_skillhub_meta.json', env.platform), {
                        name: group.name, slug, version: cand.version || '1.0.0', installedAt,
                        source: 'migrated:' + cand.sourceId, iconSource: slug, preinstalledTemplate: false,
                    });
                }
                log.push({ slug, sourceId: cand.sourceId, srcPath: cand.path, mode, installedAt });
                if (log.length > LOG_LIMIT)
                    log.splice(0, log.length - LOG_LIMIT);
                await writeJsonFile(fs, joinPath(targetRoot, LOG_FILE, env.platform), log);
                results.push({ slug, status: 'ok', deps: cand.deps || [], warnings: cand.warnings || [] });
            }
            catch (e) {
                results.push({ slug, status: 'fail', error: errMsg(e) });
            }
        }
        return { results };
    }
    async function runRemove(payload) {
        const env = await detectEnv();
        const fs = getFs();
        const scan = await runScan();
        const targetRoot = scan.targetRoot;
        const results = [];
        if (!targetRoot)
            return { results: [{ slug: '', status: 'fail', error: '无法确定 DSH skills 根目录' }] };
        const log = await readLog(fs, targetRoot);
        const sep = sepOf(env.platform);
        for (const slug of payload.slugs || []) {
            const dst = joinPath(targetRoot, slug, env.platform);
            const logged = log.some(x => x.slug === slug);
            let isOurs = logged;
            if (!isOurs) {
                const meta = await readJson(fs, joinPath(dst, '_skillhub_meta.json', env.platform));
                isOurs = !!(meta && String(meta.source || '').startsWith('migrated:'));
            }
            if (!isOurs) {
                results.push({ slug, status: 'skip', reason: '非迁移安装或不存在' });
                continue;
            }
            try {
                await rmPath(env, dst);
                const next = log.filter(x => x.slug !== slug);
                await writeJsonFile(fs, joinPath(targetRoot, LOG_FILE, env.platform), next);
                results.push({ slug, status: 'ok' });
            }
            catch (e) {
                results.push({ slug, status: 'fail', error: errMsg(e) });
            }
        }
        return { results };
    }
    async function runScan(overrides) {
        const env = await detectEnv();
        const fs = getFs();
        const targetRoot = await targetRootPath(env);
        const sources = [];
        for (const source of SOURCES)
            sources.push(await scanSource(source, env, overrides || {}));
        const installed = new Map();
        if (targetRoot) {
            try {
                const t = await fs.resolve(targetRoot);
                const entries = await fs.listDir(t);
                for (const e of entries)
                    if (e.type === 'directory')
                        installed.set(e.name, e.target.displayPath);
            }
            catch (e) { /* target root may not exist yet */ }
        }
        const groups = buildGroups(sources, installed, env);
        return {
            env: { platform: env.platform, home: env.home },
            targetRoot,
            sources: sources.map(s => ({
                id: s.id, name: s.name, native: s.native,
                roots: s.roots.map(r => ({ path: r.path, exists: r.exists })),
                skillCount: s.skills.length,
                slugs: s.skills.map(k => k.slug),
            })),
            groups,
        };
    }
    return { runScan, runMigrate, runRemove };
}
