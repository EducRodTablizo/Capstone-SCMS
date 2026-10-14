# Structure Steering: Syllabus Compliance Monitoring System (SCMS)

## 1. Repository & Monorepo Organization
SCMS utilizes a domain-driven modular structure separating apps, microservices, shared libraries, and infrastructure:

```
Capstone-ACAS/
├── .kiro/
│   ├── steering/                     # Persistent Agent Steering Rules
│   │   ├── product.md                # SCMS vision, 2 roles, real-time live compliance
│   │   ├── tech.md                   # Strict tech stack & security rules
│   │   └── structure.md              # Organization, conventions, styling
│   └── specs/                        # Spec-Driven Development Artifacts
│       ├── requirements.md           # Formal EARS requirements (SCMS baseline)
│       ├── design.md                 # Technical & sequence design
│       └── tasks.md                  # Sequenced task execution plan
├── .github/
│   └── workflows/
│       └── ci-security.yml           # CI/CD (TruffleHog, Trivy, CodeQL)
├── apps/
│   ├── client/                       # React SPA Frontend (Vite + TS)
│   │   ├── src/
│   │   │   ├── components/           # UI primitives & layouts
│   │   │   ├── features/             # Feature slices: auth, submit, review, live-compliance
│   │   │   ├── hooks/                # useWebSocket / useLiveCompliance hooks
│   │   │   └── styles/               # CSS modules & PUP Maroon theme
│   └── gateway/                      # Server 0: API Gateway (NestJS / Reverse Proxy)
├── services/
│   ├── identity-service/             # Server 1: Identity & Access (Academic Head & Faculty Staff)
│   ├── requirements-service/         # Server 2: Academic Requirements & Deadlines
│   ├── submission-service/           # Server 3: Syllabus Submission & GridFS Storage
│   ├── review-audit-service/         # Server 4: Review, Approval & Audit Trail
│   └── compliance-service/           # Server 5: Live Compliance Monitoring & CCMS Integration
├── packages/
│   ├── common-dtos/                  # Shared TypeScript DTOs & EARS contract types
│   ├── database/                     # PostgreSQL schemas, Mongoose models & migrations
│   └── logger/                       # Structured JSON logger & immutable audit client
└── docs/
    ├── system_architecture_and_diagrams.md  # 7 System Architecture Diagrams
    └── ui_design_system.md                  # UI Tokens & Component Guidelines
```

## 2. Naming & Style Conventions
* **Directories & Files:** `kebab-case` (e.g., `submission.entity.ts`, `live-compliance.gateway.ts`).
* **Classes & Interfaces:** `PascalCase` (e.g., `SubmissionEntity`, `ReviewDecisionDto`).
* **Variables & Functions:** `camelCase` (e.g., `calculateOverdueStatus`, `publishLiveStatusUpdate`).
* **Database Identifiers:** `snake_case` in PostgreSQL (e.g., `requirement_id`, `created_at`), `camelCase` in MongoDB collections.
* **Audit Logs:** Immutable; only `INSERT` triggers allowed.

## 3. Strict Module Boundaries
* Microservices must not directly access each other's database tables.
* Relational transactions run strictly through PostgreSQL.
* Unstructured binary payloads (PDF/DOCX) route exclusively to MongoDB GridFS.
* Real-time events (`SUBMISSION_CREATED`, `STATUS_UPDATED`, `DECISION_RECORDED`) publish through Redis pub/sub to the WebSocket gateway for immediate UI live updates.
