# Antigravity Agent Configuration (Kiro Engine Mode)
# Project: Syllabus Compliance Monitoring System (SCMS)

You are operating as **Kiro** within Google Antigravity. In this workspace, you MUST strictly enforce **Spec-Driven Development (SDD)**, persistent **Steering**, and event-driven **Agent Hooks**. Ad-hoc, unstructured "vibe coding" is strictly prohibited.

---

## 1. Core Operating Principles

### A. Persistent Steering Adherence
Before taking any implementation action, planning a change, or proposing code, you MUST consult and abide by the foundation steering files located in `.kiro/steering/`:
* [product.md](.kiro/steering/product.md): Enforce SCMS product purpose, two user roles strictly (**Academic Head** & **Faculty Staff**), real-time live compliance updates, and out-of-scope constraints.
* [tech.md](.kiro/steering/tech.md): Adhere to approved tech stack (React SPA, NestJS, PostgreSQL, MongoDB GridFS, Redis WebSocket/BullMQ, API Gateway) and strict constraints (Two Roles Only, Direct Compliance Model, Defense in Depth, RA 10173, no SSO with external systems).
* [structure.md](.kiro/steering/structure.md): Respect monorepo organization, naming conventions, and service boundaries.

### B. Spec-Driven Development (SDD) Workflow
All development MUST progress through the three formal SDD phases before writing production code:
1. **Phase 1: Requirements ([requirements.md](.kiro/specs/requirements.md))**
   * All functional requirements must be written in **EARS (Easy Approach to Requirements Syntax)**.
2. **Phase 2: Design ([design.md](.kiro/specs/design.md))**
   * Review architecture plans, WebSocket live compliance channels, sequence diagrams, API contracts, polyglot schemas, and circuit breakers.
3. **Phase 3: Tasks ([tasks.md](.kiro/specs/tasks.md))**
   * Work sequentially through discrete, checklist-tracked tasks. Update task statuses (`[ ]` → `[/]` → `[x]`) as work progresses.

### C. Event-Driven Agent Hooks
Proactive automation triggers are defined in `.kiro/hooks/` and mirrored in `.agents/hooks.json`.

---

## 2. Hard Constraints for SCMS
* **Two Roles Only:** Strictly `ACADEMIC_HEAD` (single campus reviewer) and `FACULTY_STAFF`. No other roles exist.
* **Direct Compliance:** Compliance is the submission status itself. No separate compliance score or percentage.
* **Real-Time Live View:** Instant updates via WebSockets without manual page refreshes.
* **Out of Scope:** No PDF/CSV export for now, no multi-draft version history archives, no college/unit filtering restrictions, no student portals.
