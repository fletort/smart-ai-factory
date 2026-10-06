# Unified Specifications: Triage Engine (Phase 2)

> **State**: _Proposed specification (The specified files may not exist yet.)_

## 1. Context & Objectives

- **Global Vision:** Triage turns **high-level roadmap issues** produced by
  [`smart-plan`](./smart-plan.md) into **detailed, sized GitHub issues**, asking for clarification
  (brainstorm) when a specification is not precise enough. This document specifies the triage logic
  built on the [`smart-ai` CLI core](./cli-core.md). It is the **single source of truth** for the
  triage rules (eligibility, context, LLM contract, brainstorm, ticket lifecycle, roadmap sync),
  shared by the [local](./triage-local.md) and [cloud](./triage-cloud.md) modes: the user-facing
  behaviour documented there links here instead of repeating these rules.
- **Business Goals:**
  - Backlog generation is fully automated and cost-free by default: the phase requires multiple
    incremental passes over the documentation to detail tasks, so a "Flash" model (default agent
    `Gemini Flash PO`, Free Tier) keeps this high-frequency routing loop at zero cost.
  - Size every ticket (**XS** to **XXL**) so that Phase 3 can route it to the most cost-efficient
    development model tier.
  - Never create a development ticket from an ambiguous or unreviewed specification: the
    **Brainstorm** level (mandatory HITL, `claude-3-5-sonnet` by default) refines the design and
    updates the architecture docs first.
  - One GitHub ticket per roadmap issue for its whole life, with idempotent writes.
- **Non-Goals (Out of Scope):**
  - Writing code (Phase 3) and creating roadmaps (Phase 1).
  - Modifying the checkboxes of the roadmap (owned by the user).
  - The user interface details of the terminal and of the GitHub Actions workflows, which are in
    [triage local](./triage-local.md) and [triage cloud](./triage-cloud.md).

## 2. Functional & UX Specifications (What)

- **User / Process Flow:**

  ```mermaid
  graph TD
      START["smart-ai triage"] --> CFG["Load config"]
      CFG -->|missing| EXIT2["Exit 2: Workspace not configured"]
      CFG --> DISC["Discover roadmap files"]
      DISC -->|layout divergence| EXIT4["Ask user / exit 4"]
      DISC --> PARSE["Parse issues, dependencies, spec anchors"]
      PARSE --> SELECT["Select eligible issues"]
      SELECT -->|none| EXIT0["Exit 0: nothing to triage"]
      SELECT --> SRC{"Spec anchor type"}
      SRC -->|File| PACK["Pack context from LLM Wiki"]
      SRC -->|Conversation Context| ASKCTX["Ask user for the context"]
      ASKCTX --> PACK
      PACK --> LLM["Triage LLM: simple_triage_model"]
      LLM -->|unclear_specification| BRAIN["Brainstorm session"]
      BRAIN -.->|"cloud, first blocking run"| TRACK["Create tracking ticket + sync (#N)"]
      BRAIN -->|"answers / merged spec PR"| LLM
      LLM -->|ready_to_dev| GATE{"hitl_during_triage?"}
      GATE -->|yes| APPROVE["Approval step"]
      GATE -->|no| CREATE
      APPROVE -->|approved| CREATE["Create the ticket, or mutate the tracking ticket"]
      CREATE --> WB["Sync (#N) to the roadmap if not linked yet"]
  ```

- **State Machine (session / ticket / workflow):** lifecycle of a ticket in cloud mode. The ticket
  created when the ambiguity is detected is the **definitive ticket**: it only changes state
  (labels, body) during its life and is never replaced. Both brainstorm modes follow the same state
  machine; only the event that resumes the session differs.

  ```mermaid
  stateDiagram-v2
      [*] --> Brainstorming: ambiguity detected, ticket #N created, (#N) synced to the roadmap
      Brainstorming --> AwaitingAnswer: manual mode, questions posted
      Brainstorming --> AwaitingPR: auto mode, PR opened and linked in the ticket
      AwaitingAnswer --> Retriage: human comment
      AwaitingPR --> Retriage: PR merged
      AwaitingPR --> AwaitingAnswer: PR closed without merge
      Retriage --> AwaitingAnswer: still unclear and turns left
      Retriage --> Ready: ready_to_dev
      Ready --> [*]: ticket mutated in place
  ```

