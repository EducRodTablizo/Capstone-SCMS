# Syllabus Compliance Monitoring System (SCMS)
## System Architecture & Technical Diagrams

**Institution:** Polytechnic University of the Philippines — Quezon City Campus (PUPQC)  
**Proposed by:** Donayre, Tablizo, Asusula, Bellen  
**Core Technologies:** React SPA, NestJS / Node.js Microservices, PostgreSQL, MongoDB (GridFS), Redis (Pub/Sub & Queues), WebSocket API Gateway  
**Operational Scope:** Exactly two user roles (**Academic Head** & **Faculty Staff**), real-time live compliance dashboard, direct compliance status model  
**Diagram Design Standard:** High-contrast, pure white background (`#FFFFFF`), bright visible connectors (`#0284C7`), and **clean minimalist boxes** (concise 1–3 word labels, no bullet lists inside boxes).

---

## 1. Context Diagram (System Context - Level 0)

The Context Diagram defines the operational boundary of SCMS. Exactly two user roles interface with the system: the **Academic Head** (single campus reviewer and administrator) and **Faculty Staff**, alongside external campus systems (**FMS** and **CCMS**).

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'darkMode': false, 'background': '#FFFFFF', 'primaryColor': '#EFF6FF', 'primaryTextColor': '#0F172A', 'primaryBorderColor': '#1E293B', 'lineColor': '#0284C7', 'secondaryColor': '#F0FDF4', 'tertiaryColor': '#FFFFFF' }}}%%
flowchart TB
    classDef actorNode fill:#DBEAFE,stroke:#1D4ED8,stroke-width:2.5px,color:#0F172A,font-weight:bold;
    classDef systemNode fill:#FFFFFF,stroke:#0F172A,stroke-width:3.5px,color:#0F172A,font-weight:bold;
    classDef extSysNode fill:#FEF3C7,stroke:#D97706,stroke-width:2.5px,color:#0F172A,font-weight:bold;

    subgraph Boundary [" SCMS SYSTEM BOUNDARY "]
        SCMS["SCMS Core System"]:::systemNode
    end

    %% Human User Roles (Two Roles Only)
    Faculty["Faculty Staff"]:::actorNode
    AcadHead["Academic Head"]:::actorNode

    %% External Campus Systems
    FMS["Faculty Management System (FMS)"]:::extSysNode
    CCMS["Citizen's Charter Monitoring System (CCMS)"]:::extSysNode

    %% Interactions
    Faculty -- "Syllabus Submissions & Revisions" --> SCMS
    SCMS -- "Requirements & Review Status" --> Faculty

    AcadHead -- "Requirements & Term Deadlines" --> SCMS
    AcadHead -- "Review Decisions (Approve / Return)" --> SCMS
    SCMS -- "Live Compliance Dashboard & Audit Trail" --> AcadHead

    SCMS -- "Read-Only Profile & Subject Query" --> FMS
    FMS -- "Faculty Identity & Course Assignments" --> SCMS

    CCMS -- "Academic Term Calendar" --> SCMS
    SCMS -- "Compliance Summary Feed" --> CCMS

    linkStyle default stroke:#0284C7,stroke-width:2.5px;
