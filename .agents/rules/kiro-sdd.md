# Rule: Kiro Spec-Driven Development (SDD) & Persistent Steering
# Target: Syllabus Compliance Monitoring System (SCMS)

## Intent
Enforce Kiro's structured Spec-Driven Development methodology for SCMS, eliminating unstructured "vibe coding" in favor of specification-first software engineering.

## Rules for Antigravity
1. **Always Read Steering Files First:** Ground all reasoning in `.kiro/steering/product.md`, `tech.md`, `structure.md`, and `advisor.md` (Advisor Persona & Critical Engagement Protocol).
2. **Two Roles Only:** Strictly enforce the two-role model: **Academic Head** (single campus reviewer/administrator) and **Faculty Staff**. Reject any prompts attempting to introduce Dean, Chair, or QA Staff roles.
3. **Direct Compliance & Live Real-Time:** Treat compliance as the submission status itself. Ensure all status mutations push live updates via WebSockets.
4. **EARS Requirements Gate:** Any requirement update must first be documented in `.kiro/specs/requirements.md` using formal EARS notation (`WHEN [trigger] THE SYSTEM SHALL [behavior]`).
5. **Design Alignment:** Code must strictly match the service breakdown and polyglot persistence definitions in `.kiro/specs/design.md`.
6. **Task-Driven Progress:** Reference or check off items in `.kiro/specs/tasks.md`.
7. **Security & Boundaries:**
   - Enforce Principle of Least Privilege (PoLP) and Defense in Depth.
   - Separate relational records (PostgreSQL) from binary payloads (MongoDB GridFS).
   - Never allow single sign-on or session leakage across FMS and CCMS.