- **Business Rules:**
  - BR-01 (Eligibility): a roadmap issue is eligible when (1) it has no `(#N)` in the roadmap, no
    ticket found for its `tracking-id` marker and no `<!-- [DELETED] -->` mark, (2) it is not
    checked, and (3) every ID in `depends_on` exists and its specification is cleared (checked, or a
    ticket that does not carry the `brainstorming` label).
  - BR-02 (Marker is the source of truth): the roadmap `(#N)` is a human-readable link that may lag
    behind the tickets; the ticket found through the marker is the source of truth. A ticket still
    in brainstorm is never selected again by the eligibility rule: it is resumed by its own events.
  - BR-03 (Selection): `--issue ISSUE-X.Y` targets one issue (dependencies still enforced),
    `--limit N` (default 1 locally, all eligible in CI), `--all`. Eligible issues sharing the same
    blockers are independent and may be triaged in the same run, processed sequentially ordered by
    ID.
  - BR-04 (Exact roadmap format): the parser reads **exactly the format written by `smart-plan`**. A
    line that looks like an issue but does not match is reported as a warning and never silently
    skipped.
  - BR-05 (Layout divergence): triage never guesses. Local: stop and ask whether to follow the
    filesystem or fix the config. Non-interactive or cloud: exit code 4.
  - BR-06 (Version selection): the latest `vX.Y` directory (numeric order) is used, overridable with
    `--roadmap-version vX.Y`. Unlike `smart-plan`, triage never invents a new version.
  - BR-07 (Smallest context): the smallest context that lets a low-cost model judge the issue is
    packed, with a token cap (default 12,000, configurable); the lowest priority items are dropped
    first and the drop is reported.
  - BR-08 (Conversation Context anchors): the context is asked first, then the normal triage runs;
    it is never requested twice.
  - BR-09 (Three questions): an `unclear_specification` result asks at most 3 questions, consistent
    with the 3-Question Rule of `smart-spec`.
  - BR-10 (Brainstorm cap): a session is limited to `max_brainstorm_turns` (default 5); reaching the
    limit leaves the issue untriaged and reports why.
  - BR-11 (Reviewed decisions only): a development issue is never created from decisions that are
    not merged: in auto mode (cloud) the triage resumes only from the merged state of the default
    branch.
  - BR-12 (Approval): with `hitl_during_triage: true` a human approves before the issue becomes
    `ready-to-dev`; with `false` the step is skipped in both modes.
  - BR-13 (One ticket per roadmap issue): there is one GitHub issue per roadmap issue for its whole
    life; a brainstorm tracking issue is updated in place, never replaced.
  - BR-14 (Surgical roadmap write-back): only the matching line is rewritten, appending `(#N)`;
    checkboxes, IDs, dependencies and every other line are never modified.
  - BR-15 (Idempotent commands): re-running any command after a failure or duplicate event never
    creates a second ticket and never processes the same comment twice.
  - BR-16 (Nothing to do is not an error): no eligible issue or no pending event exits with code 0
    before any LLM call.
  - BR-17 (Waiting is not failing): waiting for a human is exit code 3.
  - BR-18 (Untrusted input): issue and comment text is treated as data (delimited blocks) and the
    model's output only ever goes through the Pydantic schema. Event data is passed to the CLI
    through files or environment variables, never through shell interpolation.
- **User Stories:**
  - _As a_ product owner, _I want_ my high-level roadmap issues turned into detailed, sized tickets
    _so that_ developer agents receive precise tasks at the right cost tier.
  - _As a_ product owner, _I want_ the engine to ask at most 3 targeted questions when the
    specification is ambiguous _so that_ I only decide what is truly missing.
  - _As a_ maintainer, _I want_ the advanced model's design decisions to arrive as a pull request
    _so that_ nothing unreviewed becomes a development ticket.
  - _As a_ maintainer, _I want_ a ticket to keep its whole history (gap, discussion, specification
    PR) _so that_ the decisions stay traceable.
  - _As a_ maintainer, _I want_ retries to never create duplicate tickets _so that_ the backlog
    stays clean.
  - _As a_ FinOps owner, _I want_ a size and an estimated cost per ticket _so that_ I can approve
    spend before it happens.

## 3. Technical Specifications (How)

- **Architecture & Component Interactions:**

  ```mermaid
  sequenceDiagram
      autonumber
      participant Run as smart-ai triage
      participant RM as Roadmap files
      participant Ctx as Context packer (LLM Wiki)
      participant LLM as LlmClient
      participant Ch as InteractionChannel
      participant Trk as IssueTracker / PullRequestHost / VersionControl

      Run->>RM: Discover, parse, select eligible issues
      Run->>Trk: find_by_marker (eligibility, dependencies)
      Run->>Ctx: Pack spec + wiki + architecture within the token budget
      Run->>LLM: complete(simple_triage_model, TriageResult)
      alt unclear_specification
          Run->>Trk: find_by_marker, then create_issue (brainstorming) on first blocking run
          Run->>RM: Sync (#N) to the roadmap
          Run->>Ch: NeedsInput (questions) or auto: advanced model + specification PR
          Ch-->>Run: answer / merged PR (resume)
          Run->>LLM: Triage call repeated
      else ready_to_dev
          opt hitl_during_triage
              Run->>Ch: Approval (preview card, or pending-approval label)
          end
          Run->>Trk: create_issue, or update_issue + labels on the tracking ticket
          Run->>RM: Sync (#N) if not linked yet
      end
  ```