```

### Context Boundary Description
* **Academic Head:** Configures term syllabus requirements and deadlines per academic program, reviews submitted syllabi (Approve or Return with comments), monitors live compliance status, and inspects the audit trail.
* **Faculty Staff:** Views active program requirements and deadlines, uploads or enters syllabi, receives review feedback, and resubmits revisions.
* **Faculty Management System (FMS):** External read-only source for verified faculty profiles and assigned subject codes.
* **Citizen's Charter Monitoring System (CCMS):** Ingests official academic term calendar dates and receives consolidated compliance summary feeds.

---

## 2. Dataflow Diagram (Level 1 DFD)

The Level 1 Dataflow Diagram illustrates data movement between external entities, core operational processes, and polyglot data stores.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'darkMode': false, 'background': '#FFFFFF', 'primaryColor': '#F0FDF4', 'primaryTextColor': '#0F172A', 'primaryBorderColor': '#1E293B', 'lineColor': '#0284C7' }}}%%
flowchart TB
    classDef procNode fill:#DCFCE7,stroke:#15803D,stroke-width:2.5px,color:#0F172A,font-weight:bold;
    classDef storeNode fill:#E0F2FE,stroke:#0284C7,stroke-width:2.5px,color:#0F172A,font-weight:bold;
    classDef extNode fill:#FEF3C7,stroke:#D97706,stroke-width:2.5px,color:#0F172A,font-weight:bold;
    classDef gateNode fill:#F3E8FF,stroke:#7C3AED,stroke-width:2.5px,color:#0F172A,font-weight:bold;

    User["Academic Head / Faculty Staff"]:::extNode
    Gateway["0.0 API Gateway"]:::gateNode

    %% Operational Processes
    P1["1.0 Identity & Access"]:::procNode
    P2["2.0 Requirements & Deadlines"]:::procNode
    P3["3.0 Submission & Storage"]:::procNode
    P4["4.0 Review & Audit Trail"]:::procNode
    P5["5.0 Live Compliance"]:::procNode

    %% Polyglot Data Stores
    D1[("D1: PostgreSQL DB")]:::storeNode
    D2[("D2: MongoDB GridFS")]:::storeNode
    D3[("D3: Redis Bus & Cache")]:::storeNode

    %% External Systems
    FMS_Ext["FMS (External)"]:::extNode
    CCMS_Ext["CCMS (External)"]:::extNode

    %% Ingress Flows
    User -->|HTTP Requests| Gateway
    Gateway -->|Auth Requests| P1
    Gateway -->|Requirement Requests| P2
    Gateway -->|Submission Requests| P3
    Gateway -->|Review Requests| P4
    Gateway <-->|Live WebSocket Stream| P5

    %% Process & Data Store Flows
    P1 <--> D1
    P1 <--> D3
    P1 -.->|Read Profile & Tags| FMS_Ext

    P2 --> D1
    P2 -.->|Read Term Calendar| CCMS_Ext

    P3 --> D1
    P3 --> D2
    P3 --> D3

    P4 --> D1
    P4 --> D3

    P5 <--> D1
    P5 <--> D3
    P5 -.->|Push Summary Feed| CCMS_Ext

    linkStyle default stroke:#0284C7,stroke-width:2.5px;
```

### Data Stores Breakdown
* **D1 (PostgreSQL DB):** ACID transactional authority for user credentials, roles, program requirements, deadlines, submission status machine, and immutable audit logs.
* **D2 (MongoDB GridFS):** High-capacity binary chunk storage for PDF and DOCX syllabus files and flexible rubric form schemas.
* **D3 (Redis Bus & Cache):** In-memory WebSocket pub/sub live event dispatcher, BullMQ job queue for overdue evaluations, and FMS offline fallback cache.

---

## 3. Entity Relationship Diagram (ERD)

