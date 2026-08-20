# 各 Agent 的 Skills 目录调研(供 DSH 迁移插件开发使用)

> 调研日期：2026-08-20
> 目的：开发 DSH 插件，一键把其他 Agent 的 skills 迁移到 DSH（`~/.dsh/skills/`）。
> 方法：本机实际安装版本核实（源码/二进制/配置/目录）+ 官方文档核实（macOS 与 Windows 双平台）。
> 结论状态：9 个工具全部已核实（✅）；子代理的交叉核对报告到达后补充引文链接。

## 补充调研（2026-08-20 晚，插件开发期间）

原调研 9 个工具之外，本机实测 + 官方文档又核实了 **3 个主流平台**，并发现 **1 个改变插件架构的目标侧关键事实**：

### S1. Cursor（本机 8 个技能，原调研遗漏）✅

官方文档（cursor.com/help/customization/skills.md）：

| 作用域 | 路径 |
|---|---|
| 全局 | `~/.cursor/skills/<name>/SKILL.md`（**递归扫描**，分类子目录如 `.cursor/skills/shipping/deploy-staging/` 合法，技能名取含 SKILL.md 的那层目录名） |
| 项目 | `.cursor/skills/`（monorepo 嵌套项目按 `paths` 自动限定作用域） |
| 兼容层 | `.agents/skills`、`~/.agents/skills`、`.claude/skills`、`~/.claude/skills`、`.codex/skills`、`~/.codex/skills` |

- frontmatter 支持 `paths`（glob 列表，限定技能适用文件）。
- 内置 `/create-skill`、`/migrate-to-skills`(v2.4+，把 rules/commands 转技能)。
- 本机现状：`~/.cursor/skills/` 8 个技能（baidu-search、baoyu-cover-image、find-skills、self-improving-agent、travel-planner、vlm-detect、wan2.7-image-skill、yolo-detect）。

### S2. Gemini CLI（官方文档 geminicli.com/docs/cli/skills）✅

- 用户级：`~/.gemini/skills/` 或 `~/.agents/skills/` 别名。
- 工作区级：`.gemini/skills/` 或 `.agents/skills/` 别名。
- 优先级：built-in < extension < user < workspace；同层内 `.agents/skills` 别名 **优先于** `.gemini/skills`。
- 激活需用户确认（consent），激活后才把 SKILL.md 正文 + 目录注入上下文并授予目录读取权。
- ⚠️ **Gemini CLI 将于 2026-06-18 被 Antigravity CLI 取代**（官方公告）——文档/迁移时注意品牌背景。

### S3. GitHub Copilot CLI（官方文档 docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills）✅

- 个人级：`~/.copilot/skills/` 或 `~/.agents/skills/`。
- 项目级：`.github/skills/`、`.claude/skills/` 或 `.agents/skills/`。
- frontmatter：`name`/`description` 必填，`license`/`allowed-tools` 可选；`allowed-tools: shell` 会跳过确认（安全警告）。
- `gh skill` 命令可搜索/安装/更新/发布技能。
- 本机现状：`~/.copilot/` 只有 config/logs，无技能（扫描自然为空）。

### S4. ⭐ 目标侧关键事实：DSH 自身兼容 `~/.agents/skills`（改变架构）

源码 `@deepseek-ai/dsh-skill-filesystem` 确认 DSH 的 skills 发现层：

| Rank | 来源 | 路径 |
|---|---|---|
| 100 | project-dsh | `<项目根>/.dsh/skills` |
| 200 | project-agents | `<项目根>/.agents/skills` |
| 300 | custom | `customSkillDirs`（配置项） |
| 400 | user-dsh | `<dshHome>/skills`（`$DSH_HOME` 或 `~/.dsh`） |
| 500 | user-agents | `<agentsHome>/skills`（`$DSH_AGENTS_HOME` 或 `~/.agents`） |