- **Data Model & API Contracts:**
  - **Endpoints / Methods:** `smart-ai triage` and `smart-ai brainstorm` (see the command contract
    below).
  - **Payload Constraints:** `RoadmapIssue`, `TriageResult` and `BrainstormState` Pydantic models
    (see the sub-sections below).
  - **Database Updates (ERD if needed):** none. Persistent state lives in the GitHub issue
    (`tracking-id` marker, labels, `FACTORY_CONTEXT`) and in the roadmap line `(#N)`.

  Detailed contracts are given in the sub-sections below.

### Roadmap discovery & parsing

The parser reads **exactly the format written by `smart-plan`**. Any change to that format must be
reflected here.

#### Layout resolution

Inputs: `roadmap.versioned` and `roadmap.layout` from the config.

| versioned | layout   | Files read                                                                                                      |
| :-------- | :------- | :-------------------------------------------------------------------------------------------------------------- |
| false     | `single` | `roadmap.md`                                                                                                    |
| false     | `multi`  | `roadmap/README.md`, `roadmap/epic-X.md`                                                                        |
| true      | `single` | `roadmap/vX.Y/roadmap.md`                                                                                       |
| true      | `multi`  | `roadmap/vX.Y/README.md`, `roadmap/vX.Y/epic-X.md`                                                              |
| any       | `auto`   | Use the only matching location; if both match, report layout divergence; if neither matches, report no roadmap. |

- **Version selection** (versioned): the latest `vX.Y` directory by numeric order, overridable with
  `--roadmap-version vX.Y`. Unlike `smart-plan`, triage never invents a new version.
- **Divergence** (configuration says `single` but multi files exist, or the opposite): the same rule
  as `smart-plan` applies. Local: stop and ask whether to follow the filesystem or fix the config.
  Non-interactive or cloud: exit code 4 with the divergence described in the output. The triage
  never guesses.

#### Parsed model

```python
class SpecAnchor(BaseModel):
    source_type: Literal["File", "Conversation Context"]  # values emitted by smart-plan
    pointer: str                      # "docs/specs/x.md" or "Current Conversation History"

class RoadmapIssue(BaseModel):
    id: str                           # "ISSUE-2.1" (stable, never renumbered)
    title: str
    checked: bool                     # "- [x]"; owned by the user, never modified
    issue_number: int | None          # parsed from "(#42)" if already triaged
    depends_on: list[str]             # [] when "None"
    epic: str                         # epic id
    anchor: SpecAnchor                # inherited from its epic
    file: Path
    line: int                         # for the surgical write-back
```

Recognised patterns (line based):

```text
- [ ] **[ISSUE-2.1]** - Title                 # optional "(#42)" right after the closing "**"
  - **Depends on:** None | [ISSUE-1.1], [ISSUE-1.2]
- **Source Type:** File | Conversation Context
- **Pointer:** `docs/specs/file.md` | `Current Conversation History`
```

A line that looks like an issue but does not match is reported as a warning and never silently
skipped.

#### Eligibility

An issue is **eligible** when all of the following hold:

1. It has no `(#N)` in the roadmap, no ticket found for its `tracking-id` marker (`find_by_marker`),
   and no `<!-- [DELETED] -->` mark.
2. It is not checked.
3. Every ID in `depends_on` exists and its specification is cleared: it is checked, or it has a
   ticket (`(#N)` or marker lookup) that does not carry the `brainstorming` label.

The roadmap `(#N)` is a human-readable link that may lag behind the tickets (see the roadmap sync
below): the ticket found through the marker is the source of truth. A ticket still in brainstorm is
never selected again by this rule: it is resumed by its own events (see the cloud ticket lifecycle).

Selection options: `--issue ISSUE-X.Y` (target one, dependencies still enforced), `--limit N`
(default 1 locally, all eligible in CI), `--all`. Eligible issues sharing the same blockers are
independent and may be triaged in the same run; they are processed sequentially, ordered by ID.

### Context packing

Goal: the smallest context that lets a low-cost model judge the issue.

1. **File anchor**: resolve the pointer only as a repository-relative path; reject absolute paths,
   `..`, and symlink escapes, and report a clear error if the pointed spec file does not exist.
2. **Wiki traversal** ([Native LLM Wiki](./native-llm-wiki.md)): `AGENTS.md` / `CLAUDE.md` →
   `docs/INDEX.md` → `src/README.md` → matching module `README.md` files. Matching is done on the
   spec and issue text, deterministically first (names and links in the indexes), then by the LLM
   only if ambiguous.
