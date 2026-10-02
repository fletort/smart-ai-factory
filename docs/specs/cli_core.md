# Technical Specification: `smart-ai` Python CLI Core

**State**: _Proposed specification (The specified files may not exist yet.)_

## 1. Scope & Intent

Phase 0 (`smart-spec`) and Phase 1 (`smart-plan`) are implemented as pure skills. From Phase 2
(Triage) onward, the framework is driven by a **Python CLI** named `smart-ai`. This document defines
the foundation shared by every present and future pipeline phase: configuration, LLM access,
user/agent interaction, GitHub access, packaging and the future MCP adapter. The triage-specific
logic lives in [triage_engine.md](./triage_engine.md).

Hard requirements:

- **One engine, three front-ends**: the same code runs from a local terminal, from GitHub Actions
  and, later, from an IDE chat through MCP. Only the interaction channel changes.
- **Deterministic plumbing, LLM only where needed**: file parsing, selection, GitHub calls and
  write-backs are plain Python. LLMs are only used for reasoning (triage, brainstorm).
- **FinOps first**: every LLM call is attributed to a model alias, counted and costed.

## 2. Architecture

```mermaid
graph TD
    subgraph "Front-ends"
        CLI["Typer CLI<br/>smart-ai ..."]
        MCP["MCP server (future)<br/>smart-ai mcp serve"]
        SKILL["IDE skills<br/>/smart-triage"] -->|runs| CLI
    end

    subgraph "Application services"
        TRIAGE["triage service"]
        BRAIN["brainstorm service"]
    end

    subgraph "Ports"
        LLM["LlmClient"]
        INTER["InteractionChannel"]
        TRACK["IssueTracker"]
        PRH["PullRequestHost"]
        VCS["VersionControl"]
        WS["Workspace"]
    end

    subgraph "Adapters"
        LITE["LiteLLM"]
        TTY["TerminalChannel<br/>(questionary + rich)"]
        HEAD["SuspendChannel<br/>(cloud / MCP)"]
        GH["GhCliTracker + GhCliPullRequests<br/>(gh subprocess)"]
        GIT["GitCliVcs<br/>(git subprocess)"]
        FS["Local filesystem"]
    end

    CLI --> TRIAGE
    MCP --> TRIAGE
    TRIAGE --> BRAIN
    TRIAGE --> LLM & INTER & TRACK & VCS & WS
    BRAIN --> LLM & INTER & TRACK & PRH & VCS
    LLM --> LITE
    INTER --> TTY & HEAD
    TRACK --> GH
    PRH --> GH
    VCS --> GIT
    WS --> FS
```

Services depend only on ports (Python `Protocol` classes), which makes every service testable with
in-memory fakes and no network.

### 2.1 Package layout

The package follows the [Native LLM Wiki](./native_llm_wiki.md) rules: each module has its own
`README.md` code-wiki file and is registered in `src/README.md`.

```text
src/smart_ai/
├── cli/        # Typer app, one file per command group, output rendering
├── core/
│   ├── config.py       # Pydantic models + loader of .smart.ai/config.yml
│   ├── llm.py          # LlmClient port + LiteLLM adapter, cost accounting
│   ├── interaction.py  # InteractionChannel port + Terminal / Suspend adapters
│   ├── github.py       # IssueTracker + PullRequestHost ports, gh CLI adapters
│   ├── vcs.py          # VersionControl port (branch, commit, push), git CLI adapter
│   ├── workspace.py    # File access, LLM Wiki traversal, token-budgeted context packing
│   └── errors.py       # Exception hierarchy mapped to exit codes
├── triage/     # See triage_engine.md
├── prompts/    # Packaged prompt templates (Jinja2 files), versioned with the package
└── mcp/        # Future MCP adapter (optional extra)
```

## 3. Structuring Libraries

