# Structure Steering: Syllabus Compliance Monitoring System (SCMS)

## 1. Repository & Monorepo Organization
SCMS adopts an organized monorepo structure modeled after the institutional standard, grouping backend microservices under `apps/`, shared utilities under `packages/`, database schemas under `database/`, and the client presentation tier under `src/`:

```
Capstone-ACAS/ (or Capstone-SCMS)
├── .github/
│   └── workflows/
│       └── ci-security.yml              # CI/CD (TruffleHog, Trivy, CodeQL)
├── .kiro/
│   ├── specs/                           # Spec-Driven Development Artifacts
│   │   ├── design.md                    # Technical & sequence design
│   │   ├── requirements.md              # Formal EARS requirements (SCMS baseline)
│   │   └── tasks.md                     # Sequenced task execution plan
│   └── steering/                        # Persistent Agent Steering Rules
│       ├── product.md                   # SCMS vision, 2 roles, real-time live compliance
│       ├── structure.md                 # Monorepo layout, conventions, explorer organization
│       └── tech.md                      # Strict tech stack & security rules
├── apps/                                # Backend Microservices Tier
│   ├── api-gateway/                     # Server 0: Ingress, TLS, Rate Limiting & WebSocket Router
│   │   ├── src/
│   │   │   ├── guards/                  # RoleGuard (Academic Head & Faculty Staff)
│   │   │   ├── proxies/                 # Reverse proxy routes to backend microservices
│   │   │   ├── websockets/              # Live compliance WebSocket broadcast gateway
│   │   │   └── main.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── audit-log-service/               # Server 4B: Review & Audit Trail Logger
│   │   ├── src/
│   │   │   ├── audit/                   # Append-only immutable log & query handlers
│   │   │   └── main.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── compliance-monitoring-service/   # Server 5: Real-time compliance counts & CCMS feed
│   │   ├── src/
│   │   │   ├── compliance/              # Real-time status aggregation & BullMQ overdue cron
│   │   │   ├── integrations/            # CCMS outbound compliance summary push
│   │   │   └── main.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── identity-service/                # Server 1: SCMS local accounts & 2-role auth (Sprint 1)
│   │   ├── src/
│   │   │   ├── auth/                    # Argon2id password hashing, login, logout, JWT cookies
│   │   │   ├── users/                   # User accounts (Academic Head, Faculty Staff)
│   │   │   ├── privacy/                 # RA 10173 faculty field filter (name, college, unit)
│   │   │   ├── adapters/                # Read-only FMS lookup adapter & Redis fallback cache
│   │   │   └── main.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── requirements-service/            # Server 2: Academic Requirements & Deadlines
│   │   ├── src/
│   │   │   ├── requirements/            # Program syllabus requirements & term deadlines
│   │   │   ├── calendar/                # CCMS term calendar ingestion
│   │   │   └── main.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── submission-service/              # Server 3: Syllabus Upload & Review Workflow
│       ├── src/
│       │   ├── submissions/             # Submissions state machine & GridFS binary storage
│       │   ├── reviews/                 # Academic Head review decisions (Approve / Return)
│       │   └── main.ts
│       ├── package.json
│       └── tsconfig.json
├── database/                            # Polyglot Database Schemas & Migrations
│   ├── mongo/                           # MongoDB GridFS buckets & syllabus form collections
│   ├── postgres/                        # PostgreSQL schema definitions, init SQL & migrations
│   │   └── init-schemas.sql
│   └── seeds/                           # Initial seed data (Academic Head & demo Faculty)
├── docs/                                # Technical Documentation & Architecture
│   ├── product_backlog.md               # 20 User Stories, 8 Sprints, Sprint 1 breakdown
│   ├── system_architecture_and_diagrams.md # 7 uncluttered technical diagrams
│   └── ui_design_system.md              # PUP Maroon & Gold tokens & styling specifications
├── packages/                            # Shared Monorepo Packages
│   ├── common-dtos/                     # Shared TypeScript interfaces, EARS DTOs, Enums
│   │   ├── src/
│   │   │   ├── auth.dto.ts
│   │   │   ├── submission.dto.ts
│   │   │   └── index.ts
│   │   └── package.json
│   └── logger/                          # Immutable audit logger client & structured logger
│       ├── src/
│       │   └── index.ts
│       └── package.json
├── src/                                 # React SPA Client Tier (PUP Maroon & Gold Theme)
│   ├── api/                             # Axios client instances & gateway proxy endpoints
│   │   └── apiClient.ts
│   ├── assets/                          # PUP logo, campus seal, university imagery
│   ├── auth/                            # Authentication state & Route Guards
│   │   ├── AuthContext.tsx              # Auth state provider (SCMS credentials)
│   │   └── RoleGuard.tsx                # Role-based route guard (Academic Head vs Faculty)
│   ├── components/                      # Hybrid UI Components (Tailwind + Radix + MUI)
│   │   ├── layout/                      # AppLayout, Sidebar, TopBar, PupFooter
│   │   │   ├── AppLayout.tsx
│   │   │   ├── PupFooter.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopBar.tsx
│   │   └── ui/                          # Reusable UI primitives
│   │       ├── button.tsx               # Radix-styled button
│   │       └── StatusBadge.tsx          # Direct compliance status pill badge
│   ├── config/                          # Application theme tokens & environment config
│   │   └── muiTheme.ts                  # MUI v9 theme with PUP Maroon (#580000)
│   ├── hooks/                           # Custom React hooks
│   │   ├── useAuth.ts                   # Current authenticated user & role hook
│   │   └── useLiveCompliance.ts         # Real-time WebSocket live compliance hook
│   ├── pages/                           # Scoped Pages for Academic Head & Faculty Staff
│   │   ├── AuditLogPage.tsx             # Academic Head audit trail inspection
│   │   ├── DashboardPage.tsx            # Live compliance monitoring dashboard
│   │   ├── LoginPage.tsx                # Sprint 1: Local SCMS account sign-in
│   │   ├── NotFoundPage.tsx             # 404 Not Found route
│   │   ├── RequirementsPage.tsx         # Program requirements & term deadline management
│   │   ├── SubmissionDetailPage.tsx     # Academic Head syllabus review & decision drawer
│   │   ├── SyllabusUploadPage.tsx       # Faculty syllabus file upload & form submission
│   │   └── UnauthorizedPage.tsx         # 401/403 descriptive error page
│   ├── services/                        # Client-side HTTP API services
│   │   ├── authService.ts               # Login / logout API calls
│   │   ├── complianceService.ts         # Live compliance stats API calls
│   │   ├── requirementService.ts        # Requirement definition API calls
│   │   └── submissionService.ts         # Upload & resubmission API calls
│   ├── types/                           # Client-side TypeScript interfaces
│   │   └── index.ts
│   ├── utils/                           # Helper utilities
│   │   └── cn.ts                        # Tailwind class merger utility
│   ├── App.tsx                          # App root router & layout provider
│   ├── index.css                        # Tailwind v3 directives & custom CSS variables
│   ├── main.tsx                         # React 18 DOM root mount
│   └── vite-env.d.ts                    # Vite client types
├── .env.example                         # Environment configuration template
├── .gitignore                           # Git ignore rules
├── deploy-vps.sh                        # VPS deployment script
├── docker-compose.yml                   # PostgreSQL 16, MongoDB 7, Redis 7 containers
├── eslint.config.js                     # ESLint configuration
├── index.html                           # Single Page Application HTML root
├── package.json                         # Monorepo root package & script orchestrator
├── pnpm-workspace.yaml                  # Workspace definition for apps and packages
├── postcss.config.js                    # PostCSS processor configuration
├── tailwind.config.ts                   # Tailwind CSS theme with PUP Maroon (#580000) & Gold (#C8960C)
├── start-all-services.bat               # One-click Windows startup script
└── stop-all-services.bat                # One-click Windows graceful shutdown script
```

## 2. Naming & Style Conventions
* **Directories & Files:** `kebab-case` (e.g., `submission.entity.ts`, `live-compliance.gateway.ts`).
* **React Components & Pages:** `PascalCase` (e.g., `LoginPage.tsx`, `DashboardPage.tsx`, `StatusBadge.tsx`).
* **Classes & Interfaces:** `PascalCase` (e.g., `SubmissionEntity`, `ReviewDecisionDto`).
* **Variables & Functions:** `camelCase` (e.g., `calculateOverdueStatus`, `publishLiveStatusUpdate`).
* **Database Identifiers:** `snake_case` in PostgreSQL (e.g., `requirement_id`, `created_at`), `camelCase` in MongoDB collections.
* **Audit Logs:** Immutable; only `INSERT` triggers allowed.

## 3. Strict Module Boundaries
* Microservices in `apps/` must not directly access each other's database tables.
* Relational transactions run strictly through PostgreSQL in `database/postgres/`.
* Unstructured binary payloads (PDF/DOCX) route exclusively to MongoDB GridFS.
* Real-time events (`SUBMISSION_CREATED`, `STATUS_UPDATED`, `DECISION_RECORDED`) publish through Redis pub/sub to the `api-gateway` WebSocket server for instant UI live updates.