推论（已落入插件设计）：
1. **`~/.agents/skills` 里的技能 DSH 天然可用，无需迁移**。共享层技能在 UI 中标记"DSH 原生支持"，避免重复安装。
2. DSH **只发现一层**：`<root>/<name>/SKILL.md` 或平铺 `<name>.md`。Hermes 的嵌套分类结构**必须展平**。
3. `_skillhub_meta.json` **非必需**（marketplace 安装器写的溯源信息）；核心是 SKILL.md 的 frontmatter（name/description 必填、kebab-case）。
4. 安装后 watcher 自动发现，**无需重启 DSH**。

### S5. 本机源目录实测补充（2026-08-20 晚）

| 目录 | SKILL.md 数 | 说明 |
|---|---|---|
| `~/.cursor/skills` | 8 | 直接子目录均为技能 |
| `~/.hermes/skills` | 95（递归） | 分类目录嵌套，含 `.hub/`、`.bundled_manifest` 等系统项需跳过 |
| `~/.codex/skills` | 19 | 含 `.system/` 内置技能（跳过） |
| `~/.qoderwork/skills` + `~/.qoderworkcn/skills` | 9+9 | 带 `.skill-metadata.yaml` |
| `~/.agents/skills` | 4 | cloudbase、baoyu-cover-image、baoyu-post-to-wechat/weibo |
| `~/.claude/skills`、`~/.openclaw/skills` | 0（软链接） | 全部链接到 `~/.agents/skills`，扫描时按 realpath 去重 |

### S6. Trae（字节跳动 AI IDE，2026-08-20 子代理调研官方文档确认）✅

| 作用域 | macOS/Linux | Windows |
|---|---|---|
| 全局（国际版） | `~/.trae/skills` | `%userprofile%\.trae\skills` |
| 全局（**国内版 Trae CN**） | `~/.trae-cn/skills` | `%userprofile%\.trae-cn\skills` |
| TraeCode CLI | `~/.traecli/skills` | 同左 |
| 项目级 | `<项目>/.trae/skills/{skill_name}/SKILL.md` | 同左 |

