# SCMS UI Design System & Frontend Architecture

**System:** Syllabus Compliance Monitoring System (SCMS)  
**Institution:** Polytechnic University of the Philippines — Quezon City Campus (PUPQC)  
**Theme:** PUP Maroon & Gold Signature Academic Theme  
**Architecture:** Hybrid Tailwind CSS v3 + Radix UI (shadcn style) + Material UI (MUI v9 / Emotion) for Data Tables & Real-Time Live Views

---

## 1. UI Tech Stack & Dependencies

The SCMS frontend utilizes a **hybrid component architecture**:
* **Tailwind CSS v3 + Radix UI Primitives:** Powers rapid layout development, dialogs, dropdowns, and form controls with zero bloat.
* **Material UI (MUI v9) + Emotion:** Powers advanced academic audit tables, chips, tooltips, and data-dense administrative dashboards.
* **Real-Time Client:** WebSockets / Server-Sent Events for the instant, live compliance dashboard without manual page refreshes.
* **Icons:** `lucide-react` (clean, consistent 16px/20px geometric stroke icons).
* **State & Forms:** `react-router-dom`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`, `date-fns`.

---

## 2. Design System Tokens & Color Palette

| Token Name | Light Mode Hex | Purpose in SCMS |
| :--- | :--- | :--- |
| **PUP Maroon (Primary)** | `#580000` | Sidebar background, table header bands, primary buttons, branding |
| **PUP Gold (Secondary)** | `#C8960C` | Active navigation borders, highlight tags, secondary buttons |
| **Off-White Canvas** | `#F5F7FA` | Page background (`bg-background`) |
| **Surface / Card** | `#FFFFFF` | Cards, modals, topbar, container surfaces |
| **Success / Approved** | `#1D9E75` (Bg: `#EAF3DE`) | Approved syllabus status indicator |
| **Warning / Returned** | `#BA7517` (Bg: `#FAEEDA`) | Returned submissions requiring revision |
| **Error / Overdue** | `#E24B4A` (Bg: `#FCEBEB`) | Overdue syllabus alerts, missed term deadlines |
| **Info / Navy** | `#1B3A6B` (Bg: `#E6F1FB`) | FMS profile lookup badges, Academic Head role tags |
| **Border / Line** | `#E2E8F0` / `#E5E7EB` | Dividers, card borders, form input outlines |
| **Text Primary** | `#0F172A` / `#1F2937` | Headings, table cells, primary readable text |
| **Text Muted** | `#64748B` / `#6B7280` | Breadcrumbs, timestamps, audit metadata, helper text |

---

## 3. Typography System

The project pairs a geometric sans-serif for responsive UI controls with a high-contrast academic serif for page titles:
* **UI & Controls Font:** `"DM Sans", sans-serif`
* **Display & Page Titles:** `"DM Serif Display", serif`

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
```

---

## 4. SCMS Direct Status Badge Mapping

In SCMS, compliance is represented directly by the submission status itself. There is no separate compliance score or percentage:

| SCMS Lifecycle Status | Label | Badge Style | Icon |
| :--- | :--- | :--- | :--- |
| `NOT_SUBMITTED` | Not Submitted | Background: `#f3f4f6`, Text: `#4b5563` | `Clock` |
| `SUBMITTED` | Submitted | Background: `#eff6ff`, Text: `#2563eb` | `Upload` |
| `UNDER_REVIEW` | Under Review | Background: `#eff6ff`, Text: `#1d4ed8` | `PlayCircle` |
| `RETURNED` | Returned for Revision | Background: `#FAEEDA`, Text: `#BA7517` | `AlertCircle` |
| `RESUBMITTED` | Resubmitted | Background: `#EDE9FE`, Text: `#7C3AED` | `RefreshCw` |
| `APPROVED` | Approved | Background: `#EAF3DE`, Text: `#1D9E75` | `CheckCircle2` |
| `OVERDUE` | Overdue | Background: `#FCEBEB`, Text: `#E24B4A` | `AlertTriangle` |

---

## 5. Layout Architecture (Two Roles Only)

* **`AppLayout.tsx`:** Provides responsive drawer state and breakpoint management.
* **`Sidebar.tsx`:** Scoped to the **two user roles**:
  * **Academic Head:** Live Compliance View, Requirements & Deadlines, Review Queue, Action Audit Trail, FMS/CCMS Integrations.
  * **Faculty Staff:** Assigned Requirements, Upload/Revise Syllabus, Review Status & Comments.
* **`TopBar.tsx`:** 64px white header bar with breadcrumbs, live WebSocket connection status pill, role badge (`Academic Head` or `Faculty Staff`), and term indicator.
* **`PupFooter.tsx`:** Signature maroon footer band with gold border (`border-top: 2px solid #C8960C`) displaying PUPQC institutional branding and audit compliance notes.
