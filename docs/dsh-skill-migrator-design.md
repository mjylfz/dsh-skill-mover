# DSH Skill 迁移插件 — 设计文档

> 配套调研: `agent-skills-migration-research.md`(9 工具基线)+ 本次补充(见 §1)。
> 目标: 一个 DSH 动态插件,一键把本机其他 Agent 的 skills 迁入 `~/.dsh/skills/`,让用户无缝衔接。

---

## 0. 结论先行(说人话版)

- **迁移的本质是"目录搬运 + 一份溯源 meta"**,不是格式转换。所有主流 agent 都用 `SKILL.md + frontmatter` 开放格式。
- **一个重大发现**:DSH 自己就扫描 `~/.agents/skills` 和项目 `.agents/skills`(rank 200/500)。所以 `~/.agents/skills` 里的技能 DSH **天然可用,不需要迁移**。插件真正要搬的是非共享层:`~/.cursor/skills`、`~/.codex/skills`(旧路径)、`~/.hermes/skills`、`~/.qoderwork/skills` 等。共享层的技能在 UI 里应显示"DSH 已可直接使用",不用重复安装。
- **复制 vs 链接**:复制 = 独立(源删了也还在);链接 = 跟随同步(省空间)。默认复制,提供"链接"选项。
- **冲突 = 同名分组,每组默认选一个最优来源**,用户可以展开改选。绝不自动覆盖已安装的 DSH 技能。
- **"安装脚本"不自动执行**(安全):只做**依赖声明检测**(`requirements.txt` / `package.json` / `install.sh` / `setup.py`),在结果页提示用户。
- **Windows 验证**:平台分支用"命令模板表"隔离,扫描逻辑与平台无关;macOS 上可用"测试模式"伪造 Windows 布局验证路径逻辑,Windows 实机验证留给用户/CI 的 dry-run。

---

## 1. 调研补充(相对原调研文件的增量)

原调研覆盖 9 个工具,经本机实测 + 官方文档补充 **3 个遗漏的主流平台 + 1 个关键目标侧事实**:

### 1.1 Cursor(本机实测 8 个技能,原调研遗漏)

官方文档(cursor.com/help/customization/skills.md)确认:

| 作用域 | 路径 |
|---|---|
| 全局 | `~/.cursor/skills/<name>/SKILL.md`(递归扫描子目录,分类目录可嵌套) |
| 项目 | `.cursor/skills/<name>/SKILL.md`(monorepo 内嵌套项目自动按 `paths` 限定作用域) |
| 兼容层 | `.agents/skills`、`~/.agents/skills`、`.claude/skills`、`~/.claude/skills`、`.codex/skills`、`~/.codex/skills` |

- 技能名 = 含 `SKILL.md` 的**那层目录名**(不是分类目录名)。
- frontmatter 支持 `paths` 作用域;`/create-skill` 内置技能可自动生成。

### 1.2 Gemini CLI(官方文档 geminicli.com/docs/cli/skills)

- 用户级:`~/.gemini/skills/` 或 `~/.agents/skills/` 别名。
- 工作区级:`.gemini/skills/` 或 `.agents/skills/` 别名。
- 优先级:built-in < extension < user < workspace;同层内 `.agents/skills` 别名**优先于** `.gemini/skills`。
- ⚠️ **重要**:Gemini CLI 将于 **2026-06-18 被 Antigravity CLI 取代**(官方公告)。迁移这类用户时注意品牌迁移背景。

### 1.3 GitHub Copilot CLI(官方文档 docs.github.com/.../add-skills)

- 个人级:`~/.copilot/skills/` 或 `~/.agents/skills/`。
- 项目级:`.github/skills/`、`.claude/skills/` 或 `.agents/skills/`。
- 支持 `gh skill` 命令安装/发布。
- 本机 `~/.copilot` 只有 config/logs,无技能 → 平台定义照写,扫描自然为空。

### 1.4 DSH 目标侧的关键事实(决定整个架构)

源码 `@deepseek-ai/dsh-skill-filesystem` 确认:

| Rank | 来源 | 路径 |
|---|---|---|
| 100 | project-dsh | `<项目根>/.dsh/skills` |
| 200 | project-agents | `<项目根>/.agents/skills` |
| 300 | custom | `customSkillDirs`(配置项) |
| 400 | user-dsh | `<dshHome>/skills`(`$DSH_HOME` 或 `~/.dsh`) |
| 500 | user-agents | `<agentsHome>/skills`(`~/.agents`) |

