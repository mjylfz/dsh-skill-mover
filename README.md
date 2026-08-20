# DSH Skill Migrator（技能迁移插件）

把电脑上其他 Agent 已经装好的技能，一键搬进 DeepSeek Harness。

支持 Cursor / Claude Code / Codex / OpenCode / Hermes / OpenClaw / Kimi / Trae / Trae CN / CodeBuddy / Qwen Code / Qoder / Qoder CN / QoderWork 等 14 个平台的技能目录扫描与迁移，自动识别共享层（`~/.agents/skills`）、处理同名冲突、去重软链接，迁移后 DSH 自动发现并可直接使用。

## 功能特性

- **一键迁移**：扫描本机所有主流 Agent 的技能目录，按平台分组展示，勾选后批量复制到 `~/.dsh/skills/`
- **共享层识别**：`~/.agents/skills` 的技能 DSH 原生可用，自动标记「DSH 原生支持」，不重复迁移
- **冲突处理**：同名技能（多平台都有）合并为一组，默认推荐优先级最高的来源，可展开切换来源，所有平台栏勾选状态全局同步
- **软链接去重**：Claude Code / OpenClaw 等平台的软链接技能自动解析真实路径，避免重复搬运
- **自动规范命名**：frontmatter name 不符合 kebab-case 的自动改写，保证 DSH 可识别
- **完整溯源与回滚**：迁移写入 `_skillhub_meta.json` + 迁移日志，可一键「移除本次迁移」
- **依赖检测**：识别 `requirements.txt` / `package.json` / `install.sh` 等依赖声明并在结果页提示（不自动执行，安全）
- **跨平台**：macOS / Linux / Windows（Windows 用 PowerShell + robocopy / junction，路径规则已按平台分支）

## 支持的 Agent 平台

| 平台 | 技能目录（macOS/Linux） | Windows |
|---|---|---|
| 共享层（DSH 原生） | `~/.agents/skills` | `%USERPROFILE%\.agents\skills` |
| Codex | `~/.codex/skills` | `%USERPROFILE%\.codex\skills` |
| Claude Code | `~/.claude/skills` | `%USERPROFILE%\.claude\skills` |
| Cursor | `~/.cursor/skills` | `%USERPROFILE%\.cursor\skills` |
| OpenCode | `~/.config/opencode/skills` | `%USERPROFILE%\.config\opencode\skills` |
| Hermes Agent | `~/.hermes/skills` | `%LOCALAPPDATA%\hermes\skills` |
| OpenClaw | `~/.openclaw/skills` | `%USERPROFILE%\.openclaw\skills` |
| Kimi Code CLI | `~/.kimi/skills` | `%USERPROFILE%\.kimi\skills` |
| Trae（国际版） | `~/.trae/skills` | `%USERPROFILE%\.trae\skills` |
| Trae CN（国内版） | `~/.trae-cn/skills` | `%USERPROFILE%\.trae-cn\skills` |
| CodeBuddy | `~/.codebuddy/skills` | `%USERPROFILE%\.codebuddy\skills` |
| Qwen Code | `~/.qwen/skills` | `%USERPROFILE%\.qwen\skills` |
| Qoder CLI | `~/.qoder/skills` | `%USERPROFILE%\.qoder\skills` |
| Qoder CN CLI | `~/.qoder-cn/skills` | `%USERPROFILE%\.qoder-cn\skills` |
| QoderWork | `~/.qoderwork/skills` | `%USERPROFILE%\.qoderwork\skills` |

> 路径均经过官方文档或源码核实，详见 [`docs/agent-skills-migration-research.md`](docs/agent-skills-migration-research.md)。

## 安装

本插件是 **DSH 动态 Cordis 插件**（Host + Client 双端），通过 DSH 的会话级插件机制加载：

1. 把本仓库的 [`skill-migrator-host.js`](skill-migrator-host.js) 与 [`skill-migrator-client.js`](skill-migrator-client.js) 两个文件内容提供给你的 DSH 助手（例如直接拖入文件，或粘贴代码）。
2. 告诉助手：**「安装这个 Skill Migrator 插件并运行」**。
3. 批准插件运行后，打开 **设置 → Skill 迁移** 即可使用。

> 动态插件是会话级能力，进程重启后需要重新加载。未来可打包为 `dsh.bundle.patch` 标准 bundle 实现持久安装（见 [安装方式说明](https://github.com/0xsline/awesome-deepseek-harness#install)）。

## 界面预览

![Skill 迁移主界面](assets/screenshot-main.png)

设置 → Skill 迁移：按平台分组展示本机扫描到的技能，勾选后一键迁移。

## 使用

1. 打开 **设置 → Skill 迁移**
2. 页面自动扫描本机各 Agent 的技能目录，按平台分组展示
3. 展开平台卡片查看技能列表，勾选要迁移的技能（同名多来源技能可展开切换来源）
4. 点底部「迁移所选 N 个技能」（固定复制模式：DSH 内是独立副本，原目录删除不受影响）
5. 迁移完成后 DSH 自动发现新技能，**无需重启**；结果页可「移除本次迁移」回滚

### 交互规则

- 共享层技能默认全部勾选（视觉锁定），DSH 原生可用，不参与迁移
- 同名技能组：行勾选 = 「组已勾选」且「组当前来源属于本平台」；点击某平台的行会自动把来源切换到该平台，所有平台栏同步
- 已存在于 DSH 的技能默认不勾选（除非勾选「覆盖已安装」）
- 与共享层重复（软链接指向共享层）的技能默认不勾选

### 关于依赖与「直接可用」

技能 = 指令（`SKILL.md`）+ 资源（`scripts/` 等），不是安装包。迁移后：

- **指令层面**：迁移后 DSH 立即识别并加载，模型可在合适时机自动使用（`modelInvocable: true`）——已实测（用 DSH 官方发现器验证）
- **脚本依赖**：DSH 不会自动执行 `npm install` / `pip install`（安全设计）。若技能的脚本依赖第三方包，模型会在运行时按 SKILL.md 指示自行安装；依赖声明会在迁移结果页提示

## 项目结构

```
dsh-skill-migrator/
├── skill-migrator-host.js      # 插件 Host 半：扫描 / 冲突规划 / 迁移执行 / RPC
├── skill-migrator-client.js    # 插件 Client 半：设置页 UI（settings.section）
├── docs/
│   ├── agent-skills-migration-research.md   # 15 个平台技能目录调研
│   └── dsh-skill-migrator-design.md         # 完整设计文档（架构 / 冲突策略 / Windows 验证）
```

## 开发与测试

插件为纯 JavaScript（无构建步骤），Host 侧无外部依赖（手写 frontmatter 解析器、路径工具），通过 DSH 的 `ctx.fs` / `ctx.shell` 服务工作。

本地回归测试方法：用 mock 的 `fs`/`shell` 服务 + 真实文件系统运行 `runScan` / `runMigrate` / `runRemove`，并用 DSH 官方 `dsh-skill-filesystem` 发现器验证迁移后的技能可被发现、可完整加载（已实测通过）。

## 许可证

[MIT](LICENSE)
