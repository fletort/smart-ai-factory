# 🗺️ Project Roadmap: Smart-AI-Factory Pipeline (Phases 0–2)

## 🎯 Global Vision

Deliver the Smart-AI-Factory pipeline end to end: the prompt-only skills `/smart-spec` (Phase 0)
turn a raw feature idea into a validated, template-compliant specification and `/smart-plan`
(Phase 1) converts it into a macro, parallel-ready roadmap, then the `smart-ai` Python CLI (Phase 2)
triage engine turns those roadmap issues into detailed, sized GitHub tickets. The triage engine runs
both locally (synchronous HITL) and in GitHub Actions (stateless, ticket-as-memory), shares
`.smart.ai/conf.yml`, and hands off to the downstream development phases without ever producing code
or code-level detail.

## 📊 Epics Flow

### 🚀 Epic 1: Smart-Spec Skill (Phase 0 - Specification Refinement)

- **🎯 Epic Purpose:** Deliver the `/smart-spec` skill that refines a raw idea, qualifies its scope
  and routes it to the correct execution track, writing template-compliant specifications only when
  the work justifies it.
- **📋 Spec Anchors:**
  - **Source Type:** File
  - **Pointer:** `docs/specs/smart-spec.md`

#### Epic 1: Target Issues List

- [x] **[ISSUE-1.1]** - Scaffold the `/smart-spec` skill and its `SKILL.md` manifest (frontmatter,
      disabled model-initiated invocation)
  - **Depends on:** None
- [x] **[ISSUE-1.2]** - Configuration pre-condition, early exit and UNIFIED/MODULAR template-mode
      detection with notification
  - **Depends on:** [ISSUE-1.1]
- [x] **[ISSUE-1.3]** - Refinement first-draft loop with `⚠️ [PENDING]` flags and the 3-Question
      Rule
  - **Depends on:** [ISSUE-1.2]
- [x] **[ISSUE-1.4]** - Scope evaluation and SMALL/MICRO vs LARGE notification
  - **Depends on:** [ISSUE-1.3]
- [x] **[ISSUE-1.5]** - Track routing and handoff (Case 1 `/smart-plan`, Case 2 coder agents)
  - **Depends on:** [ISSUE-1.4]
- [x] **[ISSUE-1.6]** - Case 3 index-driven routing: new-vs-update detection via `docs/INDEX.md` and
      template loading
  - **Depends on:** [ISSUE-1.5]
- [x] **[ISSUE-1.7]** - Case 3 specification writing in UNIFIED and MODULAR modes with the index
      written in the same response
  - **Depends on:** [ISSUE-1.6]
- [x] **[ISSUE-1.8]** - Conflict alert and edge-case hardening (missing configuration, insufficient
      index, matching feature, contradiction with a previous specification)
  - **Depends on:** [ISSUE-1.7]

### 🚀 Epic 2: Smart-Plan Skill (Phase 1 - Roadmap & Scheduling)

- **🎯 Epic Purpose:** Deliver the `/smart-plan` skill that initialises, updates or appends a macro,
  parallel-ready roadmap from a validated specification, preserving identifiers and user-managed
  state across re-planning.
- **📋 Spec Anchors:**
  - **Source Type:** File
  - **Pointer:** `docs/specs/smart-plan.md`

#### Epic 2: Target Issues List

- [x] **[ISSUE-2.1]** - Scaffold the `/smart-plan` skill and its `SKILL.md` manifest
  - **Depends on:** None
- [x] **[ISSUE-2.2]** - Configuration pre-condition, early exit and roadmap configuration detection
      with notification (versioned, layout)
  - **Depends on:** [ISSUE-2.1]
- [x] **[ISSUE-2.3]** - Context and sourcing detection (File vs Conversation Context) with Spec
      Anchor metadata
  - **Depends on:** [ISSUE-2.2]
- [x] **[ISSUE-2.4]** - Targeted roadmap discovery across the dedicated paths with second-step
      layout verification and clean-slate detection
  - **Depends on:** [ISSUE-2.3]
- [x] **[ISSUE-2.5]** - Versioned roadmap interactive version-selection gate before any version
      directory is read
  - **Depends on:** [ISSUE-2.4]
- [x] **[ISSUE-2.6]** - Layout divergence detection and arbitration halt (migrate the layout or
      update the configuration)
  - **Depends on:** [ISSUE-2.5]
- [x] **[ISSUE-2.7]** - Clean-slate generation of the single-file roadmap skeleton (Global Vision,
      Epics, `[ISSUE-X.Y]` IDs, `Depends on:` tags)
  - **Depends on:** [ISSUE-2.6]
- [x] **[ISSUE-2.8]** - Clean-slate generation of the multi-file roadmap (README index plus
      `epic-X.md` slices) and automatic layout resolution
  - **Depends on:** [ISSUE-2.6]
- [x] **[ISSUE-2.9]** - Idempotent merge and sync engine (pointer matching, epic isolation, granular
      issue slicing, ID stability)
  - **Depends on:** [ISSUE-2.7], [ISSUE-2.8]
- [x] **[ISSUE-2.10]** - Feature deletion flagging, metadata sync (Global Vision / Epic Purpose) and
      checkbox preservation
  - **Depends on:** [ISSUE-2.9]
- [x] **[ISSUE-2.11]** - Existing-roadmap confirmation gate (comparison table and mandatory `yes`
      before any write)
  - **Depends on:** [ISSUE-2.9]
