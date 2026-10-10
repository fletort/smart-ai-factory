# Specifications: Native LLM Wiki Engine (ID: WIKI)

> **State**: _Proposed specification_ (templates are available in `templates/docs/INDEX.md`,
> `templates/src/README.md` and `templates/src/_module_/README.md`)

## 1. Context & Objectives

- **Global Vision:** To achieve true **Token-Less (token-efficient) execution**, `smart-ai` natively
  integrates the LLM Wiki concept directly into its core lifecycle engine. Inspired by Andrej
  Karpathy's design pattern - "Obsidian is the IDE; the LLM is the programmer; the wiki is the
  codebase" - this architecture forces a structured, predictable and hierarchical memory layout upon
  the project. The Native LLM Wiki Engine acts as a global architectural enabler for the entire
  autonomous pipeline: by forcing an interconnected, tree-structured Markdown memory layer across
  the repository, it enables Phase 0 (Spec Refinement), Phase 2 (Triage) and Phase 3 (Autonomous
  Dev) to target files surgically.
- **Business Goals:**
  - Eliminate blind workspace crawls and prevent context-window pollution.
  - **FinOps core connection**: in alignment with the Smart-AI-Factory Governance Matrix, ensure
    that low-cost tier models (e.g. Gemini Flash PO for Triage, or `xs_coder`) consume minimal
    tokens. An agent's visibility is restricted strictly to the relevant sub-nodes of the wiki,
    protecting the strict budget constraints of the framework (~$0.01 per standard issue).
