# System Architecture & Technical Constitution

## 1. Global Context & Architecture

- **Project Vision**: **Smart-AI-Factory** is an open-source, agnostic AI-DevOps framework designed
  to automate and self-regulate the entire software development lifecycle - from Roadmap to Pull
  Request - while slashing AI API costs. Instead of exhausting monthly commercial credits or using a
  single expensive LLM for every task, it acts as a **centralised Semantic CLI & dynamic routing
  engine**: it guides **Specification Refinement** and **Roadmap Management**, then orchestrates the
  most cost-efficient setup for **Triage**, **Autonomous Development** and **Code Review**. The
  functional presentation is in the [README](../README.md); the features are specified in
  [docs/specs/](./specs/) (index: [INDEX.md](./INDEX.md)).
- **Target Architecture**: a **single shared engine with several front-ends**, decoupling the **User
  Interface (local chat)** from the **Execution Engine (core scripts)**. A single configuration
  matrix (`.smart.ai/conf.yml`) governs the five phases of the engineering loop.

  ```mermaid
  graph TD
      subgraph "Front-ends"
          CHAT["IDE chat skills<br/>/smart-spec, /smart-plan, /smart-triage"]
          TERM["Terminal<br/>smart-ai ..."]
          GHA["GitHub Actions<br/>ai_triage_pipeline.yml, ai_routing_pipeline.yml"]
          MCP["MCP server (future)"]
      end

      subgraph "Phases"
          P0["Phase 0: Spec Refinement<br/>(skill smart-spec)"]
          P1["Phase 1: Roadmap Management<br/>(skill smart-plan)"]
          P2["Phase 2: Triage<br/>(smart-ai CLI)"]
          P3["Phase 3: Autonomous Development<br/>(DevRouter)"]
          P4["Phase 4: Twin-Review & Quality Gates<br/>(ReviewRouter)"]
      end

      subgraph "Shared foundation"
          CFG[".smart.ai/conf.yml"]
          WIKI["Native LLM Wiki<br/>(docs/INDEX.md, src/README.md)"]
          CORE["smart-ai core<br/>(config, LLM layer, interaction, GitHub, workspace)"]
      end

      CHAT --> P0 & P1
      CHAT -->|runs| TERM
      TERM --> P2
      GHA --> P2
      MCP -.-> P2
      P0 --> P1 --> P2 --> P3 --> P4
      P2 --> CORE
      P3 -.-> CORE
      P4 -.-> CORE
      P0 & P1 & P2 --> CFG
      P0 & P2 & P3 --> WIKI
  ```

  - **Phases 0 and 1** are implemented as pure skills (`.agents/skills/`), without Python code.
  - **From Phase 2**, the `smart-ai` Python CLI is the engine. It follows a ports-and-adapters
    design: application services depend only on ports (`LlmClient`, `InteractionChannel`,
    `IssueTracker`, `PullRequestHost`, `VersionControl`, `Workspace`), implemented by adapters
    (LiteLLM, terminal, suspend channel, `gh` and `git` subprocesses, local filesystem). The engine
    is specified in [cli-core.md](./specs/cli-core.md) and
    [triage-engine.md](./specs/triage-engine.md).
  - **Phases 3 and 4** (DevRouter, ReviewRouter) are described at the governance level in the README
    (size tiers XS to XXL, twin reviewers); their detailed specifications are not written yet.
  - **FinOps routing**: every task is routed to a model tier according to its size (XS to XXL) and
    every LLM call is attributed to a model alias, counted and costed. The matrix of tiers, human
    gates and cost profiles is in the [README](../README.md).
  - **Memory model**: a tree-structured Markdown memory layer (the
    [Native LLM Wiki](./specs/native-llm-wiki.md)) lets every phase target files surgically instead
    of crawling the workspace.

- **Deployment & Environment Constraints**:
  - **Local**: Dev Container (`mcr.microsoft.com/devcontainers/python:3-3.14-trixie`) with Node.js,
    Poetry, GitHub CLI (`gh`), Claude Code, `actionlint` 1.7.12 and `shellcheck`; Continue.dev as
    IDE chat (see [vscode.md](./ide/vscode.md)). Multi-key FinOps tracking through separate API keys
    (`.continue/.env`, `.env`).
  - **Cloud**: GitHub Actions in stateless mode (the GitHub issue is the distributed database), with
    the `smart-ai` package pinned from PyPI (`uvx smart-ai==X.Y.Z ...`).
  - **Distribution**: Python package `smart-ai` published on PyPI (`pipx install smart-ai`, or
    `uvx smart-ai`). Only the configuration, templates and skills are copied to the user's project.
  - **Runtime**: Python `>=3.11`.
  - **Providers**: any provider reachable through LiteLLM (OpenRouter, Gemini, DeepSeek, Anthropic),
    declared as aliases in the configuration.