| Concern              | Choice                                  | Why                                                                                               |
| :------------------- | :-------------------------------------- | :------------------------------------------------------------------------------------------------ |
| CLI framework        | **Typer** (+ **Rich** for rendering)    | Type-hint driven, auto help/completion, Rich is already its renderer.                             |
| Config and schemas   | **Pydantic v2**                         | One validated model for config, LLM structured outputs, JSON CLI output and MCP tool schemas.     |
| YAML                 | **ruamel.yaml**                         | Round-trip parsing keeps comments of `.smart.ai/config.yml` if the CLI ever edits it.             |
| Secrets              | **python-dotenv**                       | Loads `.env`; in CI, the same names come from `secrets`.                                          |
| LLM access           | **LiteLLM**                             | One API for OpenRouter, Gemini, DeepSeek, Anthropic; structured output, retries, fallbacks, cost. |
| Prompt templates     | **Jinja2**                              | Prompts are files, not strings in code; testable with Promptfoo.                                  |
| Interactive terminal | **questionary**                         | Menus (`1/2/3`, `y/n/edit`) and multi-line input on top of prompt_toolkit.                        |
| GitHub               | **`gh` CLI** through `subprocess`       | Already required by the devcontainer and CI; no extra auth stack. Hidden behind a port.           |
| Markdown parsing     | Own line-based parser (regex)           | The roadmap format is strict (see `smart-plan`) and must be rewritten surgically.                 |
| Token counting       | `litellm.token_counter`                 | Same library as the calls, model-aware.                                                           |
| MCP (future)         | Official **`mcp`** SDK (FastMCP), extra | Optional dependency `smart-ai[mcp]`; never imported by the CLI path.                              |
| Tests                | **pytest**, **pytest-mock**             | LiteLLM `mock_response` for LLM calls; Promptfoo for prompt quality.                              |

Python target is `>=3.11` (unchanged), linted by the existing `ruff` configuration.

## 4. CLI Contract

```text
smart-ai [GLOBAL OPTIONS] <command> [ARGS]

Global options
  --mode {auto,local,cloud}   auto = cloud if GITHUB_ACTIONS=true, else local
  --non-interactive           Never prompt; fail with exit code 3 if input is required
  --json                      Machine-readable output on stdout (logs go to stderr)
  --dry-run                   Do everything except mutating files, version control, or GitHub
  --config PATH               Default: .smart.ai/config.yml
  -v / -q                     Verbosity

Commands
  smart-ai config check       Validate .smart.ai/config.yml and required env variables
  smart-ai triage             Triage the next eligible roadmap issues   (see triage_engine.md)
  smart-ai brainstorm         Resume a session: --issue N (comment) or --pr N (merged/closed spec PR)
  smart-ai mcp serve          Start the MCP server on stdio             (future)
```

### 4.1 Exit codes

| Code | Meaning                                                             |
| :--- | :------------------------------------------------------------------ |
| 0    | Success (including "nothing to triage")                             |
| 1    | Unexpected error                                                    |
| 2    | Workspace not configured or invalid configuration                   |
| 3    | Human input required but the channel cannot provide it (suspended)  |
| 4    | Roadmap layout divergence unresolved                                |
| 5    | LLM failure (provider error, invalid structured output after retry) |
| 6    | Budget limit reached                                                |
| 7    | GitHub failure                                                      |

### 4.2 JSON output

With `--json`, stdout contains one document, always carrying a `schema_version`:

```json
{
  "schema_version": "1.0.0",
  "command": "triage",
  "status": "completed | needs_input | failed",
  "results": [],
  "needs_input": null,
  "usage": { "prompt_tokens": 0, "completion_tokens": 0, "cost_usd": 0.0 }
}
```

`needs_input` is the **suspension payload** described in section 6. It is the single mechanism used
by the cloud pipeline and the MCP adapter.

## 5. Configuration

`.smart.ai/config.yml` keeps the existing `specifications` and `roadmap` sections used by the skills
and gains two sections. The skills ignore unknown sections, so the file stays shared.

