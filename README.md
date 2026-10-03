# agent-skills

Personal [Agent Skills](https://code.claude.com/docs/en/skills) collection. Each top-level directory is one skill with a `SKILL.md` entry point and optional `references/`.

## Skills

| Skill | Description |
| --- | --- |
| [`mise`](./mise) | mise (mise-en-place) 开发工具版本与项目环境管理器：`mise.toml` 里的工具版本、环境变量、任务、backend、`mise.lock`、shims、bootstrap、配置分层、CI/IDE/MCP 集成、从 asdf 迁移。 |

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

## License

MIT — see [LICENSE](./LICENSE).
