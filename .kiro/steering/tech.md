# Technical Steering: Syllabus Compliance Monitoring System (SCMS)

## 1. Approved Technology Stack

### Frontend Client Tier

- **Framework:** React 18+ (SPA), Vite, TypeScript.
- **Real-Time Client:** WebSockets (Socket.io-client) or Server-Sent Events (SSE) for live instant compliance dashboard updates without manual refresh.
- **Styling Architecture (Hybrid):**
  - **Tailwind CSS v3 (`tailwindcss@^3.4.17`):** Utility styling, layout primitives, CSS variables, `tailwindcss-animate`.
  - **Radix UI Primitives (shadcn-compatible):** Headless dialogs, dropdowns, form controls (`@radix-ui/react-dialog`, `slot`, `tabs`, `toast`).
  - **Material UI (MUI v9) + Emotion:** Data tables, chips (`StatusBadge`), and administrative dialogs.
  - **Icons:** `lucide-react` (16px/20px geometric stroke icons).
  - **State & Forms:** `react-router-dom`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`, `date-fns`.
- **Visual Identity & Theme:**
  - **PUP Maroon (Primary):** `#580000` (Sidebar, table header band, primary actions).
  - **PUP Gold (Secondary):** `#C8960C` (Active indicators, accents, subheadings).
  - **Canvas Background:** `#F5F7FA` (Off-white).
  - **Typography:** `"DM Sans"` (UI & Controls) paired with `"DM Serif Display"` (Academic titles).

### API Gateway (Server 0)

- **Ingress:** NestJS Gateway / Nginx Reverse Proxy (TLS 1.3, Rate Limiting via `@nestjs/throttler`, Helmet, JWT Validation, WebSocket proxying).

### Backend Microservices (Servers 1 - 5)

- **Framework:** NestJS (Modular Microservices / Monorepo), TypeScript, Node.js (LTS).
  - **Server 1:** Identity & Access Service (PUP QC AAIP Clerk Shared SSO via OIDC, Local Argon2id Fallback, 2 Roles: Academic Head & Faculty Staff, Read-Only FMS Lookup Adapter).
  - **Server 2:** Academic Requirements Service (Program Requirements, Per-Term Deadlines, CCMS Calendar Sync).
  - **Server 3:** Syllabus Submission & Storage Service (Multipart Stream Uploads, MongoDB GridFS Binary Manager, Current Syllabus Payload).
  - **Server 4:** Review, Approval & Audit Service (Single-Level Approval by Academic Head, Return Comments, Tamper-Evident Immutable Audit Log).
  - **Server 5:** Live Compliance Monitoring & Integration Service (Real-time WebSocket Broadcasts, Dynamic Overdue Recalculation, CCMS Outbound Feed).

### Databases & Storage (Polyglot Persistence)

- **PostgreSQL 16+:** Relational authority (Users, Roles, Requirements, Term Deadlines, Current Submissions State Machine, Append-Only Audit Trail). ORM: Prisma or TypeORM.
- **MongoDB 7+ (GridFS):** Unstructured storage (Syllabus PDF/DOCX chunks via GridFS, dynamic JSON rubric templates, extended audit context).
- **Redis 7+:** Pub/Sub for real-time WebSocket dashboard sync, BullMQ background queues for overdue deadline checks, and FMS/CCMS offline fallback caching.

## 2. Strict Architectural & Security Constraints

- **Two Roles Only:** Strictly enforce RBAC for **Academic Head** (global campus access) and **Faculty Staff** (scoped strictly to own submissions). No other roles exist.
- **Direct Compliance Status:** Compliance is the submission status itself. No separate numerical score or compliance level calculation.
- **PUP QC AAIP Clerk Shared SSO with Local Fallback (Invite-Only):** SMS integrates with the PUP QC AAIP Clerk Shared SSO for authentication. Local Argon2id remains as an emergency fallback. SMS enforces an Invite-Only policy: unregistered Clerk users are rejected with HTTP 403 Forbidden. A user must exist in the local PostgreSQL users table before Clerk can grant access (auto-JIT account creation is disabled), strictly preserving the Two Roles Only rule (`ACADEMIC_HEAD` and `FACULTY_STAFF`). Links with FMS and CCMS carry data payloads or events only.
- **Real-Time Live Updates:** Any status change must push an event to connected clients immediately.
- **Defense in Depth & Least Privilege:**
  - Network/Edge: Reverse proxy, rate limiting, CORS whitelist.
  - Application: Global `ValidationPipe` with strict DTO whitelisting (`forbidNonWhitelisted: true`).
  - Authentication: JWT stored in `HttpOnly`, `SameSite=Strict`, `Secure` cookies; passwords hashed with `Argon2id`.
  - Upload Sanitization: Magic-byte inspection; max file size 10MB; stored directly in MongoDB GridFS.
- **Data Privacy Act (RA 10173):** Only necessary faculty metadata is read from FMS. Documents are visible strictly to the owning faculty member and the Academic Head.
- **Integration Resiliency:** External calls to FMS and CCMS must implement circuit breakers and fallback to cached Redis/PostgreSQL reference data during external outages.
