# Unified Specifications: Local Triage & Interactive Brainstorming

> **State**: _Proposed specification (The specified files may not exist yet.)_

## 1. Context & Objectives

- **Global Vision:** this document details the architecture, terminal workflows and
  Human-in-the-Loop (HITL) mechanics of **Smart-AI-Factory** when executed locally inside the
  development workspace. In your local IDE, the system operates in a **synchronous, state-present
  mode**. The execution is driven by the `smart-ai` Python CLI (`smart-ai triage`), which can be
  typed directly in a terminal or launched from a chat assistant through the `/smart-triage` skill
  (and, in the future, through MCP).
- **Business Goals:**
  - Let a developer resolve ambiguities and approve tickets interactively, with full visibility of
    the estimated cost (FinOps Preview Card).
  - Keep the local wallet footprint low through human routing habits (see the business rules).
  - Provide the same engine as the [cloud triage](./triage-cloud.md): technical design in the
    [`smart-ai` CLI core](./cli-core.md) and the [triage engine](./triage-engine.md). The triage
    consumes the roadmap produced by [Smart-Plan](./smart-plan.md).
- **Non-Goals (Out of Scope):**
  - Triage rules (eligibility, context packing, LLM contract, brainstorm state, ticket lifecycle,
    roadmap sync): they are specified once in the [triage engine](./triage-engine.md).
  - Asynchronous, event-driven execution (see [triage cloud](./triage-cloud.md)).
  - The `/smart-triage` skill business logic: it is only a thin wrapper that runs the command and
    relays its questions to the chat.

## 2. Functional & UX Specifications (What)

- **User / Process Flow:**

  ```mermaid
  graph TD
      subgraph "💻 Human Interface"
          User[Developer] -->|Terminal: smart-ai triage| CLI[smart-ai CLI]
          User -->|Chat: /smart-triage| Chat[VS Code Chat / OpenCode]
          Chat -->|Runs| CLI
      end

      subgraph "🧠 Processing Loop"
          CLI -->|1. Reads config| Config[.smart.ai/config.yml]
          CLI -->|2. Parses roadmap, selects eligible issues| RM0[Roadmap files]
          CLI -->|3. Invokes| LLM[Triage LLM: simple_triage_model]
          LLM -->|4. Triages the issue| JSON[Strict JSON Spec Payload]
      end

      subgraph "🛑 Brainstorming"
          JSON -->|"Status: unclear_specification"| BS[Brainstorm Gate Triggered]
          BS -->|Option A: Manual Input| Prompt[Terminal Interface: Ask User for Specs]
          Prompt -->|Developer provides details| LLM

          BS -->|Option B: Auto-Brainstorm| Claude[Invoke Advanced LLM: advanced_brainstorm_model]
          Claude -->|Generates full context specs| JSON
      end

      subgraph "⚙️ Automation & Traceability"
          JSON -->|"Status: ready_to_dev"| HITL{✋ Human Gate: Approve Spec?}

          HITL -->|No: Needs Adjustment| Adjust[Ask Developer for changes]
          Adjust -->|Feedback loop| LLM

          HITL -->|Yes| DevOp[DevOps Toolkit]
          DevOp -->|5. Automated Label & Ticket| GH[gh issue create --label size]
          DevOp -->|6. Local Synchronization| RM[Update local roadmap with #issue_num]
      end
  ```

- **State Machine (session / ticket / workflow):**

  ```mermaid
  stateDiagram-v2
      [*] --> Triaging : smart-ai triage
      Triaging --> BrainstormMenu : unclear_specification (auto_brainstorm false)
      Triaging --> AutoBrainstorm : unclear_specification (auto_brainstorm true)
      BrainstormMenu --> ManualInput : option 1
      BrainstormMenu --> AutoBrainstorm : option 2
      BrainstormMenu --> Aborted : option 3
      ManualInput --> Triaging : details appended, triage repeated
      AutoBrainstorm --> FileReview : decisions and file changes proposed
      FileReview --> Triaging : changes confirmed and written, triage repeated
      Triaging --> ApprovalCard : ready_to_dev (hitl_during_triage true)
      Triaging --> Created : ready_to_dev (hitl_during_triage false)
      ApprovalCard --> Created : y
      ApprovalCard --> Done : n (nothing created)
      ApprovalCard --> Triaging : edit, free text added as a new turn
      Created --> Done : ticket created, (#N) written in the local roadmap
      Aborted --> [*]
      Done --> [*]
  ```

