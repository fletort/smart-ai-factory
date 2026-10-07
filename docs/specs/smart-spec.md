# Specifications: Smart-Spec (Phase 0 - Specification Refinement) (ID: SPEC)

> **State**: _Implemented as a skill (only)_

## 1. Context & Objectives

- **Global Vision:** `smart-spec` (`/smart-spec`, Phase 0) guides the user from a raw feature idea
  through specification refinement and scope evaluation, then routes to the appropriate execution
  path. The skill acts as a co-architect System Engineer for the workspace: it refines the idea,
  qualifies its size and guides the user toward the correct design track (Macro System vs. Micro
  Ticket). If required, it writes, expands and/or updates the project specifications.
- **Business Goals:**
  - Surface blind spots before any development starts. Phase 0 is the most cognitively demanding
    phase: it requires an "Elite-level" model (`claude-3-5-sonnet`, subscription / commercial cost
    profile) to uncover blind spots, draft airtight specifications and avoid downstream development
    errors. Its Human-in-the-Loop gate is **mandatory**.
  - Produce precise, measurable and testable specifications that match the project templates.
  - Route each idea to the cheapest adequate track: a roadmap placeholder, immediate code injection
    by a local coder agent, or a full specification.
- **Non-Goals (Out of Scope):**
  - Task breakdowns (splitting specifications into subtasks), ticketing (creating issues, assigning
    tasks) and scheduling (timelines, dependencies, resource allocation). They belong to
    [`/smart-plan`](./smart-plan.md) and to the [triage](./triage-engine.md). The role of
    `smart-spec` ends when the specification is complete and ready for execution planning.
  - Reading or scanning the workspace beyond the configuration, the index and the targeted
    specification files.

## 2. Functional & UX Specifications (What)

- **User / Process Flow:**

  ```mermaid
  graph LR
      User["👤 User Input<br/>(Feature Idea)"]

      User -->|Refinement Loop| Refine["🔄 Draft & Refine<br/>(3-Question Rule)"]

      Refine --> Evaluate{Evaluate Scope}

      Evaluate -->|< 4h| Micro["📋 SMALL/MICRO"]
      Evaluate -->|>= 4h| Large["🏗️ LARGE"]

      Micro --> Choice{"Execute?"}
      Choice -->|Case 1| Issue["Add to Roadmap<br/>/smart-plan"]
      Choice -->|Case 2| Code["Code Injection<br/>@xs_coder / @s_coder"]

      Large --> Case3["📄 CASE 3: Write Specs"]
      Choice --> Case3
      Case3 -->|Detect Mode| Mode{UNIFIED<br/>or<br/>MODULAR?}
      Mode -->|UNIFIED| UWrite["Update Single<br/>Specification File"]
      Mode -->|MODULAR| MWrite["Step 1: Functional<br/>Step 2: Technical"]

      UWrite --> Done["✅ Specs Complete"]
      MWrite --> Done
      Done --> Plan["/smart-plan for<br/>task scheduling"]
  ```

- **State Machine (session / ticket / workflow):** not applicable. The skill is a linear,
  conversational flow with no persisted state: the flow above is the complete behaviour.
