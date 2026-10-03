# agent-skills

Personal [Agent Skills](https://code.claude.com/docs/en/skills) collection. Each top-level directory is one skill with a `SKILL.md` entry point and optional `references/`.

## Skills

<!-- skills:start -->
| Skill | Description |
| --- | --- |
| [`mise`](./mise) | mise (mise-en-place) 开发工具版本与项目环境管理器。用于在 mise.toml 中声明工具版本 [tools]、环境变量 [env]、任务 [tasks]、变量 [vars]；管理 backend(安装来源)、mise.lock 锁定文件、shims、bootstrap 机器初始化(系统包/仓库/dotfiles/服务/macOS 默认值)、配置分层与 config environments(mise.<env>.toml)、registry 与插件、CI/IDE/MCP/daemons 集成，以及从 asdf/.tool-versions 迁移。当用户提到 mise、mise.toml、mise.lock、mise use/install/run/exec/upgrade/lock/settings/tasks、asdf 迁移、node/python 多版本切换、统一项目环境变量与任务、跨机器复现工具版本时使用。 |
| [`oink`](./oink) | OINK 是基于 Hugo Extended 的本地优先技术文档主题：组件用 Markdown 原生语法，字体/搜索/图表运行时随主题分发，不依赖 Node.js 与 CDN。用于创建、编写、定制与部署 OINK 文档站、博客、书籍（Book）、发布下载页与 OpenAPI 参考；覆盖 Hugo Module/Starter 安装、front matter 与页面参数、目录树即侧栏、内容与图表组件（提示块/标签页/步骤/卡片/参数表/文件树/公式/Mermaid/PlantUML/Markmap/Draw.io/ECharts/Infographic/画廊/徽章/按键/Asciinema）、品牌与站点配置、多语言/多版本/分类/搜索/命令面板/打印/Agent 输出、giscus 评论、GitHub Pages 与 Cloudflare Pages 部署、版本升级与排错。当用户提到 OINK、oink.pgsty.com、oink-starter、Hugo 文档站/主题、{.steps}/{.cards}/{.fields}、mermaid/echarts 围栏、type book、release_url、swagger/redoc shortcode、Docsy 迁移时使用。 |
<!-- skills:end -->

> The table above is generated from each skill's frontmatter by `node scripts/generate-readme.mjs` and verified in CI. Do not edit it by hand.

## Install

### Skills Manager

```sh
skills-manager-cli skills install imleafz/agent-skills/mise
skills-manager-cli skills deploy mise --agent claude_code   # or codex / cursor / opencode ...
```

### npx skills

```sh
npx skills add imleafz/agent-skills --skill mise
```

### Manual

Copy a skill directory (for example `mise/`) into your agent's skills folder:

- Claude Code: `~/.claude/skills/`
- Codex: `~/.codex/skills/`
- Cursor: `~/.cursor/skills/`
- OpenCode: `~/.config/opencode/skills/`

## Layout

```
<skill-name>/
├── SKILL.md          # frontmatter (name, description, allowed-tools) + overview and routing
└── references/       # detailed topic docs loaded on demand
```

`SKILL.md` frontmatter must contain a `name` matching its directory, plus a `description`:

```yaml
---
name: mise
description: What the skill does and when to use it.
allowed-tools: Read, Bash, Glob, Grep, Edit, Write
---
```

## Development

No dependencies required — the tooling is plain Node.js.

```sh
node scripts/validate-skills.mjs      # check structure, frontmatter, links
node scripts/generate-readme.mjs      # rewrite the skills table
node scripts/generate-readme.mjs --check   # fail if the table is stale
```

### CI

[`.github/workflows/skills.yml`](./.github/workflows/skills.yml) runs on every push and pull request:

- **validate** — `validate-skills.mjs` plus `generate-readme.mjs --check`; a pull request fails if a skill is malformed or the table is stale.
- **generate** — on pushes to `main`, regenerates the table and commits it back as `github-actions[bot]` if it changed.

## Adding a skill

1. `mkdir my-skill && $EDITOR my-skill/SKILL.md`
2. Add frontmatter (`name` = directory name) and content; put long-form docs in `my-skill/references/` and link them from `SKILL.md`.
3. `node scripts/validate-skills.mjs && node scripts/generate-readme.mjs`
4. Commit and push — CI keeps the table in sync.

## License

MIT — see [LICENSE](./LICENSE).