- **发现深度只有一层**:`<root>/<name>/SKILL.md` 或平铺 `<root>/<name>.md`。**Hermes 的嵌套分类结构必须展平**才能被 DSH 发现。
- `_skillhub_meta.json` **不是必需文件**——提供方只解析 `SKILL.md` 的 frontmatter(`name`/`description` 必填,`whenToUse`/`metadata` 等可选;name 必须 kebab-case)。meta 是 marketplace 安装器写的补充信息,迁移时生成一份纯做溯源。
- 安装后 **watcher 自动发现新技能,无需重启 DSH**。
- 用户 DSH 根会跳过 `.system` 子目录。
- `$DSH_HOME` / `$DSH_AGENTS_HOME` 环境变量可覆盖默认位置(插件通过 shell 的 `DSH_*` 注入变量读取)。

### 1.5 完整源注册表(插件内置,合并原调研 + 补充)

| id | 平台 | 用户级根(macOS/Linux) | Windows | 嵌套 | 备注 |
|---|---|---|---|---|---|
| agents | 共享层 | `~/.agents/skills` | `%USERPROFILE%\.agents\skills` | 否 | DSH 天然发现,**默认标记"已可用"** |
| cursor | Cursor | `~/.cursor/skills` | `%USERPROFILE%\.cursor\skills` | 是(递归) | 兼容 claude/codex 目录,不重复扫 |
| claude | Claude Code | `~/.claude/skills` | `%USERPROFILE%\.claude\skills` | 否 | `CLAUDE_CONFIG_DIR` 可改根 |
| codex | Codex | `~/.codex/skills`(deprecated)+`~/.agents/skills`(主) | 同左 | 否 | 只扫旧路径,主路径已归 agents |
| opencode | OpenCode | `~/.config/opencode/skills` | `%USERPROFILE%\.config\opencode\skills` | 否 | 不是 %APPDATA% |
| hermes | Hermes | `~/.hermes/skills` | `%LOCALAPPDATA%\hermes\skills` | 是(展平) | 跳过 `.hub/`、`.bundled_manifest` 等系统文件 |
| openclaw | OpenClaw | `~/.openclaw/skills` | `%USERPROFILE%\.openclaw\skills` | 否 | 插件技能在 `~/.openclaw/plugin-skills` |
| gemini | Gemini CLI | `~/.gemini/skills` | `%USERPROFILE%\.gemini\skills` | 否 | |
| copilot | Copilot CLI | `~/.copilot/skills` | `%USERPROFILE%\.copilot\skills` | 否 | |
| codebuddy | CodeBuddy | `~/.codebuddy/skills` | `%USERPROFILE%\.codebuddy\skills` | 否 | |
| qwen | Qwen Code | `~/.qwen/skills` | `%USERPROFILE%\.qwen\skills` | 否 | 兼容 `.agents` 已归 agents |
| kimi | Kimi Code CLI | `~/.kimi/skills`(组1)→`~/.claude/skills`→`~/.codex/skills`;`~/.config/agents/skills`(组2) | 同左 | 否 | 组2 与 agents 重叠,只扫 `~/.kimi/skills` 本体 |
| qoder | Qoder CLI | `~/.qoder/skills` | `%USERPROFILE%\.qoder\skills` | 否 | |
| qodercn | Qoder CN CLI | `~/.qoder-cn/skills` | `%USERPROFILE%\.qoder-cn\skills` | 否 | |
| qoderwork | QoderWork | `~/.qoderwork/skills` | `%USERPROFILE%\.qoderwork\skills` | 否 | 有 `.skill-metadata.yaml` |

> 设计决策: 平台定义 = 声明式数据(一行一个),新增平台只加一行,不需要改扫描/迁移逻辑。这是"可扩展性"的核心。

---

## 2. 插件架构

```
Plugin: skill-migrator(动态 Cordis 插件,Host + Client 两半)
│
├── HOST(扫描/规划/执行,全部无外部依赖)
│   ├── 平台探测层    shell 探测 $HOME + 平台类型(缓存)
│   ├── 源注册表      SOURCES: 声明式平台定义(id/name/roots/nested/skip)
│   ├── 扫描器        枚举根目录 → 读 frontmatter → 候选技能列表
│   │                  ├── 软链接解析(跟随到真实目录)
│   │                  ├── Hermes 嵌套展平
│   │                  ├── 依赖声明检测(requirements.txt 等)
│   │                  └── 跳过系统项(.system/.hub/.DS_Store/.bundled_manifest/_org)
│   ├── 规划器        按 slug 分组 → 冲突检测 → 与已安装对比 → 推荐默认
│   ├── 执行器        复制/链接 → 写 _skillhub_meta.json → 写迁移日志
│   └── RPC            harness.handle('scan'|'migrate'|'remove'|'detect')
│
└── CLIENT(设置页 UI)
    ├── settings.section 注册「Skill 迁移」页(id: skill-migrator)
    ├── 扫描结果视图:按平台分组,默认全选,冲突行展开单选
    ├── 迁移模式:复制(默认)/链接
    └── 进度 + 结果报告(成功/跳过/失败/依赖提示)
```

