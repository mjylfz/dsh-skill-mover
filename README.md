# DSH Skill Migrator（技能迁移插件）

把电脑上其他 Agent 已经装好的技能，一键搬进 DeepSeek Harness。

支持 Cursor / Claude Code / Codex / OpenCode / Hermes / OpenClaw / Kimi / Trae / Trae CN / CodeBuddy / Qwen Code / Qoder / Qoder CN / QoderWork 等 14 个平台的技能目录扫描与迁移，自动识别共享层（`~/.agents/skills`）、处理同名冲突、去重软链接，迁移后 DSH 自动发现并可直接使用。

## 界面预览

![Skill 迁移主界面](assets/screenshot-main.png)

设置 → Skill 迁移：按平台分组展示本机扫描到的技能，勾选后一键迁移。

## 功能特性

- 🔍 **自动扫描**：打开页面就能看到电脑上所有 Agent 都装了哪些技能，一目了然
- ☑️ **勾选即迁移**：想搬哪个勾哪个，一次可以搬几十个
- 🧩 **同名自动合并**：同一个技能在多个 Agent 里都有时，只装一份，来源随便你选
- 🔗 **不会重复搬运**：指向同一份技能的软链接会自动识别
- ↩️ **随时反悔**：迁移错了可以一键移除，不影响其他已安装的技能
- 📦 **原样复制，原目录不动**：DSH 里是独立副本，原 Agent 照常使用
- 🧹 **自动整理**：不规范的技能名会自动改成 DSH 认识的格式，保证迁移后可用
- 🌍 **三大系统都支持**：macOS / Linux / Windows

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
>
> **Windows 路径说明**：`%USERPROFILE%` 是 Windows 的用户主目录（等价于 `C:\Users\你的用户名`），`\` 是 Windows 的路径分隔符；`%LOCALAPPDATA%` 等价于 `C:\Users\你的用户名\AppData\Local`。

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

## 常见问题

**Q: 迁移后怎么使用这个技能？需要额外操作吗？**

不需要额外操作。迁移后 DSH 会自动识别技能，AI 在遇到相关任务时会自动调用。你也可以直接说，例如「用 baoyu-cover-image 给这篇文章生成封面」。如果技能没有自动触发，明确说一句「请使用 xx 技能」即可。

**Q: 迁移会影响原来的 Agent 吗？**

不会。迁移是复制，不是移动。原目录原样保留，原来的 Agent 照常使用。

**Q: 同一个技能在多个平台都有，会装重复吗？**

不会。同名技能会合并成一组，只迁移一份，来源可以自己选（默认推荐共享层或优先级最高的来源）。

**Q: 迁移后技能找不到或不生效怎么办？**

先看技能是否出现在 `~/.dsh/skills/` 目录下；再确认它的 `SKILL.md` 有规范的 `name`（小写短横线）和 `description`（插件迁移时会自动修正不合规的名字）；最后开一个新会话再试（技能按会话生效）。

**Q: 技能需要安装依赖（pip / npm）吗？**

看技能本身。纯指令型技能直接可用；带脚本依赖的技能，AI 会按技能的说明自动安装，或者按迁移结果页的提示手动安装。插件不会自动执行安装脚本（安全考虑）。

**Q: 怎么撤销迁移？**

迁移结果页点「移除本次迁移」，本次迁移的技能会被删除，原目录不受影响。

**Q: Windows 支持吗？**

支持。路径规则、复制命令（robocopy）和链接方式（junction）都已按 Windows 适配。

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