- 支持开放 Agent Skills 标准（SKILL.md）；Skills 正式版 2026-01-28 上线（[官方公告](https://developer.volcengine.com/articles/7599882163568017451)）。
- 兼容 `.agents/skills/`（需在 设置 > 技能与命令 > 导入设置 打开「启用 .agents 技能目录」）；与 `.trae/skills` 重名时 `.trae/skills` 优先。
- 不兼容 `.claude/skills` 自动读取（需手动复制）。
- IDE 桌面版**不支持**环境变量改目录；CLI 支持 `TRAE_HOME`。
- 来源：[国际版文档](https://docs.trae.ai/ide/skills)、[国内版文档](https://docs.trae.cn/ide_skills)、[CLI 文档](https://docs.trae.cn/cli_skills)。


## 通用背景（重要）

1. 几乎所有 Agent 的 skill 都用 **AgentSkills 开放格式**：一个目录放 `SKILL.md`（YAML frontmatter `name`/`description` + 正文），可带 `scripts/`、`references/`、`assets/` 等辅助目录。OpenClaw 官方文档明确声明兼容 [agentskills.io](https://agentskills.io)。
2. 因此"迁移"主要是**目录搬运 + 元数据改写**，格式冲突很小。
3. 你本机已有共享技能仓库 `~/.agents/skills/`，且它是**多个工具的原生识别目录**：
   - OpenClaw 内置 Personal-agent skills = `~/.agents/skills`
   - OpenCode 内置 Global agent-compatible = `~/.agents/skills`
   - Claude Code / Codex / OpenClaw 里现有的技能就是通过软链接指向它
   - 这说明 `~/.agents/skills` 事实上是跨工具的共享层——DSH 迁移插件可以直接把它当源。

---

## 1. Claude Code（Anthropic）✅

官方文档（code.claude.com/docs/en/skills）+ 本机二进制核实。

| 作用域 | 路径（macOS/Linux） | 路径（Windows） |
|---|---|---|
| 个人级 | `~/.claude/skills/<name>/SKILL.md` | `%USERPROFILE%\.claude\skills\<name>\SKILL.md` |
| 项目级 | `<项目>/.claude/skills/<name>/SKILL.md` | `<项目>\.claude\skills\<name>\SKILL.md` |
| 嵌套项目 | 工作目录下任意层级 `.claude/skills/`（以 `子目录名:skill名` 限定） | 同左 |
| 插件级 | `<plugin>/skills/<name>/SKILL.md`，安装于 `~/.claude/plugins/marketplaces/<mp>/<plugin>/` | `%USERPROFILE%\.claude\plugins\...` |
| 团队/企业 | 企业托管管理 | 同左 |

- 环境变量：`CLAUDE_CONFIG_DIR`（改配置根，Windows/Linux 上凭据也放该目录；macOS 凭据在钥匙串）、`CLAUDE_PLUGIN_ROOT`（改插件根）、`CLAUDE_CODE_SYNC_SKILLS`（同步到 `~/.claude/skills/synced/`，v2.1.227 之前直接下载到 `~/.claude/skills/`）。
- 设置项：`skillsPath` / `skillsPaths`（追加额外技能目录，二进制确认）。
- 优先级：企业（managed settings）> 个人 > 项目；插件技能按 `<plugin>:<skill>` 命名空间隔离。
- frontmatter 关键字段：`name`、`description`、`when_to_use`、`allowed-tools`、`disable-model-invocation`、`user-invocable`、`disallowed-tools`、`model`、`effort`、`context: fork`、`hooks`、`paths`、`shell`、`metadata`、`license`、`compatibility`；跨工具打包（Agent Skills 规范）只允许 6 个字段（name/description/license/compatibility/metadata/allowed-tools），多写会报错。
- 软链接：个人/项目技能目录支持符号链接，Claude 跟随并去重。
- 子代理（非 skill）：`.claude/agents/`；记忆：`.claude/agent-memory/`；规则：`.claude/rules/`。
- 本机现状：`~/.claude/skills/` 内为软链接 → `~/.agents/skills/<name>`。

## 2. Codex（OpenAI）✅

本机二进制（v0.148.0）+ config.toml + 官方文档 + 源码（host_roots.rs）核实。

| 作用域 | 路径（macOS/Linux） | 路径（Windows） |
|---|---|---|
| 个人（新主路径） | `~/.agents/skills/`（`$HOME/.agents/skills`） | `%USERPROFILE%\.agents\skills\` |
| 个人（旧，废弃兼容） | `~/.codex/skills/`（源码注释明确 "Deprecated ... kept for backward compatibility"） | `%USERPROFILE%\.codex\skills\` |
| 项目（新主路径） | 从 CWD 向上到 repo 根，每一级 `.agents/skills/` | 同左（`.agents\skills`） |
| 项目（旧） | 项目内 `.codex/skills/` | 同左 |
| 管理员 | `/etc/codex/skills`（Unix） | Windows 无对应 |
| 系统内置 | `~/.codex/skills/.system/`（skill-creator、skill-installer、imagegen、review-agent 等） | 同左 |
| 插件 | `<plugin>/skills/*/SKILL.md` 及插件根 SKILL.md；插件缓存 `~/.codex/plugins/cache/` | 同左 |

- 环境变量：`CODEX_HOME`（默认 `~/.codex`；注意：设置后该路径必须已存在且是目录，否则报错）。
- `config.toml`：`[[skills.config]]`（path/name/enabled，只做启停，按顺序应用）；`[skills]` 下还有 `bundled`（内置总开关）、`include_instructions`、`max_context_tokens`（技能清单 token 预算，默认上下文 2%，上限 10000）。
- 调用方式：提示里 `$技能名` 或 TUI `/skills`；启动时只注入 name/description/路径（渐进式披露）。
- 安装命令：`codex skill install <GitHub 仓库>` → 装进 `$CODEX_HOME/skills`。
- 导入能力：TUI 支持 "Import skills from ..."（含 cursor 等来源）。
- 指令文件：`~/.codex/AGENTS.md`（全局 instructions，不属于 skills）。
- 本机现状：`~/.codex/skills/` 有 20+ 技能（旧路径，仍被兼容扫描），含软链接 → `~/.agents/skills/cloudbase`。

## 3. OpenCode（SST）✅

官方文档（docs.opencode.ai/docs/skills）核实。

**搜索位置（6 处全支持）：**
- 项目级：`.opencode/skills/<name>/SKILL.md`
- 全局：`~/.config/opencode/skills/<name>/SKILL.md`
- 项目级 Claude 兼容：`.claude/skills/<name>/SKILL.md`
- 全局 Claude 兼容：`~/.claude/skills/<name>/SKILL.md`
- 项目级 agents 兼容：`.agents/skills/<name>/SKILL.md`
- 全局 agents 兼容：`~/.agents/skills/<name>/SKILL.md`

- 发现规则：从 cwd 向上走到 git worktree 根，沿途加载上述目录的 `skills/*/SKILL.md`；源码还会扫 `~/.opencode`（家目录）。
- 支持时间线：v1.0.186（2025-12-22）原生 skills；v1.0.208 支持 `.claude/skills`；v1.0.210 支持 `~/.claude/skills`；v1.1.50（2026-02-04）支持 `.agents/skills`。
- frontmatter 只认：`name`（必填）、`description`（必填）、`license`、`compatibility`、`metadata`；name 必须匹配目录名且符合 `^[a-z0-9]+(-[a-z0-9]+)*$`。
- 权限控制：`opencode.json` 的 `permission.skill`（`allow`/`deny`/`ask`）、`agent.<name>.permission.skill`、`agent.<name>.tools.skill: false`。
- `.opencode` 与 `~/.config/opencode` 用复数子目录：`agents/`、`commands/`、`modes/`、`plugins/`、`skills/`、`tools/`、`themes/`。
- Windows：**`%USERPROFILE%\.config\opencode\skills`**（源码用 xdg-basedir，无平台特判，不是 %APPDATA%）；环境变量 `OPENCODE_CONFIG_DIR` 覆盖全局目录；受管设置 Windows `%ProgramData%\opencode`、macOS `/Library/Application Support/opencode/`、Linux `/etc/opencode/`。
- 本机现状：`~/.config/opencode/` 只有 `.gitignore`，无技能。

## 4. Hermes Agent（NousResearch）✅

本机源码核实（git remote = NousResearch/hermes-agent）。注意：**不是**阿里云百炼 Hermes Agent。

| 作用域 | 路径（macOS/Linux） | 路径（Windows） |
|---|---|---|
| 用户全局 | `~/.hermes/skills/`（递归扫描 SKILL.md） | `%LOCALAPPDATA%\hermes\skills\` |
| 内置 | 安装时从仓库 `skills/` 播种；另有 `optional-skills` | 同左 |
| Profile 模式 | `~/.hermes/profiles/<name>/skills/` | `%LOCALAPPDATA%\hermes\profiles\<name>\skills\` |
| 组织共享 | `~/.hermes/skills/_org/<org_id>/`（token 门控） | 同左 |
| 额外目录 | `config.yaml` → `skills.external_dirs: [...]` | 同左 |

- 环境变量：`HERMES_HOME`（默认 `~/.hermes` / Windows `%LOCALAPPDATA%\hermes`）。
- **项目级技能**：`<项目根>/.hermes/skills/` 和 `<项目根>/.agents/skills/`（需先 `hermes skills trust` 信任，信任列表存 `skills.trusted_project_dirs`；项目根 = 向上最近的含 `.git` 的祖先目录）。
- 优先级：project → local（`~/.hermes/skills`）→ external_dirs。
- 技能包：`~/.hermes/skill-bundles/<slug>.yaml`（一个命令批量加载多个技能）。
- Hub 状态：`~/.hermes/skills/.hub/`（lock.json、quarantine、audit.log、taps.json）；`.bundled_manifest` 记录内置技能哈希。
- 禁用/控制：`config.yaml` → `skills.disabled`、`skills.platform_disabled`、`skills.project_discovery`、`skills.write_approval`、`skills.tier1_advisory` 等。
- Skills Hub 来源：official、skills-sh（Vercel）、well-known、url、github（默认含 openai/skills、anthropics/skills、huggingface/skills、NVIDIA/skills）、clawhub、lobehub。
- 本机现状：`~/.hermes/skills/` 30+ 技能（分类目录），**ima-skills 带 `.clawhub/origin.json`（从 OpenClaw 的 ClawHub 装的）**。

## 5. OpenClaw ✅

npm 包自带官方文档（docs/tools/skills.md、skills-config.md）+ 本机配置核实。

**技能根（内置，优先级从高到低）：**
| # | 来源 | 路径 |
|---|---|---|
| 1 | Workspace | `<workspace>/skills` |
| 2 | Project-agent | `<workspace>/.agents/skills` |
| 3 | Personal-agent | `~/.agents/skills`（原生内置！） |
| 4 | Managed/local | `~/.openclaw/skills` |
| 5 | Bundled | 随安装 |
| 6 | 额外目录 | `skills.load.extraDirs`（openclaw.json） |

- 同名冲突：高优先级覆盖低优先级。
- 每个 agent 的可见技能由 `agents.defaults.skills` / `agents.list[].skills` 白名单控制；非空列表是最终集合，不合并。
- `openclaw skills install <slug>` 装进**当前工作区** `skills/`；`--global` 装进 `~/.openclaw/skills`。
- 默认工作区：`~/.openclaw/workspace`（命名 profile 时为 `workspace-<profile>`）。
- 插件通过 `openclaw.plugin.json` 声明 `skills` 目录；插件技能被**符号链接聚合到 `~/.openclaw/plugin-skills/`**（Windows 用 junction）供 agent 发现；插件本体装在 `~/.openclaw/extensions/<name>/`。
- 技能市场：ClawHub（clawhub.ai）；`skills.entries.<key>` 配置 env/API key。
- 环境变量：`OPENCLAW_HOME`、`OPENCLAW_STATE_DIR`（默认 `~/.openclaw`）、`OPENCLAW_CONFIG_PATH`、`OPENCLAW_WORKSPACE_DIR`、`OPENCLAW_PROFILE`。
- Windows：原生支持（`install.ps1`），推荐 WSL2；路径 `%USERPROFILE%\.openclaw\skills`、`%USERPROFILE%\.openclaw\workspace\skills`。
- 改名史：Clawdbot → OpenClaw（发布版已用 `.openclaw`，GitHub main 分支代码仍是旧名，会做旧目录迁移回退）。
- 本机现状：`~/.openclaw/skills/` 软链接 → `~/.agents/skills/`；`~/.openclaw/workspace*/skills/` 每工作区一份；openclaw.json 已配 `agents.list.*.skills`。

## 6. CodeBuddy（腾讯）✅

官方文档（codebuddy.ai/docs/zh/cli/skills）核实。

| 作用域 | 路径（macOS/Linux） | 路径（Windows） |
|---|---|---|
| 用户级 | `~/.codebuddy/skills/<name>/SKILL.md` | `%USERPROFILE%\.codebuddy\skills\...`（**官方安装文档明确给出**） |
| 项目级 | `<项目>/.codebuddy/skills/<name>/SKILL.md` | 同左 |
| 插件级 | 插件自带 skills（/skills 面板锁定） | 同左 |

- frontmatter 支持 `hooks`（需用户显式同意才注册非内置来源的 hooks）、`allowed-tools`、`context: fork`、`agent`、`model`。
- 占位符：`${CODEBUDDY_PLUGIN_ROOT}`、`${CODEBUDDY_SKILL_DIR}`、`${CODEBUDDY_SESSION_ID}`。
- 设置：`~/.codebuddy/settings.json`（USER）、`.codebuddy/settings.json`（PROJECT）；`skillOverrides` 可覆盖。
- `~/.codebuddy/` 完整结构：settings.json、settings.local.json、CODEBUDDY.md、mcp.json、agents/、rules/、skills/、plugins/、projects/、sessions/、plans/、logs/。
- 官方自称"国内首个支持 Skills 模式的编程助手"，兼容 OpenClaw Skills 协议。
- 本机未安装。

## 7. Qwen Code（阿里）✅

官方文档（QwenLM/qwen-code 仓库 docs/users/features/skills.md）核实。

| 作用域 | 路径（macOS/Linux） | 路径（Windows） |
|---|---|---|
| 个人级 | `~/.qwen/skills/<name>/SKILL.md`（**另兼容 `~/.agents/skills/`**） | `%USERPROFILE%\.qwen\skills\...`（源码推断） |
| 项目级 | `<项目>/.qwen/skills/<name>/SKILL.md`（**另兼容 `.agents/skills/`**） | 同左 |
| 自动生成 | `.qwen/skills/auto-skill-*`（frontmatter `source: auto-skill`） | 同左 |
| 扩展 | 扩展的 `skills/` 目录（`qwen-extension.json` 声明） | 同左 |
| 系统级 | — | `C:\ProgramData\qwen-code\settings.json`（官方文档） |

- 源码确认（packages/core/src/config/storage.ts）：`SKILL_PROVIDER_CONFIG_DIRS = ['.qwen', '.agents']`——用户级和项目级都兼容 agents 目录。
- 配置：`~/.qwen/settings.json`（不是 config）；`skills.directories`（数组，追加自定义目录如 `~/.claude/skills`，支持 `~` 展开）、`skills.disabledLevels`/`skills.disabled`/`skills.enabled`。
- 环境变量：`QWEN_HOME`（改全局目录，默认 `~/.qwen`）。
- 内置技能：仓库自带 `.qwen/skills/`（bugfix、codegraph、autofix 等 15+）。
- `/learn` 命令生成项目技能；模型自动调用（model-invoked）。
- 本机未安装（无 `~/.qwen`）。

## 8. Kimi Code CLI（月之暗面）✅

官方文档（moonshotai.github.io/kimi-cli/zh/customization/skills.html）核实。

**用户级（两组互斥，各取第一个存在的目录；两组结果合并）：**
- 品牌组：`~/.kimi/skills/` → `~/.claude/skills/` → `~/.codex/skills/`（按序取第一个存在的）
- 通用组：`~/.config/agents/skills/`（推荐）→ 已存在的品牌目录

**项目级：**
- 品牌组：`.kimi/skills/` → `.claude/skills/` → `.codex/skills/`
- 通用组：`.agents/skills/`

- 配置：`merge_all_available_skills = true/false`（是否合并多组）；`extra_skill_dirs = [...]`（追加目录）。
- CLI 参数：`--skills-dir <dir>`（可重复，指定后**替代**自动发现）。
- 支持扁平 `<dir>/<name>.md` 形式（name 取文件名）；`type: flow` 的 Flow Skill（Mermaid/D2 流程图）。
- 提示词中按作用域分组注入：Project / User / Extra / Built-in。
- 配置：`~/.kimi/config.toml`；`KIMI_SHARE_DIR` 可改 `~/.kimi` 位置，但**不影响 skills 搜索路径**（官方明确）。
- Windows：`%USERPROFILE%\.kimi\skills` 及同组目录（源码 `Path.home()` 推断）。
- 本机未安装（无 `~/.kimi`）。

## 9. Qoder / 通义灵码（阿里）✅

**重要关系（官方定论）：通义灵码 = Qoder CN 系列**。阿里云官方：**"Qoder CN 系列原名'智能编码助手通义灵码'（Lingma），已于 2026-05-20 正式更名"**——不是"Qoder 是通义灵码的终端版"，而是整个产品系列更名：Qoder CN（原 IDE 插件）、Qoder CN CLI（终端）、QoderWork CN、QoderWake CN、Qoder Cloud Agents。写文档时用"通义灵码（现 Qoder CN）"。

**Qoder CN CLI**（help.aliyun.com/zh/lingma/skills-3020747）：
| 作用域 | 路径 |
|---|---|
| 用户级 | `~/.qoder-cn/skills/{name}/SKILL.md` |
| 项目级 | `<项目>/.qoder/skills/{name}/SKILL.md`（CN 版文档：项目覆盖用户级） |

**Qoder CLI（国际版）**（docs.qoder.com/cli/Skills.md）：
| 作用域 | 路径 |
|---|---|
| 用户级 | `~/.qoder/skills/{name}/SKILL.md` |
| 项目级 | `<项目>/.qoder/skills/{name}/SKILL.md`（CLI 里用户级覆盖项目级；IDE 里相反） |

- 三层 settings.json：`~/.qoder/settings.json`（用户）、`.qoder/settings.json`（项目）、`settings.local.json`。
- 环境变量：`QODER_CONFIG_DIR`（改配置目录，默认 `~/.qoder`）。
- 插件机制：`~/.qoder/plugins/`（插件内可含 `skills/` 子目录注册 skill，结构与 `~/.qoder/skills/` 一致）、`commands/`、`agents/`、`hooks/hooks.json`、`output-styles/`、`bin/`、`.mcp.json`。
- 内置 Bundled Skills：loop、remember、run、batch 等。
- 云智能体（Cloud Agents）形态：Skill 打包 zip 上传云端 API，**无本地目录**（不在迁移范围内）。

**QoderWork 桌面版**（docs.qoder.com/zh/qoderwork/skills）：
- 用户级：`~/.qoderwork/skills/{name}/SKILL.md`（CN 版 `~/.qoderworkcn/skills/`）
- 技能市场（Skill 广场）+ find-skill 安装；格式含 `.skill-metadata.yaml`（本机核实）。

- 本机现状：`~/.qoderwork/skills/` 与 `~/.qoderworkcn/skills/` 各有 3 个技能（vm-error-recovery、xlsx、pdf），格式 = `SKILL.md` + `scripts/` + `.skill-metadata.yaml`。

## 10. DSH（目标侧）✅

- skills 目录：`~/.dsh/skills/<slug>/`，内含 `SKILL.md` + 辅助脚本 + `_skillhub_meta.json`（字段：name、slug、version、installedAt、source、iconSource、preinstalledTemplate）。
- 本机实例：`~/.dsh/skills/ima-skills/`（腾讯 ima，从 marketplace 安装）。
- 迁移插件目标：把源 skill 目录复制为 `~/.dsh/skills/<slug>/SKILL.md` 结构，生成 `_skillhub_meta.json`。

---

## 迁移插件设计要点（初步）

1. **源目录识别**（macOS/Windows 双平台都要枚举）：
   - `~/.claude/skills`、`~/.codex/skills`、`~/.config/opencode/skills`、`~/.hermes/skills`、`~/.openclaw/skills`、`~/.agents/skills`、`~/.codebuddy/skills`、`~/.qwen/skills`、`~/.kimi/skills`、`~/.config/agents/skills`、`~/.qoder-cn/skills`、`~/.qoderwork/skills`、`~/.qoder/skills`
   - Windows 对应：`%USERPROFILE%\.claude\skills`、`%USERPROFILE%\.codex\skills`、`%LOCALAPPDATA%\hermes\skills`、`%USERPROFILE%\.agents\skills` 等
2. **格式兼容**：全部以 `SKILL.md` + frontmatter（name/description）为核心，直接搬运即可；注意各家额外元数据（OpenClaw `metadata.openclaw.*`、Qoder `.skill-metadata.yaml`、Codex `[[skills.config]]`、DSH `_skillhub_meta.json`）。
3. **去重/冲突**：同名技能按优先级（workspace > project > user > managed > bundled）或让用户选择。
4. **软链接处理**：你本机大量技能是软链接 → `~/.agents/skills`，迁移时应解析真实路径再复制。

## 已全部核实（✅），子代理报告为交叉核对

本机一手证据 + 官方文档已覆盖全部 9 个工具。补充最新核实：
- **Codex 官方文档+源码**（developers.openai.com/codex/skills + host_roots.rs）：主路径 = `.agents/skills`（CWD→repo 根逐级）+ `$HOME/.agents/skills`；`~/.codex/skills` 已标记 **Deprecated（仅向后兼容）**；项目 `.codex/skills` 仍扫；`[[skills.config]]` 只做启停；`[skills]` 有 `bundled`/`include_instructions`/`max_context_tokens`。
- **OpenCode 源码**：Windows 全局目录 = `%USERPROFILE%\.config\opencode`（xdg-basedir 无平台特判，**不是 %APPDATA%**）；`OPENCODE_CONFIG_DIR` 可覆盖；受管设置 Windows `%ProgramData%\opencode`。
- **Qoder 国际版 CLI**（docs.qoder.com/cli/Skills.md）：用户级 `~/.qoder/skills/`、项目级 `.qoder/skills/`（用户级覆盖项目级，与 CN 版相反）。
- **OpenClaw/Hermes 子代理报告**（已并入上文）：
  - OpenClaw 插件技能符号链接聚合到 `~/.openclaw/plugin-skills/`；env `OPENCLAW_STATE_DIR`/`OPENCLAW_WORKSPACE_DIR`/`OPENCLAW_PROFILE`；改名史 Clawdbot→OpenClaw。
  - Hermes 项目级技能 `<项目根>/.hermes/skills` 和 `<项目根>/.agents/skills` 需 `hermes skills trust`；优先级 project → local → external_dirs；Windows `%LOCALAPPDATA%\hermes\skills`。
- **国产 agent 子代理报告**（已并入上文，三个补充结论）：
  - Qwen Code 源码确认兼容 `.agents` 目录，`skills.directories` 可指向其它工具目录（如 `~/.claude/skills`）；`QWEN_HOME` 可改全局目录。
  - CodeBuddy 是唯一官方文档明确给出 Windows 路径（`%USERPROFILE%\.codebuddy`）的；Qwen/Kimi 的 Windows 路径为源码推断（`Path.home()`），建议 Windows 实测。
  - **"通义灵码"品牌已于 2026-05-20 正式更名 Qoder CN 系列**（IDE 插件、CLI、QoderWork CN 等），官方文档原话确认。

## 本机技能源目录实测清单（2026-08-20）

| 目录 | SKILL.md 数 | 说明 |
|---|---|---|
| `~/.claude/skills` | 0（软链接） | 全部链接到 `~/.agents/skills` |
| `~/.codex/skills` | 19 | 含 `.system/` 内置技能 |
| `~/.hermes/skills` | 13+（更深嵌套更多） | 分类目录结构 |
| `~/.openclaw/skills` | 0（软链接） | 链接到 `~/.agents/skills` |
| `~/.agents/skills` | 4 | 共享层：cloudbase、baoyu-cover-image、baoyu-post-to-wechat/weibo |
| `~/.qoderwork/skills` | 9 | vm-error-recovery、xlsx、pdf 等 |
| `~/.qoderworkcn/skills` | 9 | 同 qoderwork（CN 版） |
| `~/.dsh/skills` | 1 | ima-skills（目标侧） |

## 关键结论（给插件开发）

1. **`.agents/skills` 是事实标准（2026 年确认，6 个工具原生识别）**：Codex（USER+REPO 主路径）、OpenCode（global+project）、OpenClaw（personal-agent `~/.agents/skills`）、Hermes（项目级）、Kimi（通用组 `~/.config/agents/skills` / `.agents/skills`）、Qwen Code（源码 `SKILL_PROVIDER_CONFIG_DIRS=['.qwen','.agents']`）。**迁移插件应优先把 `~/.agents/skills` 当作源目录**。
2. **SKILL.md + frontmatter（name/description）是通用格式**，迁移基本是目录搬运；跨工具字段白名单 6 个：name/description/license/compatibility/metadata/allowed-tools（Claude Code 打包时强制）。
3. 各家额外元数据：Claude Code（无额外）、Codex（`[[skills.config]]` 启停 + `[skills]` 预算）、OpenClaw（`metadata.openclaw.*` + `skills.entries` 白名单 + `agents.list[].skills`）、Hermes（`.bundled_manifest`/`.hub/`/`_meta.json`）、QoderWork（`.skill-metadata.yaml`）、DSH（`_skillhub_meta.json`）。
4. **软链接必须解析**：你本机多个目录是软链接 → `~/.agents/skills`；Claude Code / Codex 官方都支持符号链接技能目录，迁移时要跟随 symlink 复制真实内容，避免迁出的是链接。
5. DSH 目标结构：`~/.dsh/skills/<slug>/SKILL.md` + `_skillhub_meta.json`。
6. Windows 特例：**Hermes 在 `%LOCALAPPDATA%\hermes`**（其余基本是 `%USERPROFILE%\.<tool>`）；**OpenCode 用 `%USERPROFILE%\.config\opencode`（不是 %APPDATA%）**。