### 2.1 数据流(状态机)

```
打开设置页 → host.call('scan')
  → 平台探测(一次,缓存) → 逐源扫描 → 规划分组
  → 返回纯 JSON: { platform, home, targetRoot, sources[], groups[], installed{} }
UI 渲染(默认全选;冲突组选推荐;已安装不勾选)
用户点「迁移 N 个技能」→ host.call('migrate', { selections, mode })
  → 逐项执行(串行)→ 返回 [{ slug, status: ok|skip|fail, error?, deps[] }]
UI 展示结果;提供「移除已迁移」「重新扫描」
```

### 2.2 Host 实现要点(纯 JS,无 import/require)

| 问题 | 方案 |
|---|---|
| 没有 `process`/`os`,拿不到 $HOME/平台 | shell 探测:`echo "$HOME"; uname -s`(Windows pwsh 下 uname 失败 → 第二行缺失 → 判 win32);一次探测缓存 |
| 没有 node:fs | `ctx.fs` 服务(resolve/stat/lstat/readText/listDir/writeText)做**扫描**;文件**复制**用 `ctx.shell`(`cp -RL` / Windows `robocopy`),因为 fs 服务没有复制/写二进制 API |
| 没有 YAML 库 | 手写最小 frontmatter 解析器(只取标量键:name/description/version/license;容忍引号/注释/多行;失败则用目录名兜底并标记警告) |
| slug 规范化 | 手写 kebab-case(小写、空格→`-`、去非法字符、去尾部 `-`) |
| 软链接源 | `fs.lstat` 检测 isSymbolicLink → `fs.resolve`(跟随 realpath)→ 复制时 `cp -RL` 保证复制真实内容 |
| Windows 命令 | 命令模板表:`{ copy: ['cp -RL <src>/. <dst>/', 'robocopy <src> <dst> /E /COPY:DAT /R:1 /W:1'], link: ['ln -s', 'junction'] }`,按平台取用 |
| 已安装检测 | 扫 `~/.dsh/skills` 目录本身(不依赖 `skills.list()` 的 scope 语义) |
| 并发/取消 | 迁移串行执行,每项独立 try/catch,单项失败不中断整体 |

### 2.3 冲突与去重策略(用户问题的核心)

1. **slug 分组**:frontmatter `name`(规范化后)优先,缺失用目录名。同一 slug 的所有候选归一组。
2. **组内默认**:按源优先级排序(声明在源注册表里:agents > cursor > claude > codex > gemini > openclaw > hermes > 其他),默认选中最高优先级**一个**;用户可展开切换任意一个。
3. **已安装冲突**:目标 `~/.dsh/skills/<slug>` 已存在 → 组标记"已安装",**默认不勾选**(防覆盖);提供全局开关「覆盖已安装(更新版本)」。
4. **多版本同源**:同源内多个同名(如 Hermes 嵌套 + 平铺)在组内并列,标记版本号(frontmatter `version` 或 meta)。
5. **软链接去重**:本机大量目录是软链接 → `~/.agents/skills`。扫描时 `lstat` 识别,若解析后的真实路径已属于 agents 源,则标记"与共享层重复",默认跳过,避免重复搬运。
6. **项目级技能**:v1 只扫用户级(项目级依赖具体 repo,迁到全局语义不对)。架构预留 `scope: project` 字段,后续可加"指定项目扫描"。

### 2.4 安装脚本/依赖识别(用户问题:"迁移后怎么识别并执行安装脚本")

**明确决策:迁移后不自动执行任何脚本**(安全:技能来源不总是可信,自动执行 = 任意代码执行)。

改为"识别 + 提示":
- 扫描时检测技能目录内的常见依赖声明:`requirements.txt`、`package.json`、`install.sh`/`setup.sh`、`setup.py`、`pyproject.toml`、`Makefile`。
- 检测结果作为 `deps[]` 附在候选上,结果页展示「⚠ 含依赖声明:requirements.txt(python),需自行安装」。
- 顺带读取技能自带的 `SKILL.md` 正文头部是否有 `## Installation` 章节,有则提示用户参考。
- 迁移后 DSH 的 `dsh-tool-skill` 加载器只注入指令文本和资源路径,不会执行任何东西——执行与否完全由模型按 SKILL.md 指示决定,和原 agent 行为一致。

