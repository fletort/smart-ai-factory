<!-- AGENTS.md -->

# AGENTS.md — Router for Smart-AI-Factory (self-hosted)

This repo is BOTH the framework source AND its own first user.

## Source of truth (self-hosted instance)

- Edit the LIVE files for any behavior change: `.smart.ai/conf.yml`, `docs/`, `src/`, `roadmap.md`.

## `bootstrap/` = distribution payload, NOT runtime

- `bootstrap/**` is copied to a NEW user's project root at bootstrap.
- It is NOT read or executed by this repo. Only template files are shared automatically to always be
  in sync with officials templates.
- Touch `bootstrap/` ONLY when the task is explicitly about what a new user receives (bootstrap
  defaults, spec skeletons). Never "fix" a runtime bug there.
- Duplicated paths exist on purpose; do not assume they are in sync. If a change affects end users
  too, update both — as a deliberate step.

## Which skill is authoritative?

- Runtime skill sources: `.agents/skills/<name>/SKILL.md` (+ mirrored Continue prompts). They are
  only on skill source. Used locally and also dsitribued with the payload. sss

## Code Quality Workflow

- **Editor:** VS Code (formats Python with Ruff and Markdown/YAML/JSON with Prettier on save).
- **Git Hooks:** Lefthook is configured to lint and format on commit (when enabled).
- **AI Instructions:** Do not waste tokens or time manually formatting code, fixing spaces, or
  adjusting style in your code blocks. The development environment fully handles this. Focus
  exclusively on business logic, performance, edge cases, and robustness.