3. **Architecture rules**: `docs/architecture.md` if it exists.
4. **Budget**: the packed context is capped (default 12,000 tokens, configurable); the lowest
   priority items are dropped first and the drop is reported in the output.
5. **Cloud mode**: no blind repository traversal. A brainstorm turn uses the issue thread and
   `FACTORY_CONTEXT` as its primary context. The engine may rehydrate it with a bounded set of
   files: the `spec_pointer` file and the paths explicitly named in the thread. Those paths are
   resolved by the engine, not by the model: they must exist, stay inside the repository (no `..`,
   no symlink escape) and fit in the token budget of step 4. After a merged specification PR, the
   files are read from the merged default branch.

#### "Conversation Context" anchors

An epic anchored on `Current Conversation History` has no spec file. The flow is:

1. **Ask for the context first.** Local: the terminal prompts for a description of the feature
   (multi-line input, or a path to a file). MCP: `needs_input` of kind `brainstorm_question`. Cloud:
   the pipeline opens a tracking issue (label `brainstorming`) asking for the context, and stops.
2. Run the normal triage with that text as the specification.
3. If the model answers `unclear_specification`, the brainstorm loop starts.

The provided context is stored in `FACTORY_CONTEXT` (cloud) and, once the issue is created, in its
body, so it is never requested twice.

### Triage LLM contract

One call per issue, with the `simple_triage_model` alias and a Pydantic `response_model`:

```python
class TriageResult(BaseModel):
    status: Literal["ready_to_dev", "unclear_specification"]
    # always present
    rationale: str                          # one or two sentences, shown in logs only
    # when ready_to_dev
    size: Literal["XS", "S", "M", "L", "XL", "XXL"] | None
    title: str | None                       # "[M] Secure API Endpoints with JWT Authentication"
    goal: str | None
    inputs: str | None
    output: str | None
    rules: list[str] = []
    # when unclear_specification
    missing_parameters: list[str] = []
    questions: list[str] = []               # at most 3, see the 3-Question Rule of smart-spec
```

| Field                | Used when               | Purpose                                                                                                                          |
| :------------------- | :---------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `status`             | always                  | Routes the pipeline: `ready_to_dev` goes to approval and creation, `unclear_specification` starts the brainstorm.                |
| `rationale`          | always                  | One or two sentences explaining the decision. Debug logs only: never written to the GitHub issue nor sent back in later prompts. |
| `size`               | `ready_to_dev`          | Complexity tier. Becomes the `size:<SIZE>` label, selects the Phase 3 DevRouter model tier and feeds the cost estimate.          |
| `title`              | `ready_to_dev`          | GitHub issue title. The engine enforces the `[SIZE]` prefix itself.                                                              |
| `goal`               | `ready_to_dev`          | What the issue achieves, in one or two sentences (the "Goal" of the preview card).                                               |
| `inputs`             | `ready_to_dev`          | Inputs of the feature. Optional: some tasks have none.                                                                           |
| `output`             | `ready_to_dev`          | Expected, verifiable result. Mandatory: it is the basis of the acceptance check.                                                 |
| `rules`              | `ready_to_dev`          | Constraints for the developer agent (for example mandatory tests, scope limits). Injected into the Phase 3 prompt.               |
| `missing_parameters` | `unclear_specification` | Short list of what is missing (for example "payment provider"). Shown in the local menu and stored as `detected_gap`.            |
| `questions`          | `unclear_specification` | Questions put to the human, at most 3. Displayed in the terminal or posted in the tracking issue body.                           |

Validation beyond the schema:

- `ready_to_dev` requires `size`, `title`, `goal` and `output`; `unclear_specification` requires at
  least one question. A violation counts as an invalid structured output (one repair call, then exit
  code 5).
- The title must start with the `[SIZE]` prefix, enforced by the engine (it normalises, never trusts
  the model).
- `questions` is truncated to 3, consistent with the 3-Question Rule used by `smart-spec`.

The size drives the labels (`size:M`) and, in Phase 3, the DevRouter model tier.

### Brainstorm