- **Business Rules:**
  - **BR-SPEC-01 (Configuration pre-condition):** `.smart.ai/config.yml` is checked first and on its
    own. If it is missing, the skill halts immediately, reads nothing else and outputs exactly
    `❌**[smart-spec] Workspace not configured.**`.
  - **BR-SPEC-02 (Template mode detection):** when the configuration exists, only its
    `specifications.templates` section is analysed to detect the mode, announced with
    `[smart-ai] Mode /detected mode/ detected (name of template file(s))`. The template files are
    **not** read at this point.
    - **UNIFIED** mode: only a single `unified` template path is provided.
    - **MODULAR** mode: separate `functional` and `technical` template paths are provided.
  - **BR-SPEC-03 (Never assume):** missing details are never assumed. The first draft flags missing
    information with `⚠️ [PENDING]` and ends with the **3-Question Rule** (at most 3 questions that
    surface blind spots), then waits for validation.
  - **BR-SPEC-04 (Scope evaluation):** once the discussion is mature the scope is evaluated, and
    always notified to the user with one of:
    - `[smart-ai] **SMALL/MICRO** specification estimated`
    - `[smart-ai] **LARGE** specification estimated`
    - `[smart-ai] Scope of the current specification is not yet evaluated`
  - **BR-SPEC-05 (SMALL/MICRO, < 4 hours):** the user chooses between:
    - **Case 1**: run `/smart-plan` to append a high-level issue placeholder to the active /
      configured roadmap target, using the chat context. Used when tracking is needed but local
      specification documentation is overkill. No boilerplate specification file is created; the
      pipeline automatically triages it into a GitHub issue downstream.
    - **Case 2**: activate a local coder agent (`@xs_coder` or `@s_coder`) for immediate code
      injection. Used when the feature is straightforward and implementation can start immediately,
      with minimal specification overhead.
    - **Case 3**: same as the LARGE scope.
  - **BR-SPEC-06 (LARGE, >= 4 hours, multiple components or architectural decisions):** **Case 3**
    (Phase/Epic with full specifications). The skill asks the user's permission before writing the
    specifications.
  - **BR-SPEC-07 (Case 3 handoff):** once the specifications are complete, the user is prompted to
    run `/smart-plan` to handle roadmap updates and task scheduling.
  - **BR-SPEC-08 (Specification mode):** in **UNIFIED** mode a single document merges functional and
    technical needs in the same sections (agile and concise). In **MODULAR** mode the functional
    spec (user stories, business rules, workflows) is checked and updated first (Step 1), then the
    technical spec impact (APIs, schemas, constraints) is mapped (Step 2). The progression is
    announced to the user (e.g. `[smart-ai] Step 1: Updating Functional Specs...`).
  - **BR-SPEC-09 (Index-driven routing):** the new-or-update decision relies strictly on the
    workspace index `docs/INDEX.md` (see [Native LLM Wiki](./native-llm-wiki.md)). The skill is
    forbidden from scanning the whole workspace directories; if the index is insufficient, it asks
    the user.
  - **BR-SPEC-10 (Writes):** once the specification is accepted, the specification file(s) and the
    index file are written within the SAME response, without asking permission again (UNIFIED: two
    writes, MODULAR: three writes).
  - **BR-SPEC-11 (Template fidelity):** the layout and Markdown headers defined in the loaded
    templates are strictly reproduced.
  - **BR-SPEC-12 (Testable requirements):** requirements stay precise, factual and measurable. Vague
    words (e.g. "fast") are avoided in favour of precise metrics.
  - **BR-SPEC-13 (Conflict alert):** a request that directly contradicts a choice made in a previous
    specification raises a visible technical conflict alert before the change is applied.
- **User Stories:**
  - _As a_ developer, _I want to_ refine a raw feature idea with a co-architect _so that_ blind
    spots are surfaced before any code or ticket exists.
  - _As a_ developer, _I want to_ get my scope qualified (SMALL/MICRO vs LARGE) _so that_ I only
    write full specifications when the work justifies it.
  - _As a_ developer with a small feature, _I want to_ either track it through the roadmap or have
    it coded immediately _so that_ I avoid specification overhead.
  - _As a_ tech lead, _I want_ specifications to follow the project templates and stay testable _so
    that_ downstream phases (plan, triage, development) can rely on them.
  - _As an_ architect, _I want_ contradictions with previous specifications flagged _so that_ the
    specification set stays coherent.

## 3. Technical Specifications (How)