## 2. Technical Stack & Dependencies

| Layer                | Technology/Library                      | Version                 | Specific Guidelines / Constraints                                                                   |
| :------------------- | :-------------------------------------- | :---------------------- | :-------------------------------------------------------------------------------------------------- |
| Language             | Python                                  | `>=3.11` (dev: 3.14)    | Ruff target `py311`. Keep compatibility with the minimum version.                                   |
| Agent skills         | Markdown skills (`.agents/skills/`)     | n/a                     | Phase 0 and 1. Only prompt logic; no business logic that belongs to the CLI.                        |
| CLI                  | Typer + Rich                            | to pin at first release | One file per command group under `cli/`; output rendering only.                                     |
| Config and schemas   | Pydantic v2                             | to pin at first release | One validated model for config, LLM structured outputs, JSON CLI output and MCP tool schemas.       |
| YAML                 | ruamel.yaml                             | to pin at first release | Round-trip parsing keeps the comments of `.smart.ai/conf.yml`.                                      |
| Secrets              | python-dotenv                           | to pin at first release | Secrets only in `.env` (local) or GitHub `secrets` (cloud), never in `conf.yml`.                    |
| LLM access           | LiteLLM                                 | to pin at first release | The only LLM entry point is `LlmClient.complete`; models are referenced by alias only.              |
| Prompt templates     | Jinja2                                  | to pin at first release | Prompts are packaged files under `src/smart_ai/prompts/`, not strings in code.                      |
| Interactive terminal | questionary                             | to pin at first release | Used only by `TerminalChannel`.                                                                     |
| GitHub / VCS         | `gh` CLI and `git` through `subprocess` | n/a                     | Hidden behind ports; bodies via `--body-file`; credentials from `GH_TOKEN` or the local `gh` login. |
| MCP (future)         | `mcp` SDK (FastMCP)                     | optional extra          | `smart-ai[mcp]`; never imported by the CLI path.                                                    |
| Dependency manager   | Poetry (`poetry-core >=2.0`)            | `>=2.0`                 | `package-mode = false` today; moves to a real package with a `src/smart_ai` layout.                 |
| Python lint / format | Ruff                                    | `>=0.16.10`             | `line-length = 88`, rules `E, F, W, I, B, C4, UP, ARG, SIM` (`E501` ignored, formatter handles it). |
| Git hooks            | Lefthook                                | `>=2.1.16`              | Pre-commit auto-fix and `lint-all` check-only groups.                                               |
| Markdown/YAML/JSON   | Prettier + markdownlint-cli2            | `^3.9.6` / `^0.23.2`    | `proseWrap: always`, `printWidth: 100`, single quotes; markdownlint `MD013` at 100 columns.         |
| Workflows lint       | actionlint + zizmor                     | `1.7.12` / `>=1.30.1`   | Every workflow must pass both.                                                                      |
| Spelling             | codespell                               | `^2.4.3`                | Applied to all files (`node_modules` and `package-lock.json` skipped).                              |
| Tests (Python)       | pytest, pytest-mock                     | to pin at first release | LiteLLM `mock_response` for LLM calls; services tested with in-memory fakes of the ports.           |
| Tests (prompts)      | Promptfoo                               | `^0.123.1`              | Multi-turn mocked histories under `tests/skills/`.                                                  |
| CI                   | GitHub Actions                          | n/a                     | Actions pinned by commit SHA, `permissions` minimal, `persist-credentials: false`.                  |

## 3. Repository Directory Structure

Current layout:

```text
.
├── .agents/skills/          # Skills: smart-spec (Phase 0), smart-plan (Phase 1)
├── .continue/               # Continue.dev configs and prompts
├── .devcontainer/           # Dev Container definition
├── .github/                 # Workflows (lint) and helper scripts
├── docs/
│   ├── architecture.md      # This document (main technical document)
│   ├── INDEX.md             # Product Wiki: index of the feature specifications
│   ├── specs/               # One unified specification per feature
│   ├── ide/                 # Visual Studio Code setup guide
│   └── dev/                 # Developer guides (linting, skill test strategy)
├── templates/               # Copied to the user's project
│   ├── .smart.ai/           # conf.yml and specification templates
│   ├── docs/INDEX.md        # Product Wiki bootstrap
│   └── src/                 # Code Wiki bootstrap (README.md, _module_/README.md)
├── tests/skills/            # Promptfoo suites for the skills
├── README.md                # Functional, high-level presentation
├── lefthook.yml, package.json, pyproject.toml, ...
```