- **Business Rules:**
  - BR-01 (Entry points): the triage is a plain Python CLI, installed once with
    `pipx install smart-ai` (or run on demand with `uvx smart-ai`). It is the same program that runs
    in [GitHub Actions](./triage-cloud.md).
  - BR-02 (Skill wrapper): the `/smart-triage` skill (Continue.dev, OpenCode, VS Code Chat) is only
    a thin wrapper that runs the command and relays its questions to the chat. Like
    [`smart-spec`](./smart-spec.md) and [`smart-plan`](./smart-plan.md), it stops immediately with
    `❌[smart-ai] Workspace not configured.` when `.smart.ai/config.yml` is missing.
  - BR-03 (Roadmap source): the triage reads the roadmap produced by `smart-plan`, following the
    `roadmap` configuration (single or multi file, versioned or not). For a versioned roadmap, the
    latest version is used unless `--roadmap-version` is given.
  - BR-04 (Divergence): if the filesystem contradicts the configuration, the triage stops and asks
    whether to follow the filesystem or fix the configuration, exactly like `smart-plan`.
  - BR-05 (Eligible issues): a roadmap issue (`[ISSUE-X.Y]`) is eligible when it is not done, not
    already linked to a ticket, and its dependencies are cleared (exact rules:
    [triage engine](./triage-engine.md#eligibility)). By default one issue is triaged per local run;
    use `--limit N` or `--all` for more.
  - BR-06 (Spec anchors): each epic points to its specification:
    - **File**: the triage reads the pointed spec (plus the wiki context, see
      [Native LLM Wiki](./native-llm-wiki.md)).
    - **Conversation Context**: no spec file exists, the specification was only discussed in a chat.
      The triage first **asks you for that context** (a description, or a path to a file). Only if
      it is not sufficient does the brainstorm loop start
      ([details](./triage-engine.md#conversation-context-anchors)).
  - BR-07 (Brainstorm trigger): if the Triage LLM discovers missing constraints, loose requirements,
    or design pattern violations against `docs/architecture.md`, it flags the payload status as
    `unclear_specification` (at most 3 questions, like the 3-Question Rule of `smart-spec`).
  - BR-08 (Brainstorm mode): with `auto_brainstorm: false` (default) the CLI pauses the pipeline and
    prints an interactive menu in the terminal. With `auto_brainstorm: true` it goes directly to
    option 2.
  - BR-09 (Option 1, manual enrichment): the terminal opens a text buffer; the typed business logic
    (e.g. _"Use Stripe, handle 402 payment required codes, log webhooks to database"_) is appended
    to the prompt, the low-cost Triage model is re-invoked, and the specification is updated.
  - BR-10 (Option 2, advanced LLM bypass): the script bypasses manual input and calls the model
    configured as `advanced_brainstorm_model` (for example Claude Sonnet) through the same LLM layer
    as every other call, so it works with any provider declared in the configuration. The model
    receives the packed context (spec, wiki indexes, `docs/architecture.md`), takes the missing
    design decisions and proposes the matching updates of the specification or architecture
    documents. The user reviews and confirms these file changes before they are written, then the
    triage is repeated and normally ends with `ready_to_dev`.
  - BR-11 (Brainstorm cap): a brainstorm is capped (`max_brainstorm_turns`, default 5) so that a
    stuck session cannot burn budget; when the cap is reached the issue stays untriaged and the
    reason is displayed. The session model is described in the
    [triage engine](./triage-engine.md#brainstorm).
  - BR-12 (Approval gate): once a technical task is clear and its weight is calculated (from **XS**
    to **XXL**), the framework forces an evaluation step: the terminal clears and displays a
    structured **FinOps Preview Card**. The gate is controlled by `hitl_during_triage` in
    `.smart.ai/config.yml`.
  - BR-13 (Approval answers):
    - **`y` (Yes):** the script executes the native GitHub CLI command (`gh issue create`), fetches
      the new issue number, and adds `(#42)` to the matching line of the local roadmap file (e.g.
      `- [ ] **[ISSUE-2.1]** - Secure API` becomes `- [ ] **[ISSUE-2.1]** (#42) - Secure API`).
      Nothing else in the roadmap is touched, and re-running after a failure never creates a
      duplicate ([rules](./triage-engine.md#issue-creation--roadmap-write-back)).
    - **`n` (No):** the session ends safely without polluting the Git state or the GitHub backlog.
    - **`edit`:** the CLI asks for the adjustment in the terminal (or the chat when launched through
      the skill) and feeds it into the Triage LLM, then displays the new card.
  - BR-14 (Flags): `--dry-run` shows the issue and the roadmap diff without creating or writing
    anything, and `--non-interactive` never prompts (it exits with code 3 if an answer is required).
  - BR-15 (Local FinOps best practices): to optimise the local wallet footprint while working inside
    the IDE, apply these human routing habits:
    1. Leave **Autocomplete** to fast, focused models (`Codestral` or `Gemini Flash`). They are
       built for extreme speed and consume minimal token fractions per line.
    2. Use `DeepSeek-V3` or `DeepSeek-R1` inside the **Continue Chat Panel** for quick edits, unit
       testing generation, and local roadmap evaluations.
    3. Only type `claude` inside your terminal to spin up **Claude Code** when you need a completely
       autonomous agent capable of orchestrating heavy, multi-file architectural refactoring across
       your codebase.
    4. Set `max_cost_usd_per_run` in `.smart.ai/config.yml`: the CLI stops before exceeding it.
- **User Stories:**
  - _As a_ developer, _I want to_ run `smart-ai triage` in my terminal or from my chat _so that_ my
    roadmap issues become tickets without leaving my IDE.
  - _As a_ developer, _I want to_ choose between answering the questions myself and delegating to
    the advanced model _so that_ I control the balance between cost and effort.
  - _As a_ tech lead, _I want to_ see a preview card with the size and the estimated cost before
    anything is created _so that_ I approve spend consciously.
  - _As a_ developer, _I want to_ preview with `--dry-run` _so that_ I can check the issue payload
    and the roadmap diff without side effects.

## 3. Technical Specifications (How)

- **Architecture & Component Interactions:**

  The local mode uses the `TerminalChannel` adapter (questionary + rich) of the CLI core's
  [interaction model](./cli-core.md#interaction-model-resumable-sessions): the step function is
  called again in a loop with the collected answer.

  ```mermaid
  sequenceDiagram
      autonumber
      actor Dev as Developer
      participant CLI as smart-ai CLI (TerminalChannel)
      participant LLM as Triage LLM / advanced model
      participant GH as gh CLI
      participant RM as Local roadmap

      Dev->>CLI: smart-ai triage [--issue ID | --limit N | --all]
      CLI->>RM: Parse, select eligible issues
      CLI->>LLM: Triage (simple_triage_model)
      alt unclear_specification
          CLI-->>Dev: 🛑 Brainstorm menu (1 manual, 2 advanced LLM, 3 abort)
          Dev->>CLI: Option and details / confirmation of file changes
          CLI->>LLM: Triage repeated with the new turn
      end
      CLI-->>Dev: FinOps Preview Card (y/n/edit)
      Dev->>CLI: y
      CLI->>GH: gh issue create --label size
      GH-->>CLI: Issue number
      CLI->>RM: Append (#N) to the matching line
  ```

- **Data Model & API Contracts:**
  - **Endpoints / Methods:**

    ```bash
    smart-ai config check          # validate .smart.ai/config.yml and API keys
    smart-ai triage                # triage the next eligible roadmap issue
    smart-ai triage --issue ISSUE-2.1
    smart-ai --dry-run triage --all
    ```

  - **Payload Constraints:** the brainstorm menu displayed when `unclear_specification` is returned
    and `auto_brainstorm: false`:

    ```text
    🛑 [Brainstorm] The task "Implement checkout system" is too ambiguous.
    👉 Missing parameters: Payment Gateway Provider, Error Handling State, Webhook Strategy.

    How do you want to proceed?
      1) Provide missing technical specifications manually
      2) Delegate to Advanced LLM (Auto-generate complete specs using advanced_brainstorm_model)
      3) Abort triage session

    [Select 1-3]: _
    ```

    The FinOps Preview Card:

    ```text
    ================================================================================
    🔍 PROPOSED SPECIFICATION [Size: M]
    ================================================================================
    Title:  [M] Secure API Endpoints with JWT Authentication
    Goal:   Implement native json web token validation on all /api/v1 routes.
    Inputs: Request Authorization Header ******
    Output: Decoded payload attached to request context, or 401 Unauthorized status.
    Rules:  - Focus strictly on this scoped task. No future architecture.
            - Mandatory: Add unit tests under /tests/auth.test.js.
    --------------------------------------------------------------------------------
    💰 Est. CI/CD Cost: ~\$0.05 (Target Model: DeepSeek-R1)
    ================================================================================

    ✋ Approve this specification and provision GitHub infrastructure? (y/n/edit): _
    ```

  - **Database Updates (ERD if needed):** none. In local mode the roadmap file is always edited in
    the working tree (the user commits it), unless `roadmap_writeback` is `off`.

- **Edge Cases & Error Handling:**
  - **EC-01 (Missing configuration):** `❌[smart-ai] Workspace not configured.` and exit code 2.
  - **EC-02 (Layout divergence):** the triage stops and asks whether to follow the filesystem or fix
    the configuration.
  - **EC-03 (`--non-interactive` with an answer required):** exit code 3.
  - **EC-04 (Brainstorm cap reached):** the issue stays untriaged and the reason is displayed.
  - **EC-05 (User answers `n`):** the session ends safely, nothing is created.
  - **EC-06 (Failure after ticket creation):** re-running never creates a duplicate.
  - **EC-07 (Budget):** the CLI stops before exceeding `max_cost_usd_per_run` (exit code 6).

## 4. Acceptance Criteria (QA)

- [ ] **Nominal Scenario:** Given a clear specification and `hitl_during_triage: true`, when the
      developer answers `y` on the preview card, then `gh issue create` is executed with the size
      label and `(#N)` is added to the matching local roadmap line only.
- [ ] **Brainstorm Scenario (manual):** Given `unclear_specification` and `auto_brainstorm: false`,
      when the developer chooses option 1 and types the missing logic, then the low-cost model is
      re-invoked with it and the specification is updated.
- [ ] **Brainstorm Scenario (advanced):** Given option 2, when the advanced model proposes file
      changes, then they are shown, require confirmation before being written, and the triage is
      then repeated.
- [ ] **Edit Scenario:** Given the preview card, when the developer answers `edit`, then the
      adjustment is fed to the Triage LLM and a new card is displayed.
- [ ] **Dry-run Scenario:** Given `--dry-run`, when the triage runs, then the issue payload and the
      roadmap diff are shown and nothing is created or written.
- [ ] **Error Scenario:** Given `--non-interactive` and a required answer, when the triage runs,
      then it exits with code 3.
- [ ] **Error Scenario (cap):** Given a stuck brainstorm, when `max_brainstorm_turns` is reached,
      then the issue stays untriaged and the reason is displayed.
- [ ] **Refusal Scenario:** Given the preview card, when the developer answers `n`, then no ticket
      is created and the Git state is untouched.
