# `.agents/` — coding agent harness

Project-scoped assets for AI coding agents (Grok, and compatible harnesses that scan `.agents/`).

| Path | Purpose |
|------|---------|
| `skills/*/SKILL.md` | Reusable task playbooks (auto-discovered when relevant) |
| `commands/*.md` | Slash-style prompts (filename stem = command name) |

Root project rules: `AGENTS.md`  
Modular rules: `.grok/rules/`  
Human/agent docs: `docs/`

Do not put secrets, `.env` values, or production data here.