Target layout of the `smart-ai` package (see [cli-core.md](./specs/cli-core.md#package-layout)):

```text
src/smart_ai/
├── cli/        # Typer app, one file per command group, output rendering
├── core/
│   ├── config.py       # Pydantic models + loader of .smart.ai/conf.yml
│   ├── llm.py          # LlmClient port + LiteLLM adapter, cost accounting
│   ├── interaction.py  # InteractionChannel port + Terminal / Suspend adapters
│   ├── github.py       # IssueTracker + PullRequestHost ports, gh CLI adapters
│   ├── vcs.py          # VersionControl port (branch, commit, push), git CLI adapter
│   ├── workspace.py    # File access, LLM Wiki traversal, token-budgeted context packing
│   └── errors.py       # Exception hierarchy mapped to exit codes
├── triage/     # roadmap.py, models.py, context.py, engine.py, brainstorm.py, approval.py
├── prompts/    # Packaged prompt templates (Jinja2 files), versioned with the package
└── mcp/        # Future MCP adapter (optional extra)
```

Files expected by the pipeline in a user's project: `.smart.ai/conf.yml`, `roadmap.md` or `roadmap/`
(optionally `roadmap/vX.Y/`), `docs/INDEX.md`, `docs/architecture.md`, `docs/specs/`,
`src/README.md` and one `README.md` per `src/<module>/`, and the `CLAUDE.md` / `AGENTS.md` router.

## 4. Coding Standards & Conventions

### 4.1. Language & Typing

- **Python**: target `>=3.11`, formatted and linted with Ruff (see the stack table). Public
  functions and methods carry type hints, as the CLI (Typer), the ports (`Protocol` classes) and the
  schemas (Pydantic) are type-driven.
- **Schemas**: every structured exchange (configuration, LLM output, JSON CLI output, suspension
  payload, persisted state) is a Pydantic model, versioned with a `schema_version` where it is
  persisted or emitted.
- **Naming Conventions**:
  - Python modules, functions and variables: `snake_case`; classes and Pydantic models: `PascalCase`
    (`TriageResult`, `BrainstormState`); package `smart_ai`.
  - Roadmap identifiers: `[ISSUE-X.Y]` (epic-qualified, stable, never renumbered); a versioned
    roadmap prefixes the tracking value with the version (`v0.2/ISSUE-2.1`).
  - GitHub labels: `brainstorming`, `pending-approval`, `ready-to-dev`, `size:<SIZE>` with `<SIZE>`
    in `XS, S, M, L, XL, XXL`; issue titles are prefixed with `[SIZE]`.
  - Branches: `smart-ai/brainstorm-<id>` (specification PRs), `smart-ai/roadmap-sync-${run_id}`
    (roadmap sync PRs).
  - Documentation files: `kebab-case.md` under `docs/specs/`; specification templates are
    [unified-spec.md](../bootstrap/.smart.ai/templates/unified-spec.md) and
    [main-spec.md](../bootstrap/.smart.ai/templates/main-spec.md).
  - Model aliases (`flash_po`, `claude_sonnet`, ...) are the only model names known by the pipeline
    code.

### 4.2. Code Style & Architecture Patterns

- **Ports and adapters**: services depend only on ports; no service calls `gh`, `git` or a provider
  SDK directly. This keeps every service testable with in-memory fakes and no network.
- **Deterministic plumbing, LLM only where needed**: file parsing, selection, GitHub calls and
  write-backs are plain Python; LLMs are only used for reasoning (triage, brainstorm).
- **Resumable sessions**: every interactive flow is a pure step function of `(state, answer)`
  returning `Done` or `NeedsInput`; the `InteractionChannel` decides whether to prompt, or to
  suspend (exit code 3) with a payload.
- **Surgical writes**: the roadmap parser is line based and rewrites only the matching line
  (`(#N)`); bodies of tracked issues are produced by one renderer shared by creation and updates.
- **Idempotence**: writes are idempotent (tracking-id marker lookup before any creation, idempotent
  labels, `last_processed_comment_id`).
- **Prompts as files**: Jinja2 templates versioned with the package; untrusted text is always
  inserted inside delimited blocks and declared as data in the system prompt.
- **Thin skills**: `.agents/skills/` skills only shell out to `smart-ai ... --json`, except Phases 0
  and 1 which are pure prompt skills.
- **LLM Wiki**: every `src/<module>/` carries its own `README.md` code-wiki entry and is registered
  in `src/README.md`; `CLAUDE.md` / `AGENTS.md` stays under 50 lines; the code index never lists
  individual source files.
- **Exit codes**: errors map to a documented exit code (0 success, 1 unexpected, 2 workspace not
  configured or invalid configuration, 3 human input required, 4 roadmap layout divergence, 5 LLM
  failure, 6 budget limit, 7 GitHub failure) through the exception hierarchy in `core/errors.py`.
- **Markdown**: wrapped at 100 columns (Prettier `proseWrap: always`), checked by markdownlint.

## 5. Security & Performance Baselines

- **Authentication & AuthZ**:
  - Secrets are never stored in `conf.yml`; locally they live in `.env`, in the cloud they come from
    GitHub `secrets` mapped to the same variable names. Logs never include secrets and prompts are
    logged only at debug level.
  - GitHub credentials come from `GH_TOKEN` (CI) or the local `gh auth` session; commits use a
    dedicated bot identity.
  - `issue_comment` events are processed only for authors whose association is `OWNER`, `MEMBER` or
    `COLLABORATOR`. The `pull_request` trigger only acts on `smart-ai/brainstorm-*` branches of this
    repository (never a fork), and the merged PR number must equal `BrainstormState.pending_pr`.
  - Workflows run with least privilege per job and must pass `actionlint` and `zizmor`. Default
    branch protection is never bypassed (`roadmap_writeback: pr` is the default; `direct` is
    reserved for repositories accepting that risk).
- **Input Validation**:
  - Configuration is validated by Pydantic at load time; unknown aliases and missing environment
    variables are reported with the offending key.
  - LLM replies go only through a Pydantic schema (one repair call, then exit code 5).
  - Untrusted text (issue and comment text, roadmap titles) is treated as data in delimited prompt
    blocks and never interpolated into a shell script; event data is passed through files or
    environment variables; issue bodies use `--body-file`.
  - File pointers are resolved as repository-relative paths only: absolute paths, `..` and symlink
    escapes are rejected. Files written by the auto brainstorm are restricted to a strict allowlist
    (the `spec_pointer` file and `docs/architecture.md`).
  - The persisted `FACTORY_CONTEXT` state is authenticated (HMAC-SHA256 or JWS with
    `SMART_AI_STATE_SIGNING_KEY`), base64url-encoded, versioned, and rejected before use if the
    signature is missing or invalid or the `schema_version` is unknown.
  - `update_issue` refuses a body lacking the `smart-ai:tracking-id` marker.
- **Performance**:
  - **Token budgets**: context packing is capped (default 12,000 tokens); a cloud brainstorm turn
    stays below ~1,500 prompt tokens thanks to `FACTORY_CONTEXT` (instead of ~45,000 for a full
    project scan); the persisted state comment is capped at about 6,000 characters.
  - **Cost control**: worst-case cost reservation before each LLM call enforces
    `max_cost_usd_per_run` (exit code 6); actual usage is reconciled after each response; bounded
    retries with backoff on rate limits and 5xx.
  - **Wiki traversal**: the router, the indexes and the matching module wiki are read instead of
    crawling the workspace.
  - **Compute**: ~30 seconds per cloud triage run and ~15 seconds per cloud reply.
  - **Cheapest adequate model first**: free-tier models for planning and triage, subscription models
    only where the governance matrix requires them.

## 6. Testing Strategy

- **Unit Tests**: pytest (+ pytest-mock) for services against in-memory fakes of the ports
  (`LlmClient`, `InteractionChannel`, `IssueTracker`, `PullRequestHost`, `VersionControl`,
  `Workspace`), roadmap parsers against golden fixtures (the four layouts, versioned or not,
  divergence, malformed lines, checked boxes, already-triaged lines; fixtures reuse
  `tests/skills/smart-plan/assets/`), and LiteLLM calls with `mock_response`. Suspend/resume is
  verified by serialising the state and resuming in a fresh process.
- **E2E / Integration Tests**: skills and prompts are evaluated with Promptfoo on mocked multi-turn
  histories (see [skill-test-strategy.md](./dev/skill-test-strategy.md)), including schema and
  decision assertions for the triage and brainstorm prompts. No network in CI by default;
  real-provider tests are opt-in and tagged.
- **Static Checks**: Ruff, Prettier, markdownlint, `actionlint`, `zizmor` and `codespell` through
  Lefthook (pre-commit auto-fix and `lint-all` check-only), replayed by the `Lint All` GitHub
  Actions workflow (see [linting-formatting.md](./dev/linting-formatting.md)).
- **Coverage Expectation**: no numeric threshold is defined yet; it is to be set when the
  `src/smart_ai` package is created.