The ERD models the relational and document data architecture. Boxes display essential primary keys (PK), foreign keys (FK), and core discriminators without visual clutter.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'darkMode': false, 'background': '#FFFFFF', 'primaryColor': '#FFFFFF', 'primaryTextColor': '#0F172A', 'primaryBorderColor': '#0F172A', 'lineColor': '#0284C7', 'textColor': '#0F172A' }}}%%
erDiagram
    USERS ||--o{ SUBMISSIONS : "submits"
    USERS ||--o{ REVIEW_DECISIONS : "reviews"
    USERS ||--o{ AUDIT_LOGS : "acts"
    ROLES ||--o{ USERS : "assigned"
    PROGRAMS ||--o{ REQUIREMENT_DEFINITIONS : "specifies"
    TERM_CALENDARS ||--o{ REQUIREMENT_DEFINITIONS : "schedules"
    REQUIREMENT_DEFINITIONS ||--o{ SUBMISSIONS : "fulfills"
    SUBMISSIONS ||--o{ REVIEW_DECISIONS : "evaluates"
    GRIDFS_FILES ||--o{ SUBMISSIONS : "stores file"

    USERS {
        uuid id PK
        string email UK
        uuid role_id FK
    }

    ROLES {
        uuid id PK
        string role_code "ACADEMIC_HEAD, FACULTY_STAFF"
    }

    PROGRAMS {
        uuid id PK
        string code "BSIT, BSCS, etc."
    }

    TERM_CALENDARS {
        uuid id PK
        string academic_year
        string semester
    }

    REQUIREMENT_DEFINITIONS {
        uuid id PK
        uuid program_id FK
        uuid term_calendar_id FK
        timestamp deadline_at
    }

    SUBMISSIONS {
        uuid id PK
        uuid requirement_id FK
        uuid faculty_id FK
        string current_status
    }

    REVIEW_DECISIONS {
        uuid id PK
        uuid submission_id FK
        uuid academic_head_id FK
        string decision "APPROVED, RETURNED"
    }

    AUDIT_LOGS {
        bigserial id PK
        uuid actor_id FK
        string action_type
    }

    GRIDFS_FILES {
        object_id id PK
        string filename
    }
```

### Schema Field Reference Table

| Entity | Full Attribute Set | Purpose |
| :--- | :--- | :--- |
| **USERS** | `id`, `email`, `password_hash`, `first_name`, `last_name`, `fms_faculty_id`, `role_id`, `is_active`, `created_at` | Local user accounts (No SSO dependency) |
| **ROLES** | `id`, `role_code`, `description` | Strict two-role scope (`ACADEMIC_HEAD`, `FACULTY_STAFF`) |
| **PROGRAMS** | `id`, `code`, `name` | Academic programs (e.g., BSIT, BSCS, BSED, etc.) |
| **TERM_CALENDARS** | `id`, `academic_year`, `semester`, `start_date`, `end_date` | Term boundaries ingested from CCMS or set manually |
| **REQUIREMENT_DEFINITIONS** | `id`, `program_id`, `term_calendar_id`, `requirement_type`, `title`, `deadline_at`, `status` | Configured submission quotas and term deadlines |
| **SUBMISSIONS** | `id`, `requirement_id`, `faculty_id`, `subject_code`, `subject_title`, `current_status`, `is_overdue`, `mongo_file_id`, `submitted_at`, `approved_at` | Central state machine record tracking direct compliance |
| **REVIEW_DECISIONS** | `id`, `submission_id`, `academic_head_id`, `decision`, `comments`, `decided_at` | Single-reviewer evaluation record |
| **AUDIT_LOGS** | `id`, `actor_id`, `action_type`, `entity_name`, `entity_id`, `client_ip`, `created_at` | Append-only immutable log for all administrative and user actions |
| **GRIDFS_FILES** | `_id`, `filename`, `length`, `chunkSize`, `uploadDate`, `contentType` | Binary storage for syllabus PDFs and Word documents |

---

## 4. Use Case Diagram

The Use Case Diagram displays capabilities granted exclusively to the **Academic Head** and **Faculty Staff**, alongside external integration hooks.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'darkMode': false, 'background': '#FFFFFF', 'primaryColor': '#EFF6FF', 'primaryTextColor': '#0F172A', 'primaryBorderColor': '#1E293B', 'lineColor': '#0284C7' }}}%%
flowchart LR
    classDef actorNode fill:#DBEAFE,stroke:#1D4ED8,stroke-width:2.5px,color:#0F172A,font-weight:bold;
    classDef ucNode fill:#FFFFFF,stroke:#334155,stroke-width:2px,color:#0F172A,font-weight:bold;
    classDef extNode fill:#FEF3C7,stroke:#D97706,stroke-width:2.5px,color:#0F172A,font-weight:bold;

    Faculty(("Faculty Staff")):::actorNode
    AcadHead(("Academic Head")):::actorNode
    FMS_Sys(("FMS")):::extNode
    CCMS_Sys(("CCMS")):::extNode

    subgraph SCMS [" SCMS System Capabilities "]
        UC1["Sign In"]:::ucNode
        UC2["Submit Syllabus"]:::ucNode
        UC3["Revise Syllabus"]:::ucNode
        UC4["View Submissions"]:::ucNode
        UC5["Set Requirements"]:::ucNode
        UC6["Review Submission"]:::ucNode
        UC7["Add Comments"]:::ucNode
        UC8["View Live Dashboard"]:::ucNode
        UC9["Inspect Audit Trail"]:::ucNode
        UC10["Query Faculty Info"]:::ucNode
        UC11["Sync Calendar"]:::ucNode
        UC12["Export Summary Feed"]:::ucNode
    end

    Faculty --> UC1
    Faculty --> UC2
    Faculty --> UC3
    Faculty --> UC4

    AcadHead --> UC1
    AcadHead --> UC5
    AcadHead --> UC6
    AcadHead --> UC8
    AcadHead --> UC9

    UC6 -. "<<include>>" .-> UC7
    UC2 -. "<<include>>" .-> UC10

    UC10 <--> FMS_Sys
    UC11 <--> CCMS_Sys
    UC12 --> CCMS_Sys

    linkStyle default stroke:#0284C7,stroke-width:2.5px;
```

---

## 5. System Architecture Diagram (Multi-Tier)

This diagram details the physical and logical multi-tier microservices architecture. Boxes contain concise identifiers; tier details and responsibilities are described below.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#FFFFFF', 'primaryColor': '#F8FAFC', 'primaryTextColor': '#0F172A', 'primaryBorderColor': '#1E293B', 'lineColor': '#0284C7' }}}%%
flowchart TB
    classDef client fill:#DBEAFE,stroke:#1D4ED8,stroke-width:2.5px,color:#0F172A,font-weight:bold;
    classDef gate fill:#F3E8FF,stroke:#7C3AED,stroke-width:2.5px,color:#0F172A,font-weight:bold;
    classDef service fill:#DCFCE7,stroke:#16A34A,stroke-width:2.5px,color:#0F172A,font-weight:bold;
    classDef db fill:#FEE2E2,stroke:#DC2626,stroke-width:2.5px,color:#0F172A,font-weight:bold;
    classDef ext fill:#FEF3C7,stroke:#D97706,stroke-width:2.5px,color:#0F172A,font-weight:bold;

    subgraph Client_Tier [" CLIENT PRESENTATION TIER "]
        ReactSPA["React SPA"]:::client
    end

    subgraph Gateway_Tier [" INGRESS & ROUTING TIER "]
        APIGateway["Server 0: API Gateway"]:::gate
    end

    subgraph Services_Tier [" APPLICATION SERVICES TIER "]
        S1["Server 1: Identity & Access"]:::service
        S2["Server 2: Academic Requirements"]:::service
        S3["Server 3: Submission & Storage"]:::service
        S4["Server 4: Review, Approval & Audit"]:::service
        S5["Server 5: Live Compliance"]:::service
    end

    subgraph Data_Tier [" PERSISTENCE & CACHING TIER "]
        PostgresDB[("PostgreSQL DB")]:::db
        MongoDB[("MongoDB GridFS")]:::db
        RedisServer[("Redis Cluster")]:::db
    end

    subgraph External_Tier [" EXTERNAL CAMPUS SYSTEMS "]
        ExtFMS["FMS (External)"]:::ext
        ExtCCMS["CCMS (External)"]:::ext
    end

    ReactSPA -->|HTTPS / REST| APIGateway
    ReactSPA <-->|WSS Live Stream| APIGateway

    APIGateway --> S1
    APIGateway --> S2
    APIGateway --> S3
    APIGateway --> S4
    APIGateway <--> S5

    S1 --> PostgresDB
    S1 --> RedisServer
    S2 --> PostgresDB
    S3 --> PostgresDB
    S3 --> MongoDB
    S3 --> RedisServer
    S4 --> PostgresDB
    S4 --> RedisServer
    S5 --> PostgresDB
    S5 --> RedisServer

    S1 -.->|Read-Only Lookup| ExtFMS
    S2 -.->|Ingest Calendar| ExtCCMS
    S5 -.->|Push Summary Feed| ExtCCMS

    linkStyle default stroke:#0284C7,stroke-width:2.5px;
```

### Microservices Responsibility Matrix

| Service | Host Port | Role & Key Responsibilities |
| :--- | :--- | :--- |
| **Server 0: API Gateway** | `:3000` | Ingress TLS termination, rate limiting, JWT token validation, WebSocket live compliance stream routing. |
| **Server 1: Identity & Access** | `:3001` | Local user authentication (Argon2id), RBAC enforcement for 2 roles, read-only FMS profile lookup adapter. |
| **Server 2: Requirements Service** | `:3002` | Program requirements definition, term deadlines management, CCMS academic calendar synchronization. |
| **Server 3: Submission & Storage** | `:3003` | Multipart file uploads (PDF/DOCX), MongoDB GridFS file handling, status transitions, Redis event publishing. |
| **Server 4: Review, Approval & Audit** | `:3004` | Academic Head single-reviewer workflow (Approve / Return), review comment storage, append-only immutable audit trail. |
| **Server 5: Live Compliance** | `:3005` | Real-time status counts aggregation, BullMQ overdue evaluation cron, CCMS summary feed dispatcher. |

---

## 6. Workflow Diagram (Submission Lifecycle & State Machine)

The Submission Lifecycle Diagram defines the deterministic transitions of a syllabus from publication through compliance, including the overdue trigger and revision cycles.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#FFFFFF', 'primaryColor': '#EFF6FF', 'primaryTextColor': '#0F172A', 'primaryBorderColor': '#1E293B', 'lineColor': '#0284C7' }}}%%
flowchart TD
    classDef startNode fill:#E2E8F0,stroke:#475569,stroke-width:2.5px,color:#0F172A,font-weight:bold;
    classDef stateNode fill:#DBEAFE,stroke:#2563EB,stroke-width:2.5px,color:#0F172A,font-weight:bold;
    classDef decNode fill:#FEF3C7,stroke:#D97706,stroke-width:2.5px,color:#0F172A,font-weight:bold;
    classDef successNode fill:#DCFCE7,stroke:#16A34A,stroke-width:2.5px,color:#0F172A,font-weight:bold;
    classDef returnNode fill:#FEE2E2,stroke:#DC2626,stroke-width:2.5px,color:#0F172A,font-weight:bold;

    Start([Requirement Published]):::startNode
    NotSubmitted["Not Submitted"]:::stateNode
    Start --> NotSubmitted

    %% Overdue Timer Evaluation
    CronCheck{"Deadline Passed?"}:::decNode
    NotSubmitted -.-> CronCheck
    CronCheck -- "Yes & Unapproved" --> Overdue["Overdue"]:::returnNode
    Overdue -.-> NotSubmitted

    %% Submission Event
    NotSubmitted -->|Faculty Submits| Submitted["Submitted"]:::stateNode

    %% Academic Head Action
    Submitted -->|Academic Head Opens| UnderReview["Under Review"]:::stateNode

    UnderReview --> DecisionNode{"Review Decision"}:::decNode

    %% Approval Path
    DecisionNode -- "Approve" --> Approved["Approved"]:::successNode
    Approved --> EndSuccess([Complied]):::startNode

    %% Return Path
    DecisionNode -- "Return" --> Returned["Returned"]:::returnNode

    Returned -->|Faculty Revises| Resubmitted["Resubmitted"]:::stateNode
    Resubmitted --> UnderReview

    linkStyle default stroke:#0284C7,stroke-width:2.5px;
```

### Direct Compliance Status Definitions
* **`Not Submitted`:** Requirement has been published by the Academic Head; no file or form has been submitted yet by the faculty member.
* **`Submitted`:** Initial syllabus file or rubric form uploaded by Faculty Staff; awaiting evaluation.
* **`Under Review`:** Academic Head has opened the submission for review.
* **`Returned`:** Academic Head evaluated the submission, determined revisions are needed, and recorded constructive comments.
* **`Resubmitted`:** Faculty Staff addressed feedback and uploaded a revised syllabus version.
* **`Approved`:** Academic Head accepted the syllabus; submission is marked **Complied**.
* **`Overdue`:** The configured term deadline elapsed while the submission was not in an `Approved` state.

---

## 7. Integrated Architecture Diagram (Network & Trust Boundaries)

This diagram outlines security zones, network perimeters, ingress trust boundaries, and circuit breaker protection between internal services and external campus APIs.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'darkMode': false, 'background': '#FFFFFF', 'primaryColor': '#F8FAFC', 'primaryTextColor': '#0F172A', 'primaryBorderColor': '#1E293B', 'lineColor': '#0284C7' }}}%%
flowchart TB
    classDef client fill:#F1F5F9,stroke:#64748B,stroke-width:2.5px,color:#0F172A,font-weight:bold;
    classDef dmz fill:#FDF4FF,stroke:#A21CAF,stroke-width:2.5px,color:#0F172A,font-weight:bold;
    classDef app fill:#F0FDF4,stroke:#15803D,stroke-width:2.5px,color:#0F172A,font-weight:bold;
    classDef data fill:#EFF6FF,stroke:#1D4ED8,stroke-width:2.5px,color:#0F172A,font-weight:bold;
    classDef ext fill:#FEF3C7,stroke:#B45309,stroke-width:2.5px,color:#0F172A,font-weight:bold;

    subgraph Zone_Public [" PUBLIC / CAMPUS CLIENT ACCESS "]
        Clients["Web Client (React SPA)"]:::client
    end

    subgraph Zone_DMZ [" SCMS PERIMETER (DMZ) "]
        WAF_Gateway["API Gateway & WAF"]:::dmz
    end

    subgraph Zone_Private [" SCMS SECURE APPLICATION ZONE "]
        S1["Server 1: Identity & Access"]:::app
        S2["Server 2: Requirements"]:::app
        S3["Server 3: Submission & Storage"]:::app
        S4["Server 4: Review & Audit"]:::app
        S5["Server 5: Live Compliance"]:::app
        CircuitBreaker["Circuit Breaker"]:::app
    end

    subgraph Zone_Data [" SCMS SECURE DATA ZONE "]
        PG_DB[("PostgreSQL")]:::data
        Mongo_DB[("MongoDB (GridFS)")]:::data
        Redis_Store[("Redis Cluster")]:::data
    end

    subgraph Zone_FMS [" FMS NETWORK BOUNDARY "]
        FMS_API["FMS REST API"]:::ext
    end

    subgraph Zone_CCMS [" CCMS NETWORK BOUNDARY "]
        CCMS_API["CCMS REST API"]:::ext
    end

    %% Ingress Traffic
    Clients -->|HTTPS & WSS| WAF_Gateway

    %% Service Routing
    WAF_Gateway --> S1
    WAF_Gateway --> S2
    WAF_Gateway --> S3
    WAF_Gateway --> S4
    WAF_Gateway <--> S5

    %% Internal Data Persistence
    S1 --> PG_DB
    S1 --> Redis_Store
    S2 --> PG_DB
    S3 --> PG_DB
    S3 --> Mongo_DB
    S3 --> Redis_Store
    S4 --> PG_DB
    S4 --> Redis_Store
    S5 --> PG_DB
    S5 --> Redis_Store

    %% External Resilient Integration
    S1 --> CircuitBreaker
    S2 --> CircuitBreaker
    S5 --> CircuitBreaker

    CircuitBreaker -->|Read-Only Queries| FMS_API
    CircuitBreaker <-->|Calendar Sync / Push Feeds| CCMS_API
    CircuitBreaker -.->|Fallback Cache on Outage| Redis_Store

    linkStyle default stroke:#0284C7,stroke-width:2.5px;
```

### Security & Perimeter Specifications
* **Perimeter Zone (DMZ):** Terminates HTTPS/TLS 1.3, executes Web Application Firewall (WAF) rule sets, mitigates brute-force attacks via rate limiters, and authenticates JWT cookie signatures before passing traffic inward.
* **Secure Application Zone:** Microservices run on an isolated container network. Services communicate through internal REST/gRPC endpoints and publish state events onto Redis.
* **Secure Data Zone:** PostgreSQL, MongoDB, and Redis are completely unexposed to public interfaces and accept connections exclusively from authenticated backend microservices.
* **External Integration Resilience:** The Circuit Breaker protects against FMS or CCMS latency or downtime. If an external system fails, cached data in Redis is served with graceful degradation flags.