### 2.5 迁移日志与回滚

- 每个迁移目录写 `_skillhub_meta.json`:`{ name, slug, version, installedAt, source: 'migrated:<platformId>', iconSource: slug, preinstalledTemplate: false }`。
- 追加日志 `~/.dsh/skills/.migrator-log.json`:`[{ slug, platform, srcPath, mode, installedAt }]`(上限 500 条)。
- UI 提供「移除已迁移」:按日志删除对应目录(只删 source 以 `migrated:` 开头的,绝不碰 marketplace 装的)。

### 2.6 Client UI 设计(设置页,settings.section)

**入口**:设置 → 左侧导航新增「Skill 迁移」(order 50)。

**布局**(自上而下):

1. **头部**:标题 + 一句话说明 + 目标目录(`~/.dsh/skills`,只读展示)。
2. **平台分组列表**(核心):
   - 每个平台一个卡片:平台图标 + 名称 + 技能数 + 组头 checkbox(整组全选/全不选,**默认全选**)。
   - 组内技能行:checkbox + 技能名 + description 截断(2 行) + 徽标:
     - `已在 DSH`(灰,默认不勾选)
     - `同名 N 源`(黄,点击展开来源单选)
     - `软链接`(蓝)/ `依赖声明`(橙,悬停显示文件列表)
   - 冲突组展开时:来源 radio 列表(平台名 + 版本 + 路径),默认选中推荐项。
   - 共享层(agents)特殊呈现:整个组标记「DSH 已原生支持,无需迁移」,技能行 checkbox 禁用。
3. **底部操作条**(sticky):
   - 模式选择:复制到 DSH(默认)/ 创建链接(跟随同步)。
   - 「迁移 N 个技能」主按钮(N = 当前勾选数,0 时禁用)。
   - 辅助:「重新扫描」「展开全部冲突」。
4. **结果视图**(迁移完成后替换列表):成功/跳过/失败分组,每项可展开看错误详情;失败项一键重试;依赖提示横幅;「完成」回到列表。

**交互原则**:
- 扫描中显示骨架屏 + 平台逐个出现的流式效果(数据一次返回,前端渐进渲染)。
- 所有选择状态前端本地维护,`migrate` 时才提交;刷新页面不丢?— 动态插件无持久化,刷新后重新扫描,勾选丢失可接受(设置页本来就短命)。若需跨刷新保留,可写 `~/.dsh/skills/.migrator-state.json`,v1 不做(动态插件原则:不引入持久化)。
- 文案全部中文,术语括号注英文。

### 2.7 边界与安全

- **只读源**:任何模式都不修改源目录。
- **覆盖保护**:默认跳过已存在;覆盖需显式开关;迁移前对将覆盖项二次确认(结果内联确认,不用弹窗)。
- **链接模式边界**:链接指向的源被删 → DSH 侧技能失效,结果页提示「链接模式依赖源目录存在」。
- **大目录**:迁移前 stat 计算大小,>50MB 的技能行显示大小,结果页报告耗时。
- **错误容忍**:权限拒绝、源被占用、路径含空格(命令一律双引号包裹)等逐项隔离。
- **不迁移系统技能**:跳过 `.system`、`.hub`、`_org`、`.bundled_manifest`、`.DS_Store`、`node_modules` 等。

---

## 3. Windows 验证策略(用户在 macOS,怎么验证 Windows?)

