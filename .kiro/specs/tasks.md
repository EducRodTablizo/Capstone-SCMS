# Spec-Driven Development (SDD) Phase 3: Implementation Tasks
## Syllabus Compliance Monitoring System (SCMS)

**Methodology:** Sequenced Task Execution with Dependencies and Acceptance Criteria  
**Status Legend:** `[ ]` Pending | `[/]` In Progress | `[x]` Completed

---

## Phase 0: Repository, Steering & CI/CD Infrastructure
- [x] **TASK-001**: Initialize private GitHub repository with branch protection rules on `main`.
- [x] **TASK-002**: Install CI/CD security workflows (`.github/workflows/ci-security.yml`) with TruffleHog (Secrets), Trivy (Vulnerabilities), and CodeQL (SAST).
- [x] **TASK-003**: Establish SCMS Kiro Steering foundations in `.kiro/steering/` (`product.md`, `tech.md`, `structure.md`).
- [x] **TASK-004**: Formalize SCMS SDD specifications (`requirements.md` EARS syntax, `design.md`, `tasks.md`).
- [ ] **TASK-005**: Configure `docker-compose.yml` for local development (PostgreSQL 16, MongoDB 7, Redis 7).

---

## Phase 1: Persistence Layer & Shared Contracts
- [ ] **TASK-101**: Define PostgreSQL schema for SCMS entities (`users`, `roles` [Academic Head, Faculty Staff], `programs`, `term_calendars`, `requirement_definitions`, `submissions`, `review_decisions`, `audit_logs`).
- [ ] **TASK-102**: Define MongoDB models (`fs.files`, `fs.chunks`, `syllabus_payloads`, `audit_snapshots`).
- [ ] **TASK-103**: Create shared TypeScript DTO package (`packages/common-dtos`) containing SCMS request/response contracts and status enums.
- [ ] **TASK-104**: Implement append-only trigger/constraint on `audit_logs` table preventing `UPDATE` and `DELETE`.

---

## Phase 2: Ingress & Gateway (Server 0)
- [ ] **TASK-201**: Scaffold NestJS API Gateway with Helmet, CORS whitelist, and NestJS Throttler rate limiting.
- [ ] **TASK-202**: Implement JWT Passport Authentication Guard with HttpOnly cookie extraction supporting strictly 2 roles.
- [ ] **TASK-203**: Implement RoleGuard enforcing Least Privilege access control for `ACADEMIC_HEAD` and `FACULTY_STAFF`.
- [ ] **TASK-204**: Configure WebSocket gateway proxying for real-time live compliance events (`/live-compliance`).

---

## Phase 3: Core Application Services (Servers 1 – 5)
- [ ] **TASK-301 [Server 1]**: Implement Identity & Access Service with Argon2id password hashing and local account management for the two roles.
- [ ] **TASK-302 [Server 1]**: Build read-only FMS lookup client with Redis caching and resilient fallback circuit breaker.
- [ ] **TASK-303 [Server 2]**: Build Academic Requirements Service supporting program-scoped syllabus definitions, per-term deadlines, and CCMS calendar sync.
- [ ] **TASK-304 [Server 3]**: Implement Syllabus Submission Service with multipart stream handling, magic-byte validation, and MongoDB GridFS persistence.
- [ ] **TASK-305 [Server 3]**: Implement submission timestamping and real-time status publication to Redis pub/sub.
- [ ] **TASK-306 [Server 4]**: Implement Review & Approval Service (single-level review by Academic Head, approval and return with comments).
- [ ] **TASK-307 [Server 4]**: Implement immutable audit trail logger capturing who acted, what was done, and when.
- [ ] **TASK-308 [Server 5]**: Implement Live Compliance Monitoring Service with real-time status broadcasting.
- [ ] **TASK-309 [Server 5]**: Implement dynamic `OVERDUE` calculation via BullMQ cron worker and outbound compliance summary feed to CCMS.

---

## Phase 4: Frontend Client (React SPA)
- [ ] **TASK-401**: Scaffold React + Vite + TypeScript application with PUP Maroon & Gold design system.
- [ ] **TASK-402**: Build Authentication & Role-based Routing Guards (`ACADEMIC_HEAD` vs `FACULTY_STAFF`).
- [ ] **TASK-403**: Build Faculty Staff Portal (Assigned requirements checklist, syllabus uploader, review status timeline, resubmit form).
- [ ] **TASK-404**: Build Academic Head Review Portal (Submission review queue, approve/return modal with comments, audit log view).
- [ ] **TASK-405**: Build Live Real-Time Compliance Dashboard (Live counts per status, WebSocket auto-updating views without page refresh).

---

## Phase 5: Verification, Testing & Audit Sign-Off
- [ ] **TASK-501**: Write end-to-end integration tests for the live submission, review, return, and resubmission loop.
- [ ] **TASK-502**: Conduct automated SAST and security scan verification via GitHub Actions.
- [ ] **TASK-503**: Simulate FMS and CCMS network outages to verify offline fallback resilience and informational notice.
- [ ] **TASK-504**: Verify compliance against Republic Act 10173 with institutional sign-off documentation.