- **Non-Goals (Out of Scope):**
  - Tracking individual source code files (`.ts`, `.py`, etc.) in the top-level code index.
  - Replacing the budgeted context packing of the triage, which is specified in the
    [triage engine](./triage-engine.md#context-packing).
  - The Phase 3 DevRouter itself (only its ingestion of the module code-wiki is described here).

## 2. Functional & UX Specifications (What)

- **User / Process Flow:** wiki lookup performed by a pipeline phase.

  ```mermaid
  graph TD
      START["Roadmap update or feature ticket received"] --> LOOKUP["Tree lookup:<br/>router, indexes, module code-wikis"]

      LOOKUP --> PACK["Context packing:<br/>only the specified file paths are loaded"]
      PACK --> GATE{"Requirement found in the wiki,<br/>no conflict with constraints?"}
      GATE -->|yes| READY["Ready"]
      GATE -->|no| BS["🛑 Level: BRAINSTORM, pipeline halted"]
      BS -->|specification completed| LOOKUP
  ```

- **State Machine (session / ticket / workflow):** not applicable. The wiki is a set of static files
  and the lookup above is stateless.

- **Business Rules:**
  - **BR-WIKI-01 (Double-mirror topology):** the `smart-ai` core engine expects, validates and
    dynamically compiles a "Double-Mirror" directory structure at the root of any automated
    repository: a **Product Wiki** (`docs/INDEX.md`) and a **Code Wiki** (`src/README.md` + one
    `README.md` per module), both reachable from the system router.
  - **BR-WIKI-02 (System router size):** `CLAUDE.md` / `AGENTS.md` at the root must remain
    **strictly under 50 lines**, to minimise the system-prompt injection footprint of any routing
    script.
  <!-- ⚠️ DEPENDENCY ALERT: bidirectional ../smart-spec.md#BR-SPEC-16 -->
  <!-- The _Product Wiki_ (BR-WIKI-03, `docs/INDEX.md`) is coupled with the `FEAT_ID` registry
  semantics of [Smart-Spec](./smart-spec.md) (BR-SPEC-16) and the routing that relies on it
  (BR-SPEC-09, BR-SPEC-15): the `FEAT_ID` column is the uniqueness registry used by Phase 0, so any
  change of the column set, of the `N.A.` convention or of the row format makes the collision check
  of BR-SPEC-15 undecidable, and conversely any change of the Phase 0 routing rules invalidates the
  feature lookup described here. -->
  - **BR-WIKI-03 (Product Wiki):** `docs/INDEX.md` maps high-level business goals, requirements and
    feature definitions. It is primarily fed by `/smart-spec` (Phase 0) and ingested by the Triage
    Script (Phase 2).
  - **BR-WIKI-04 (Code Wiki):** `src/README.md` maps technical code boundaries, modules and
    standalone skills. No individual source code files (`.ts`, `.py`, etc.) are allowed to be
    tracked in this top-level index.
  - **BR-WIKI-05 (Module boundary):** every subdirectory inside `src/` bundles a localised
    `README.md`. It forms an impenetrable semantic boundary around that module.
  - **BR-WIKI-06 (Bootstrap):** bootstrap versions of the three documentation types are proposed by
    the installation process and can be personalised to the project
    ([`docs/INDEX.md`](../../templates/docs/INDEX.md),
    [`src/README.md`](../../templates/src/README.md),
    [`src/_module_/README.md`](../../templates/src/_module_/README.md)).
  - **BR-WIKI-07 (Scaffolding loop):** when generating a new skill or DevOps script via the CLI, the
    framework automatically appends the entry row into `src/README.md` and provisions the local
    `README.md` skeleton, ensuring the repository's LLM Wiki compiles and remains intact.
  - **BR-WIKI-08 (Phase 2 context lock):** when the Gemini Flash PO or a local triage routine
    receives an update on `roadmap.md` or a feature ticket, it (1) reads `CLAUDE.md`/`AGENTS.md` ➡️
    `docs/INDEX.md` ➡️ `src/README.md` to identify the affected modules, (2) loads only the
    specified file paths from the matching local Code-Wiki's Critical Entrypoints instead of the
    whole codebase, and (3) if a requirement is missing from the wiki or conflicts with constraints,
    labels the ticket as 🛑 Level: BRAINSTORM, halting the pipeline for `claude-3-5-sonnet`
    refinement.
  - **BR-WIKI-09 (Phase 3 budget ingestion):** before dispatching a ticket to a development agent
    size (`xs_coder` to `xxl_coder`), the DevRouter Script injects the local
    `src/_module_/README.md` into the agent's system instruction, so that a low-cost model
    (`xs_coder`) knows its exact structural limitations without needing a high context window.
- **User Stories:**
  - _As a_ FinOps owner, _I want_ agents to read only the relevant wiki sub-nodes _so that_ a
    standard issue stays around $0.01.
  - _As a_ spec author, _I want_ an index of all feature specifications _so that_ `/smart-spec` can
    decide between creating and updating a specification without scanning the workspace.
  - _As a_ developer agent (low-cost tier), _I want_ a module code-wiki with entrypoints and
    constraints _so that_ I know my structural limits without a large context window.
  - _As a_ maintainer, _I want_ new skills and scripts scaffolded with their wiki entry _so that_
    the wiki never drifts from the code.

## 3. Technical Specifications (How)

- **Architecture & Component Interactions:**

  Topology of the wiki (the "Double-Mirror" setup):

  ```mermaid
  graph TD
      %% Styling definitions
      classDef runtime fill:#1f2937,stroke:#3b82f6,stroke-width:2px,color:#fff;
      classDef router fill:#111827,stroke:#10b981,stroke-width:2px,color:#fff;
      classDef index fill:#1e3a8a,stroke:#6366f1,stroke-width:2px,color:#fff;
      classDef leaf fill:#374151,stroke:#9ca3af,stroke-width:1px,color:#fff;

      %% Nodes configuration
      RUN[Smart-AI-Factory Runtime Loop]:::runtime
      CONF[Reads Local Config & Triggers Native LLM Wiki Map]:::runtime
      ROUTER["CLAUDE.md / AGENTS.md<br>(System Router)"]:::router

      SPEC_IDX["docs/INDEX.md<br>(Product / Features Wiki)"]:::index
      CODE_IDX["src/README.md<br>(Codebase / Skills Wiki)"]:::index

      SPEC_LEAF["docs/specs/*.md<br>(Surgical Context Lock)"]:::leaf
      CODE_LEAF["src/&lt;module&gt;/README.md<br>(Isolated Skill Boundaries)"]:::leaf

      %% Flow connections
      RUN --> CONF
      CONF --> ROUTER

      ROUTER -->|Route to Product| SPEC_IDX
      ROUTER -->|Route to Code| CODE_IDX

      SPEC_IDX --> SPEC_LEAF
      CODE_IDX --> CODE_LEAF
  ```

  Lookup performed by the triage:

  ```mermaid
  sequenceDiagram
      autonumber
      participant Triage as Triage (Phase 2)
      participant Router as CLAUDE.md / AGENTS.md
      participant PIdx as docs/INDEX.md
      participant CIdx as src/README.md
      participant Mod as src/module/README.md
      participant LLM as Triage LLM

      Triage->>Router: Read (under 50 lines)
      Triage->>PIdx: Locate the feature specification
      Triage->>CIdx: Identify affected modules
      Triage->>Mod: Read Critical Entrypoints
      Note over Triage,Mod: Only the specified file paths are loaded
      Triage->>LLM: Surgical context (no full codebase)
      alt Requirement missing or conflicting
          LLM-->>Triage: unclear specification
          Triage-->>Triage: Label 🛑 Level: BRAINSTORM, halt pipeline
      end
  ```

- **Data Model & API Contracts:**
  - **Endpoints / Methods:** none; the wiki is a set of Markdown files read by the pipeline phases.
    The budgeted traversal implementation is the
    [triage engine context packing](./triage-engine.md#context-packing) and the workspace layer of
    the [CLI core](./cli-core.md#package-layout) (`core/workspace.py`).
  - **Payload Constraints:** the three document types are specified below.

    **The System Router: `CLAUDE.md` / `AGENTS.md`** (root of the project, under 50 lines):

    ```markdown
    # 🚀 [Project Name]

    Welcome to the development repository of **[Project Name]**. This file outlines the general
    development guidelines, routine commands, and agentic routing rules.

    ## 🛠️ Development & Environment Commands

    - **Build Project:** `npm run build` _(or framework equivalent: e.g., cargo build, poetry
      build)_
    - **Run Tests:** `npm run test` _(or pytest, cargo test)_
    - **Lint & Format:** `npm run lint`

    ## 🤖 Smart-AI-Factory Integration (LLM Wiki)

    > **Strict FinOps Token Rule:** This repository utilizes the `smart-ai` native LLM Wiki
    > framework. To prevent massive token overhead and blind workspace crawls, follow the strict
    > tree-traversal index layers below.

    ### 🧭 Agentic Routing Indices

    - **Product Wiki (Features, Specs & Requirements):** Read [`docs/INDEX.md`](docs/INDEX.md)
      before writing or refactoring any feature logic.
    - **Code Wiki (Architecture, Core Modules & Skills Map):** Read [`src/README.md`](src/README.md)
      to discover structural boundaries and local constraints before opening source files.
    ```

    **The Functional Branch (Product Wiki): `docs/INDEX.md`**:

    ```markdown
    # 🗺️ Functional Specifications Index (Product Wiki)

    | FEAT_ID | Feature / Skill Domain | Description & Capabilities                                 | Specification File                                     |
    | :------ | :--------------------- | :--------------------------------------------------------- | :----------------------------------------------------- |
    | AGLF    | **Agent Lifecycle**    | Core ReAct loop mechanics, orchestration states.           | [`specs/agent-lifecycle.md`](specs/agent-lifecycle.md) |
    | FOPS    | **FinOps Routing**     | Budget evaluation rules, cost profile evaluation matrices. | [`specs/finops-routing.md`](specs/finops-routing.md)   |
    | GHUB    | **GitHub Integration** | Webhook listeners, automated ticketing, issue labelling.   | [`specs/github-provider.md`](specs/github-provider.md) |
    ```

    **The Structural Branch (Code/Skills Wiki): `src/README.md`**:

    ```markdown
    # 🏗️ Codebase Architecture Index (Code Wiki)

    | Module / Skill Folder | Technical Responsibility inside the SDK                         | Local Code-Wiki Link                       | Associated Spec                                                   |
    | :-------------------- | :-------------------------------------------------------------- | :----------------------------------------- | ----------------------------------------------------------------- |
    | **`src/core/`**       | LLM providers integration, cost counters, configuration parser. | [`src/core/README.md`](core/README.md)     | [`docs/specs/engine.md`](../docs/specs/engine.md)                 |
    | **`src/skills/`**     | Registry for autonomous agent actions and pipeline plugins.     | [`src/skills/README.md`](skills/README.md) | [`docs/specs/skills-runtime.md`](../docs/specs/skills-runtime.md) |
    ```

    **Local Module Code-Wiki Template: `src/[MODULE_NAME]/README.md`**:

    ```markdown
    # 📦 Module Code-Wiki: [MODULE_NAME] (e.g., auth, users, billing)

    > **Agent Rule:** This file defines the explicit architectural scope and boundaries for the
    > `src/[MODULE_NAME]/` directory. Adhere strictly to the entrypoints and constraints outlined
    > below.

    ## 🔗 Contextual Anchors

    - **Functional Specification:** [`docs/specs/[SPEC_FILE].md`](../../docs/specs/[SPEC_FILE].md)
    - **Parent Architecture Index:** [`src/README.md`](../README.md)

    ## 📌 Critical Entrypoints & Files

    - `[entrypoint_file_1.ext]` (e.g., `auth.controller.ts`) - **Purpose:** Main public API gateway
      / handler for incoming route requests.
    - `[entrypoint_file_2.ext]` (e.g., `auth.service.ts`) - **Purpose:** Core business logic, token
      processing, and database interactions.
    - `[types_file.ext]` (e.g., `types.ts`) - **Purpose:** Data schemas, internal models, and strict
      type definitions.

    ## 🛠️ Architecture & Data Flow

    - Describe how data flows through this module in 2-3 concise bullets.
    - _Example: Incoming HTTP requests hit the controller, parameters are validated via the types_
      _schema, and the payload is handed over to the service layer for processing._

    ## ⚠️ Architectural Constraints & Rules (Strict)

    1. **Dependency Boundaries:** This module must remain decoupled. Never import directly from
       sibling feature modules. Use shared core utilities or event emitters instead.
    2. **State Management:** All components in this directory must remain completely stateless. No
       local server-side caching or variable persistence is allowed outside the database layer.
    3. **Error Handling:** All asynchronous database/network operations must be wrapped in localized
       `try/catch` blocks and piped into the application's central error handler.
    ```

  - **Database Updates (ERD if needed):** none. Phases consuming the wiki: Phase 0 (`smart-spec`,
    `docs/INDEX.md`), Phase 2 (triage, full tree lookup), Phase 3 (DevRouter, module code-wiki
    injection).

- **Edge Cases & Error Handling:**
  - **EC-WIKI-01 (Requirement missing from the wiki or conflicting with constraints):** the Triage
    Script labels the ticket 🛑 Level: BRAINSTORM and halts the pipeline for refinement
    (**BR-WIKI-08**).
  - **EC-WIKI-02 (Index insufficient):** the agent asks the user instead of scanning the workspace
    (see [smart-spec](./smart-spec.md#2-functional--ux-specifications-what), **BR-WIKI-09**).
  - **EC-WIKI-03 (Router larger than 50 lines):** violates **BR-WIKI-02**; the router must be
    reduced.
  - **EC-WIKI-04 (Source file listed in the code index):** violates **BR-WIKI-04**; only modules and
    skills are listed.

## 4. Acceptance Criteria (QA)

- [ ] **Nominal Scenario:** Given a repository with a router, `docs/INDEX.md`, `src/README.md` and
      module code-wikis, when the triage receives a roadmap update, then it reads the router, the
      two indexes and the matching module `README.md` only, and loads only the specified entrypoint
      files.
- [ ] **Scaffolding Scenario:** Given a new skill or DevOps script generated through the CLI, when
      generation ends, then a row exists in `src/README.md` and a local `README.md` skeleton is
      provisioned.
- [ ] **Budget Ingestion Scenario:** Given a ticket dispatched to a development agent, when the
      DevRouter builds the system instruction, then the local `src/_module_/README.md` is injected.
- [ ] **Error Scenario:** Given a requirement missing from the wiki or conflicting with its
      constraints, when the triage evaluates the ticket, then it is labelled 🛑 Level: BRAINSTORM
      and the pipeline halts.
- [ ] **Constraint Scenario:** Given a `CLAUDE.md` / `AGENTS.md` router, when it is validated, then
      it contains strictly less than 50 lines.