```yaml
specifications: # existing
  templates:
    unified: .smart.ai/templates/unified-spec.md
roadmap: # existing
  versioned: false
  layout: auto # single | multi | auto

models: # alias -> LiteLLM model string + env variable holding the key
  flash_po:
    model: gemini/gemini-3.6-flash
    api_key_env: CHAT_GEMINI_API_KEY
  claude_sonnet:
    model: openrouter/anthropic/claude-sonnet-4
    api_key_env: CHAT_OPENROUTER_API_KEY

triage:
  simple_triage_model: flash_po # alias from `models`
  advanced_brainstorm_model: claude_sonnet # alias from `models`
  auto_brainstorm: false # true = advanced model resolves ambiguities alone
  hitl_during_triage: true # human approval before creating issues
  roadmap_writeback: pr # pr | direct | off (cloud sync of `(#N)` into the roadmap)
  max_cost_usd_per_run: 0.50 # hard stop, exit code 6
```

Rules:

- **Early exit**: if the config file is missing, the CLI prints exactly
  `❌[smart-ai] Workspace not configured.` and exits with code 2, mirroring the skills.
- Pydantic validates the whole file at load time. An unknown alias or a missing environment variable
  is reported by `config check` and at startup with the offending key.
- Secrets are **never** in `config.yml`. Local: `.env`. Cloud: GitHub `secrets` mapped to the same
  variable names.
- Model aliases are the only thing the pipeline code knows. Switching a provider is a config edit.

## 6. Interaction Model: Resumable Sessions

Local mode is synchronous, cloud and MCP are not. To avoid duplicating logic, every interactive flow
(brainstorm, approval gate) is written as a **resumable step function**:

```python
def step(state: SessionState, answer: UserAnswer | None) -> StepResult:
    """Pure function of (state, answer). Returns either Done(...) or NeedsInput(question, state)."""
```

`InteractionChannel` decides what happens on `NeedsInput`:

| Channel                  | Used by        | Behaviour on `NeedsInput`                                                                    |
| :----------------------- | :------------- | :------------------------------------------------------------------------------------------- |
| `TerminalChannel`        | local, TTY     | Renders the question with questionary, collects the answer and calls `step` again in a loop. |
| `SuspendChannel` (cloud) | GitHub Actions | Serialises the state, publishes the question to the GitHub issue, exits with code 3.         |
| `SuspendChannel` (MCP)   | IDE chat       | Returns `needs_input` as the tool result; the chat calls the tool again with the answer.     |

The **suspension payload** is:

```json
{
  "session_id": "ISSUE-2.1",
  "kind": "brainstorm_question | approval",
  "question": "…",
  "state": { "schema_version": "1.0.0" }
}
```

`state` is a compact, versioned Pydantic model (never the repository content). Keeping it small is
what makes the cloud mode cheap (see the `FACTORY_CONTEXT` strategy in
[triage_cloud.md](../pipelines/triage_cloud.md)).

## 7. LLM Layer

- `LlmClient.complete(alias, messages, response_model=None) -> LlmResult` is the only entry point.
  `LlmResult` carries the parsed object, token usage and cost computed with
  `litellm.completion_cost`.
- **Structured output**: when `response_model` is given, the request uses the provider's JSON schema
  mode if supported. The reply is validated with Pydantic; on failure, **one** repair call sends the
  validation errors back to the model, then the call fails with exit code 5.
- **Resilience**: bounded retries with backoff on rate limits and 5xx. Free-tier quota errors (for
  example Gemini) are surfaced clearly and may fall back to a configured alias.
- **Budget**: A per-run accumulator enforces a strict hard cap via worst-case cost reservation
  before each LLM call. The engine calculates the maximum potential cost of the request (based on
  prompt size, `max_tokens` limits, and model pricing). If this worst-case cost breaches
  `max_cost_usd_per_run`, the call is aborted immediately to guarantee spend never exceeds the
  configured limit. Actual token usage is reconciled immediately after each successful response.
- **Prompts** are Jinja2 files under `src/smart_ai/prompts/`. Untrusted text (issue comments,
  roadmap titles) is always inserted inside delimited blocks, and the system prompt states that
  those blocks are data, never instructions.
- **Logging**: prompts and responses are logged only at debug level and never include secrets.

## 8. GitHub Layer

`IssueTracker`, `PullRequestHost` and `VersionControl` are separate ports, so that services (triage
today, development and review phases later) never call `gh` or `git` directly. How the triage uses
them is described in [triage_engine.md](./triage_engine.md#7-issue-creation--roadmap-write-back).

```python
class IssueTracker(Protocol):
    def find_by_marker(self, marker: str) -> Issue | None: ...
    def create_issue(self, title: str, body: str, labels: list[str]) -> Issue: ...
    def get_issue(self, number: int) -> Issue: ...  # title, body, labels, state
    def get_issue_with_comments(self, number: int) -> IssueThread: ...
    def update_issue(self, number: int, *, title: str | None = None, body: str | None = None) -> Issue: ...
    def add_labels(self, number: int, labels: list[str]) -> None: ...
    def remove_labels(self, number: int, labels: list[str]) -> None: ...
    def comment(self, number: int, body: str) -> None: ...

class PullRequestHost(Protocol):
    def open_pull_request(self, head: str, base: str, title: str, body: str) -> PullRequest: ...
    def get_pull_request(self, number: int) -> PullRequest: ...
    def find_open_pull_request(self, head: str) -> PullRequest | None: ...
    def enable_auto_merge(self, number: int) -> bool: ...  # False if the repository forbids it
    # PullRequest: state (open | merged | closed), head_branch, head_repo, base, body, merge_sha

class VersionControl(Protocol):
    def default_branch(self) -> str: ...
    def create_branch(self, name: str, from_ref: str) -> None: ...
    def commit(self, paths: list[Path], message: str) -> str: ...  # bot identity, returns sha
    def push(self, branch: str) -> None: ...
```

Rules shared by the `gh` and `git` adapters:

- Credentials come from `GH_TOKEN` (CI) or the local `gh auth` session; commits use a dedicated bot
  identity.
- Bodies are passed with `--body-file` (never shell interpolation of user content).
- `update_issue` takes the full new body and refuses (error, exit code 7) a body that does not
  contain the `smart-ai:tracking-id` marker, so the marker and the `FACTORY_CONTEXT` block cannot be
  lost by a mutation. Bodies are always produced by one renderer shared by creation and updates.
- `add_labels` and `remove_labels` are idempotent (adding a present label or removing an absent one
  is a no-op), which keeps retries safe.
- Issues are looked up by the hidden `smart-ai:tracking-id` marker, injected at creation of the
  first issue, so that every write is idempotent (see `triage_engine.md`).
- Every adapter failure is mapped to exit code 7 with the failing operation named.

## 9. Packaging & Distribution

- Package name `smart-ai`, console script `smart-ai`, published on PyPI.
- `pyproject.toml` moves from `package-mode = false` to a real package with a `src/smart_ai` layout
  and the `[project.scripts]` entry. Runtime dependencies: `typer`, `rich`, `pydantic`, `litellm`,
  `ruamel.yaml`, `python-dotenv`, `jinja2`, `questionary`. Extra: `mcp`.
- Installation: `pipx install smart-ai`, or run on demand with `uvx smart-ai ...`. GitHub Actions
  pins the version (`uvx smart-ai==X.Y.Z triage`). This replaces the copy of scripts in the Quick
  Start; only the configuration, templates and skills are still copied to the user's project.
- The `.agents/skills/` skills only shell out to `smart-ai ... --json`; they contain no business
  logic.

## 10. MCP Adapter (Future)

`smart-ai mcp serve` exposes the same application services as tools over stdio:

| Tool            | Maps to                             | Result                          |
| :-------------- | :---------------------------------- | :------------------------------ |
| `triage_next`   | `smart-ai triage --json`            | Triage results or `needs_input` |
| `triage_answer` | Resume with `session_id` + `answer` | Next result or `needs_input`    |
| `config_check`  | `smart-ai config check --json`      | Validation report               |

No logic is added in the adapter: it only translates between MCP tool calls and the `SuspendChannel`
payload of section 6.

## 11. Test Strategy

- **Unit tests (pytest)**: services against in-memory fakes of the ports (`LlmClient`,
  `InteractionChannel`, `IssueTracker`, `PullRequestHost`, `VersionControl`, `Workspace`); parsers
  against fixture roadmaps; LiteLLM calls with `mock_response`.
- **Prompt tests (Promptfoo)**: same approach as
  [skill-test-strategy.md](../dev/skill-test-strategy.md), targeting the files under
  `src/smart_ai/prompts/`.
- **No network in CI by default**; real-provider tests are opt-in and tagged.
- Linting and formatting use the existing `ruff` and `lefthook` setup.