- **Architecture & Component Interactions:**

  The skill lives in `.agents/skills/smart-spec/` and works only through file tools (read / write).
  It has no business logic outside the prompt and shares `.smart.ai/config.yml` with the other
  skills and the `smart-ai` CLI (see [CLI core](./cli-core.md#configuration)).

  ```mermaid
  sequenceDiagram
      autonumber
      actor User
      participant Skill as smart-spec skill
      participant Cfg as .smart.ai/config.yml
      participant Idx as docs/INDEX.md
      participant Specs as Templates and specification files

      User->>Skill: /smart-spec (feature idea)
      Skill->>Cfg: Check existence
      alt Config missing
          Skill-->>User: ❌**[smart-spec] Workspace not configured.**
      end
      Skill->>Cfg: Read specifications.templates only
      Skill-->>User: [smart-ai] Mode UNIFIED / MODULAR detected
      loop Refinement
          Skill-->>User: Draft with ⚠️ [PENDING] + 3-Question Rule
          User->>Skill: Answers / validation
      end
      Skill-->>User: Scope notification (SMALL/MICRO or LARGE)
      alt Case 1
          Skill-->>User: Run /smart-plan
      else Case 2
          Skill-->>User: Activate @xs_coder or @s_coder
      else Case 3 (user permission granted)
          Skill->>Specs: Read the templates (paths from config)
          Skill->>Idx: Read the index (update or new feature?)
          opt Existing feature matched
              Skill->>Specs: Read only the matching specification file
          end
          Skill->>Specs: Write specification file(s) and index in the same response
          Skill-->>User: Run /smart-plan for roadmap and scheduling
      end
  ```

- **Data Model & API Contracts:**
  - **Endpoints / Methods:** none (skill invoked from the IDE chat with `/smart-spec`; the skill
    disables model-initiated invocation to prevent cascading invocations, since spec refinement
    requires deliberate user transitions).
  - **Payload Constraints:** configuration read from `.smart.ai/config.yml`:

    | Key                                                | Purpose                                                    |
    | :------------------------------------------------- | :--------------------------------------------------------- |
    | `specifications.templates.unified`                 | Single template, enables **UNIFIED** mode                  |
    | `specifications.templates.functional/technical`    | Separate templates, enable **MODULAR** mode                |
    | `specifications.templates.main_technical_document` | Template of the main technical document (constitution)     |
    | `specifications.paths.*`                           | Destination of the main documents and of the specification |

  - **Database Updates (ERD if needed):** none. Files written: the specification file(s) and
    `docs/INDEX.md`. A new specification is created in the same directory as the other listed files;
    when it is the first specification and no location is given, the usual `./docs` directory is
    used.

- **Edge Cases & Error Handling:**
  - **EC-SPEC-01 (Missing configuration):** halt immediately, no other file is read, exact message
    of BR-SPEC-01.
  - **EC-SPEC-02 (Index insufficient):** the skill never scans the workspace; it asks the user.
  - **EC-SPEC-03 (Existing feature matches):** the exact target file is identified from the index
    table and only that file is read for the update.
  - **EC-SPEC-04 (Contradiction with a previous specification):** visible technical conflict alert
    before applying the change (BR-SPEC-13).
  - **EC-SPEC-s05 (Scope not yet evaluated):** the dedicated notification is emitted until the
    discussion is mature enough.

## 4. Acceptance Criteria (QA)

- [ ] **Nominal Scenario (LARGE):** Given a configured workspace and a mature LARGE idea, when the
      user grants permission for Case 3, then the specification file(s) following the template
      headers and the index are written in the same response and the user is prompted to run
      `/smart-plan`.
- [ ] **Nominal Scenario (SMALL/MICRO):** Given a mature SMALL/MICRO idea, when the scope is
      evaluated, then the notification `[smart-ai] **SMALL/MICRO** specification estimated` is
      emitted and Case 1, Case 2 and Case 3 are offered.
- [ ] **Mode Scenario:** Given a configuration with only a `unified` template, when the skill
      starts, then `[smart-ai] Mode UNIFIED detected (...)` is announced and the template is not
      read yet.
- [ ] **Refinement Scenario:** Given a first draft, when it is presented, then missing information
      is flagged `⚠️ [PENDING]`, at most 3 questions are asked and the skill waits for validation.
- [ ] **Error Scenario:** Given a workspace without `.smart.ai/config.yml`, when `/smart-spec` is
      run, then the skill outputs exactly `❌**[smart-spec] Workspace not configured.**` and calls
      no tool on any other file.
- [ ] **Conflict Scenario:** Given a request contradicting an earlier specification, when it is
      about to be applied, then a visible technical conflict alert is raised first.