Triggered by `unclear_specification`. It is a resumable session (see the
[interaction model](./cli-core.md#interaction-model-resumable-sessions)) with this state:

```python
class BrainstormState(BaseModel):
    schema_version: str = "1.0.0"
    issue_id: str
    last_processed_comment_id: int | None
    roadmap_line: str
    spec_pointer: str
    detected_gap: str
    architecture_rule: str | None
    source_context_snapshot: str | None
    turns: list[Turn]                       # compact (role, text), oldest summarised
    total_turn_count: int = 0               # monotonic; unaffected by history compaction
    mode: Literal["manual", "auto"]
    awaiting: Literal["answer", "pr_review"]
    pending_pr: int | None
```

The state is serialised in `FACTORY_CONTEXT` in cloud mode, so it must stay minimal: it replaces any
re-reading of the repository.

| Field                       | Purpose                                                                                                                                                                         |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `schema_version`            | Versions the format. A state with an unknown version is rejected explicitly instead of being misread.                                                                           |
| `issue_id`                  | Roadmap issue ID (`ISSUE-2.1`, version-prefixed for a versioned roadmap). Matches the `tracking-id` marker and targets the right roadmap line for the write-back.               |
| `last_processed_comment_id` | Id of the last user comment validated on this issue (idempotence purpose)                                                                                                       |
| `roadmap_line`              | Copy of the roadmap line at triage time. Gives the title without reading the file and detects a roadmap changed in the meantime.                                                |
| `spec_pointer`              | Spec anchor pointer: a spec file path, or `Current Conversation History`. Tells an auto-brainstorm turn where the specification comes from.                                     |
| `detected_gap`              | Summary of what blocks the triage, as phrased by the triage model. Frames the discussion without resending the whole spec at each turn.                                         |
| `architecture_rule`         | Rule of `docs/architecture.md` that is violated, if any. The only architecture excerpt a cloud brainstorm needs.                                                                |
| `source_context_snapshot`   | Specification text or user-provided context. Required for `Conversation Context` anchors, where no spec file exists to re-read.                                                 |
| `turns`                     | Compact `(role, text)` history of questions and answers; the oldest turns are summarised once the size cap is reached. Used **only** as context history for the model.          |
| `total_turn_count`          | A strict monotonic integer incremented at each dialogue turn. Enforces `max_brainstorm_turns` to guarantee protection against runaway loops, independent of history compaction. |
| `mode`                      | `manual` or `auto`, fixed at session start from `auto_brainstorm` or the local menu choice. Selects which model alias is called on resume.                                      |

Two lifecycle fields complete the table above:

- `awaiting`: what the session is waiting for. `answer` = a human comment, `pr_review` = the merge
  or closing of the specification PR opened by the auto mode. It decides which event may resume the
  session (see the cloud ticket lifecycle).
- `pending_pr`: number of that PR, `None` otherwise.

#### Modes

- **Manual** (`auto_brainstorm: false`, or option 1 of the local menu): the questions of the triage
  model are given to the human. Each answer is appended to `turns`, then the triage call is repeated
  (cheap model). The loop ends when the result is `ready_to_dev` or the user aborts.
- **Auto** (`auto_brainstorm: true`, or option 2 of the local menu): the `advanced_brainstorm_model`
  is called through the same LLM layer (no external binary). It receives the packed context and the
  gap, and returns a `BrainstormResolution`: the decisions taken and a proposed update of
  `docs/architecture.md` / the spec.
  - Local: the proposed file changes are shown and require confirmation before being written, then
    the triage call is repeated with those decisions.
  - Cloud: changes are committed on a branch and submitted as a **pull request**, never pushed to
    the default branch. Proposed file changes are validated against a strict allowlist (the
    `spec_pointer` file and `docs/architecture.md`), rejecting absolute paths, `..` traversal, and
    symlink escapes, and verifying the diff before `VersionControl.commit`. The triage is **not**
    repeated in the same run: the session waits for the PR to be merged (see the cloud ticket
    lifecycle), so no development issue is ever based on unreviewed decisions.
- A session is limited to `max_brainstorm_turns` (default 5) to prevent runaway cost; reaching the
  limit leaves the issue untriaged and reports why.

#### State persistence (`FACTORY_CONTEXT`)

In cloud mode, to guarantee data integrity, prevent payload tampering, and avoid injection
vulnerabilities (such as untrusted user comments containing the `-->` sequence breaking the
wrapper), the state is serialized to JSON and secured. To prevent unauthorized alterations, the
serialized state MUST be cryptographically authenticated using a secure signature mechanism (such as
an HMAC-SHA256 or JWS token tied to the repository identity). This signature relies on a dedicated
encryption key injected into the execution context via the `SMART_AI_STATE_SIGNING_KEY` environment
variable (sourced securely from the repository's Encrypted Secrets). This signed token is then
encoded using a standard **base64url** string and embedded safely within a hidden HTML comment in
the tracking issue description:

```html
<!-- FACTORY_CONTEXT: eyJzY2hlbWFfdmVyc2lvbiI6IjEuMC4wIiwiaXNzdWVfaWQiOiJJU1NPRS0yLjEiLCJkZXRlY3RlZF9nYXAiOiJleGFtcGxlIn0= -->
```

During rehydration (resume), the system MUST reject any state payload whose signature is missing or
invalid before trusting internal fields like `issue_id`, `pending_pr`, or execution counters.
Unknown `schema_version` values are rejected with a clear message. The comment size is capped (about
6,000 characters); when exceeded, the oldest turns are summarised by the triage model.

#### Cloud ticket lifecycle and resume triggers

The state machine is given in the functional section above. Triggers and effects:

| Transition                   | Trigger                                                 | Effect on the ticket                                                                                                                                 |
| :--------------------------- | :------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| creation (both modes)        | `push` workflow, ambiguity detected                     | Ticket created with the `tracking-id` marker, label `brainstorming`, `FACTORY_CONTEXT`; `(#N)` synced to the roadmap (see the roadmap sync).         |
| Brainstorming to AwaitingPR  | same run, auto mode                                     | PR opened from a `smart-ai/brainstorm-<id>` branch; its number goes to `pending_pr`, `awaiting` becomes `pr_review`; the ticket body links the PR.   |
| AwaitingPR to Retriage       | PR merged (`pull_request` closed with `merged == true`) | The routing workflow resumes the session on the merged default branch and repeats the triage call with the merged specs and the recorded decisions.  |
| AwaitingPR to AwaitingAnswer | PR closed without merge                                 | The CLI comments on the ticket, sets `mode` to `manual` and `awaiting` to `answer`, and asks the human for the missing decisions.                    |
| AwaitingAnswer to Retriage   | `issue_comment` from an authorised author               | The comment is appended to `turns`, then the triage call is repeated.                                                                                |
| Retriage to Ready            | triage result `ready_to_dev`                            | Same ticket mutated: `brainstorming` removed, final specification written in the body, `size:<SIZE>` and `ready-to-dev` (or `pending-approval`) set. |

Rules:

- A development issue is never created from decisions that are not merged: in auto mode the triage
  resumes only from the merged state of the default branch.
- The PR is linked to the ticket with a plain reference, never a closing keyword, so merging it does
  not close the ticket.
- The PR body carries the same `tracking-id` marker, so the merge event finds its ticket with
  `find_by_marker` without parsing branch names.
- A comment posted while `awaiting` is `pr_review` is ignored with a notice: the PR review is the
  channel until it is merged or closed.
- Retriage counts as a turn of `max_brainstorm_turns`; when the limit is reached the ticket stays in
  `brainstorming` and the reason is commented on it.

### Approval step (`hitl_during_triage`)

- **Local**: a **FinOps Preview Card** is rendered (title, goal, inputs, output, rules, estimated
  cost of the future Phase 3 run for the size tier) and the user answers `y`, `n` or `edit`. `edit`
  adds free text as a new turn and repeats the triage call.
- **Cloud**: the ticket gets the `pending-approval` label instead of `ready-to-dev`, in place of an
  interactive prompt. A maintainer approves by replacing `pending-approval` with `ready-to-dev`
  (consumed by Phase 3).
- With `hitl_during_triage: false` the step is skipped in both modes.
- `--non-interactive` with `hitl_during_triage: true` locally exits with code 3 and lists the
  proposed issues, without creating anything.

### Issue creation & roadmap write-back

1. **Idempotence marker**: the hidden marker `<!-- smart-ai:tracking-id=ISSUE-2.1 -->` is injected
   **in the body of the very first GitHub issue created for a roadmap issue**, whether it is a
   brainstorm tracking issue or a `ready_to_dev` issue. For a versioned roadmap the value is
   prefixed with the version (`v0.2/ISSUE-2.1`) because IDs are only unique per roadmap.
   - Before **any** creation, the tracker is searched with `find_by_marker`. If an issue exists, it
     is reused: the pipeline resumes it (waiting for input) or updates it, and never creates a
     second one. A retry while waiting for a human answer therefore cannot create a duplicate.
   - There is **one GitHub issue per roadmap issue for its whole life**: when a brainstorm ends, the
     tracking issue is updated in place (title, body, `size:<SIZE>` label, `brainstorming` label
     removed) instead of opening a new one. The marker is never removed or rewritten.
   - Runs on the same ref are serialised (see the concurrency rule in
     [triage cloud](./triage-cloud.md#safeguards-both-workflows)), so two runs cannot both miss the
     marker.
   - The marker also makes a retry after a failed roadmap write-back safe: the existing number is
     used for the `(#N)` write-back.
2. **Labels**: the ticket moves through `brainstorming` then `ready-to-dev`, with `size:<SIZE>` and,
   when `hitl_during_triage` is on, `pending-approval` before `ready-to-dev`. Labels are assigned by
   an idempotent label-provisioning operation/setup step.
3. **Roadmap sync (`(#N)` write-back)**: as soon as the first ticket exists (so a blocked issue is
   already linked), the engine rewrites only the matching line, appending `(#N)` right after the ID
   bold block:

   ```diff
   - - [ ] **[ISSUE-2.1]** - Secure API endpoints
   + - [ ] **[ISSUE-2.1]** (#42) - Secure API endpoints
   ```

   The line is re-read and verified (same ID) just before writing. Checkboxes, IDs, dependencies and
   every other line are never modified, consistent with the preservation rules of `smart-plan`.

   How the edit reaches the repository is set by `triage.roadmap_writeback`:
   - `pr` (default): the cloud run applies the edit on an isolated, run-specific branch (e.g.,
     `smart-ai/roadmap-sync-${run_id}` or linked to the active session), created from the latest
     default branch, and opens an independent pull request per run to prevent concurrent writeback
     collisions. Auto-merge is requested when the repository allows it, otherwise a human merges.
     Nothing is pushed to the default branch, so the branch protection is respected and no bypass
     credential is needed. The edit is deterministic and recomputed from the tickets.
   - `direct`: the cloud run commits and pushes to the default branch with a bot identity that is
     allowed to bypass the protection (for example a GitHub App). Reserved for repositories without
     protection, or that explicitly accept this risk.
   - `off`: no git write-back, the tickets are the only link with the roadmap.
   - Local mode always edits the file in the working tree (the user commits it), unless `off`.

   In `pr` mode the sync is eventually consistent, so nothing relies on `(#N)` being merged:
   eligibility, dependency checks and resume use the marker lookup (see Eligibility), and a re-run
   before the merge reuses the existing ticket.

4. **Roadmap re-planning**: because IDs are stable and `(#N)` is just text on the line, a later
   `smart-plan` update keeps the link.
5. `--dry-run` prints the diff and the issue payload without any write.

Port operations used by this lifecycle (the ports are defined in the
[CLI core](./cli-core.md#github-layer)):

| Lifecycle step                           | Port operations                                                                                                                                                          |
| :--------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create the ticket (first run)            | `find_by_marker`, then `create_issue`                                                                                                                                    |
| Mutate the ticket on `ready_to_dev`      | `get_issue`, `update_issue` (title, body), `remove_labels`, `add_labels`                                                                                                 |
| Dependency check (`brainstorming` label) | `get_issue` on each dependency                                                                                                                                           |
| Resume from a comment                    | `get_issue_with_comments`                                                                                                                                                |
| Open the specification PR (auto mode)    | `create_branch`, `commit`, `push`, `open_pull_request`, then `update_issue` to link it                                                                                   |
| Resume from a merge or closing event     | `get_pull_request`, `find_by_marker` (marker in the PR body), `comment`                                                                                                  |
| Roadmap sync in cloud                    | `pr`: `create_branch`, `commit`, `push`, `find_open_pull_request`, `open_pull_request`, `enable_auto_merge`; `direct`: `commit`, `push`; local mode only writes the file |

### Command contract

The engine is runtime-agnostic: every front-end (terminal, IDE skill, MCP, GitHub Actions) calls the
same commands. How the GitHub Actions workflows trigger them, and their security rules, are
described in [triage cloud](./triage-cloud.md).

| Command                                               | Purpose                                                                     |
| :---------------------------------------------------- | :-------------------------------------------------------------------------- |
| `smart-ai triage [--issue ID \| --limit N \| --all]`  | Select and triage eligible roadmap issues (discovery to roadmap write-back) |
| `smart-ai brainstorm --issue <num> --comment-id <id>` | Resume a session from a human comment (cloud ticket lifecycle)              |
| `smart-ai brainstorm --pr <num>`                      | Resume a session after its specification PR is merged or closed             |

Contract guarantees:

- **Idempotent**: re-running any command after a failure or a duplicate event never creates a second
  ticket (marker) and never processes the same comment twice (`last_processed_comment_id`).
- **Nothing to do is not an error**: a run that finds no eligible issue or no pending event exits
  with code 0 before any LLM call.
- **Waiting for a human is not a failure**: exit code 3 (see
  [exit codes](./cli-core.md#exit-codes)).
- **Untrusted input**: issue and comment text is treated as data (delimited blocks) and the model's
  output only ever goes through the Pydantic schema. Callers pass event data to the CLI through
  files or environment variables, never through shell interpolation.

### Module layout

```text
src/smart_ai/triage/
├── roadmap.py      # discovery, parsing, eligibility, surgical write-back
├── models.py       # RoadmapIssue, TriageResult, BrainstormState, ...
├── context.py      # wiki traversal and token-budgeted packing
├── engine.py       # orchestration of the flow of the user journey above
├── brainstorm.py   # resumable step function (manual / auto)
├── approval.py     # FinOps preview card and decision
└── README.md       # code-wiki entry (module boundaries)
```

- **Edge Cases & Error Handling:**
  - **EC-01 (Workspace not configured):** exit code 2.
  - **EC-02 (Layout divergence):** local: ask whether to follow the filesystem or fix the config;
    non-interactive or cloud: exit code 4.
  - **EC-03 (Malformed roadmap line):** reported as a warning, never silently skipped.
  - **EC-04 (Nothing eligible):** exit code 0 before any LLM call.
  - **EC-05 (Spec file missing or pointer escaping the repository):** a clear error is reported;
    absolute paths, `..` and symlink escapes are rejected.
  - **EC-06 (Context over budget):** the lowest priority items are dropped and the drop is reported.
  - **EC-07 (Invalid structured output):** one repair call, then exit code 5.
  - **EC-08 (Brainstorm turn cap reached):** the issue stays untriaged (the ticket stays in
    `brainstorming` in cloud, with the reason commented on it).
  - **EC-09 (FACTORY_CONTEXT signature missing or invalid, or unknown `schema_version`):** the state
    is rejected before any internal field is trusted.
  - **EC-10 (Comment while `awaiting` is `pr_review`):** ignored with a notice.
  - **EC-11 (PR closed without merge):** the ticket falls back to manual brainstorm.
  - **EC-12 (Retry or duplicate event):** the marker lookup reuses the existing ticket;
    `last_processed_comment_id` prevents a comment from being processed twice.
  - **EC-13 (Failed roadmap write-back):** a retry reuses the existing ticket number for `(#N)`.
  - **EC-14 (`--non-interactive` with `hitl_during_triage: true` locally):** exit code 3 listing the
    proposed issues, nothing created.
  - **EC-15 (Roadmap changed in the meantime):** detected through `roadmap_line`; the line is
    re-read and its ID verified just before writing.

## 4. Acceptance Criteria (QA)

- [ ] **Nominal Scenario:** Given an eligible roadmap issue with a clear specification, when
      `smart-ai triage` runs, then a ticket is created with the `[SIZE]`-prefixed title, the
      `size:<SIZE>` label and the `tracking-id` marker, and `(#N)` is appended to the matching
      roadmap line only.
- [ ] **Eligibility Scenario:** Given an issue whose dependency ticket carries the `brainstorming`
      label, when the selection runs, then the issue is not selected.
- [ ] **Brainstorm Scenario (manual):** Given `unclear_specification`, when the human answers, then
      the answer is appended to `turns`, the triage call is repeated and the same ticket is mutated
      on `ready_to_dev` (`brainstorming` removed, `size:<SIZE>` and `ready-to-dev` set).
- [ ] **Brainstorm Scenario (auto, cloud):** Given `auto_brainstorm: true`, when the advanced model
      resolves the ambiguity, then a pull request limited to the allowlist is opened, no development
      issue is created before it is merged, and the merge resumes the triage.
- [ ] **Approval Scenario:** Given `hitl_during_triage: true` in cloud, when the result is
      `ready_to_dev`, then the ticket gets `pending-approval` instead of `ready-to-dev`.
- [ ] **Conversation Context Scenario:** Given an epic anchored on `Current Conversation History`,
      when the triage runs, then the context is asked before the triage and never requested twice.
- [ ] **Idempotence Scenario:** Given a retry after a failure, when the command runs again, then no
      second ticket is created and no comment is processed twice.
- [ ] **Error Scenario:** Given a layout divergence in non-interactive or cloud mode, when the
      triage runs, then it exits with code 4 and describes the divergence.
- [ ] **Error Scenario (state):** Given a `FACTORY_CONTEXT` with an invalid signature, when a
      session is resumed, then the payload is rejected before any field is trusted.
- [ ] **Nothing-to-do Scenario:** Given no eligible issue, when the triage runs, then it exits with
      code 0 before any LLM call.

### Test strategy

- **Roadmap parser and write-back**: golden fixtures covering the four layouts, versioned and
  unversioned, divergence, malformed lines, already-triaged lines and checked boxes. Fixtures reuse
  the shapes in `tests/skills/smart-plan/assets/`.
- **Engine**: fakes for all the ports; scenarios for `ready_to_dev`, one brainstorm loop (manual and
  auto), conversation-context anchor, approval `n`/`edit`, retry after failed write-back
  (idempotence marker), budget exhaustion.
- **Suspend/resume**: serialise state, resume in a fresh process, assert identical outcome.
- **Prompts**: Promptfoo suites for the triage and brainstorm prompts, with assertions on the JSON
  schema and the `ready_to_dev` / `unclear_specification` decision on curated specs.
- **Workflows**: `actionlint` and `zizmor` through the existing `lefthook` jobs.