1. **平台差异点收敛到最小面**:只有两处——(a) home/平台探测命令;(b) 复制/链接命令模板。扫描、frontmatter、分组、冲突、UI 全部平台无关。
2. **macOS 测试模式**:`scan` RPC 接受 `rootsOverride`,可在临时目录伪造 Windows 布局(`.claude/skills`、`.cursor/skills`、嵌套 hermes 等),验证扫描/展平/冲突逻辑;命令模板用参数注入,Windows 模板以**字面量单测**覆盖(在文档里给出 robocopy/junction 命令样例)。
3. **dry-run**:`migrate` 带 `dryRun: true` 只生成命令不执行——Windows 用户/CI 先跑 dry-run 验证扫描结果,再真迁移。
4. **实机验证清单**(交给 Windows 用户):
   - 装 DSH → 装插件 → 打开设置 → Skill 迁移页 → 扫描。期望:存在目录的平台显示 OK,技能按平台分组列出。
   - 造 2-3 个测试技能(手写 `SKILL.md` 放 `%USERPROFILE%\.cursor\skills\test-a\`)→ 扫描出现 → 迁移(copy 模式)→ 检查 `%USERPROFILE%\.dsh\skills\test-a\SKILL.md` + `_skillhub_meta.json` → 新会话 `/test-a` 可见。
   - link 模式:`New-Item -ItemType Junction`(junction 不需要管理员权限,与 symlink 不同)→ 验证源目录未被写入 `_skillhub_meta.json`(本次修复的核心回归点)。
   - 重点路径:`%LOCALAPPDATA%\hermes\skills`(Hermes 特例)、`%USERPROFILE%\.config\opencode`(OpenCode 不是 %APPDATA%)、含空格的用户名路径(命令全部双引号包裹)。
   - 探测命令在 pwsh 下的行为:`echo "$HOME"; uname -s 2>/dev/null || true` → 只有一行输出 → 判 win32;若 pwsh 版本不支持 `||`(PowerShell 5.1 不支持,DSH 用 pwsh 7+ 可支持),备选方案是把探测命令按平台分支。
5. **已知 Windows 边界**(代码已处理,实机待验证):
   - `robocopy` 退出码 0-7 为成功,>=8 为失败(命令已显式处理 `$LASTEXITCODE`)。
   - Junction 在 DSH 的 watcher(followSymlinks=true)下的发现行为与真实目录一致(官方实现支持)。
   - `$DSH_HOME` 在 pwsh 中的探测语法与 bash 不同(代码 try/catch 回退默认路径)。

## 4. macOS 实测验证报告(2026-08-20,插件开发期间)

| 项 | 结果 |
|---|---|
| 15 个源目录枚举/存在性 | ✅ 全部正确(与 ls 实测一致) |
| 技能发现 | ✅ agents 4、cursor 8、codex 19、hermes 95(嵌套展平)、qoderwork 9,共 123 组 |
| 冲突分组 | ✅ 10 组同名冲突:baoyu-cover-image(agents,cursor,codex)、find-skills(cursor,hermes,qoderwork)、hermes 内部同名 humanizer/obsidian 等 |
| 软链接去重 | ✅ claude/openclaw 全为软链接→agents,按 realpath 自动去重归零 |
| copy 迁移 | ✅ 复制 + `_skillhub_meta.json`(source: migrated:cursor)+ 日志 |
| 覆盖保护 | ✅ 已安装(marketplace)默认 skip;本插件迁移项可重装(更新语义) |
| link 迁移 | ✅ 符号链接正确;修复后不再向源目录写 meta |
| frontmatter 规范化 | ✅ playwright-automation-mcp-scraper 等非 kebab name 自动修复 |
| remove 回滚 | ✅ 删除目录 + 日志完整清理,不碰 marketplace 安装 |
| 扫描耗时 | ✅ 39ms(纯目录枚举 + SKILL.md 读取) |


---

## 4. 已排除/暂缓项(明确不做,防范围膨胀)

| 项 | 理由 |
|---|---|
| 自动执行安装脚本 | 任意代码执行风险,改"识别 + 提示" |
| 迁移项目级技能 | 依赖具体 repo,语义不符;架构已留 scope 扩展点 |
| 跨刷新状态持久化 | 动态插件临时性;设置页短生命周期 |
| 迁移 marketplace/内置技能 | 只处理用户自装技能;`.system` 等跳过 |
| 双向同步(DSH 反向导出) | 范围外,后续可做 |
| 云端形态技能(Qoder Cloud Agents zip) | 无本地目录,不可迁移 |

---

## 5. 验证计划(macOS 实测)

1. 装插件 → 打开设置 → Skill 迁移页 → 扫描。
2. 期望:发现 cursor(8)、claude(2,软链接→agents,去重)、codex(19+)、hermes(30+,嵌套展平)、agents(4,标"已原生支持")、qoderwork(9)、qoderworkcn(9)。
3. 冲突样例:baoyu-cover-image(cursor + agents)、find-skills(cursor + qoderwork)等 → 验证分组与默认选中。
4. 迁移 3-5 个 → 验证 `~/.dsh/skills/<slug>/SKILL.md` + meta + 日志 → 新会话模型可见(或 `ctx.skills.list()` 验证)。
5. 移除已迁移 → 验证回滚只删 migrated 项。
6. 链接模式迁移 1 个 → 验证 ln -s + watcher 发现。

---

## 6. 架构可扩展性总结

- **加平台** = 源注册表加一行(声明式)。
- **加技能形态** = 扫描器加一种 entry 类型(如 `.skill-metadata.yaml` 读取)。
- **加目标** = 执行器加一个迁移模式(如"压缩为 zip 导入")。
- **加策略** = 规划器加一个分组规则。
- 三层(扫描/规划/执行)职责单一,Client 只消费 JSON 契约,不感知平台细节。
