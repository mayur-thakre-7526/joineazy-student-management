# Joineazy - Student, Course, Group & Assignment Management System

A production-quality, role-based academic management platform designed for Students and Professors (Admins). Enables students to enroll in academic courses, form collaborative groups, receive individual or team assignments, access external OneDrive submission portals, confirm submissions through a two-step verification workflow, and track team progress with reflected member acknowledgments. Enables professors to create and manage academic courses, publish targeted deliverables, inspect real-time submission rosters with status filters, and monitor analytical completion metrics.

---

## 🚀 Live Application & Evaluation Summary

| Resource | Details / URL |
|---|---|
| **Live Web App (Current Deployment)** | [https://joineazy-app.onrender.com](https://joineazy-app.onrender.com) *(Round 1 production baseline; Round 2 deployment preflight completed)* |
| **GitHub Repository** | [https://github.com/mayur-thakre-7526/joineazy-student-management](https://github.com/mayur-thakre-7526/joineazy-student-management) |
| **Round 2 Release Status** | **Production-Ready & Fully Verified** (Ready for merge to `main` and Phase 5B deployment) |
| **Backend Test Coverage** | **202 / 202 Automated Assertions Passing (100%)** across 9 test suites |
| **Live HTTP QA Verification**| **32 / 32 Local HTTP Integration Scenarios Passing (100%)** |
| **Visual QA Verification** | **17 Authentic Browser Screenshots** across 5 responsive breakpoints (`1440px`, `1024px`, `768px`, `375px`, `320px`) |

---

## 📸 Executive Visual Previews

Here is an immediate visual walkthrough of the Joineazy system running in real browser viewports:

| Desktop (1440px) — Modern SaaS Homepage | Desktop (1440px) — Student Academic Dashboard |
|:---:|:---:|
| ![Homepage Desktop](docs/screenshots/01_homepage_desktop_1440px.png) | ![Student Dashboard Desktop](docs/screenshots/06_student_dashboard_desktop_1440px.png) |
| *Hero section with role-based navigation and registration CTA* | *5 coursework metric cards, enrolled courses, and team progress* |

| Desktop (1440px) — Professor Oversight Console | Desktop (1440px) — Group Leader Acknowledgment Modal |
|:---:|:---:|
| ![Professor Dashboard Desktop](docs/screenshots/09_professor_dashboard_desktop_1440px.png) | ![Assignment Details Modal](docs/screenshots/15_assignment_details_group_leader_1440px.png) |
| *6 overview metrics, course breakdown, and student status roster* | *Leader-only team acknowledgment with live roster preview* |

> *Full gallery containing all 17 responsive screenshot captures across Tablet (768px), Mobile (375px), and Ultra-Small (320px) viewports is available in the [Visual Verification Gallery](#-real-browser-visual-verification--screenshot-gallery) below.*

---

## ⚖️ Round 1 vs. Round 2 Feature Matrix

| Functional Area | Round 1 (Initial Release) | Round 2 (Current Production Ready) |
|---|---|---|
| **Academic Courses** | None (flat, unorganized assignments) | **Full Course Management**: Professors author courses with unique codes (`LOWER(course_code)` index); students self-enroll via enrollment codes. |
| **Course Assignment Scope** | Global or group-targeted only | **Course-Scoped Deliverables**: Assignments bind to specific courses; students must be enrolled to access deliverables. Full backwards compatibility for legacy assignments. |
| **Submission Types** | Individual submissions only | **Individual & Group Types**: Explicit `INDIVIDUAL` or `GROUP` submission models with dedicated workflows. |
| **Team Submissions** | Per-student self-declaration only | **Leader-Only Acknowledgment**: Only designated group leaders (`groups.created_by`) can acknowledge team deliverables; non-leaders blocked with `HTTP 403`. |
| **Member Status Reflection** | None (each member had to confirm) | **Instant Member Reflection**: Single leader acknowledgment instantly marks all active group members as `Confirmed` (or `Confirmed Late`). |
| **Forensic Audit Snapshots** | No historical membership capture | **Relational Member Snapshots**: `group_submission_member_snapshots` records an immutable audit snapshot of eligible members at submission time. |
| **Assignment Lifecycle (CRUD)**| Create, Read, Update only | **Complete CRUD with Safe Delete**: Professors can Delete assignments; requires authoring ownership (`403` for other professors) and cascades atomically. |
| **Submission Status Filtering** | Basic listing without filters | **Multi-Criteria Filter Bar**: Real-time status filtering (`All`, `Confirmed`, `Pending`, `Late`) and live multi-attribute search across students and groups. |
| **UI / UX Architecture** | Developer/testing-oriented cards | **Modern Academic SaaS Design**: Light navy/slate theme, interactive password toggles, 5-stat student dashboard, 6-stat faculty console, mobile touch targets. |
| **Automated Test Coverage** | 134 automated assertions | **202 Automated Assertions** across 9 test suites + 32 live HTTP QA scenarios with 100% pass rate. |

---

## ⚡ Quick Start: Running Locally

### Prerequisites
- Node.js 18+ (ES Modules)
- Docker Desktop (for local PostgreSQL 16) or local PostgreSQL instance

### 1. Clone & Configure Environment
```bash
git clone https://github.com/mayur-thakre-7526/joineazy-student-management.git
cd joineazy-student-management
```

### 2. Start PostgreSQL via Docker Compose
```bash
docker compose up -d db
```

### 3. Install Dependencies & Run Database Migrations
```bash
# Install backend dependencies
npm --prefix server install

# Install frontend dependencies
npm --prefix client install

# Run database migrations (001, 002, 003)
npm --prefix server run migrate

# Seed initial administrator account
npm --prefix server run seed:admin
```

### 4. Launch Application in Development Mode
```bash
# Terminal 1: Backend Express API (Runs on port 5000)
npm --prefix server run dev

# Terminal 2: Frontend Vite React App (Runs on port 5173)
npm --prefix client run dev
```
Open `http://localhost:5173` in your browser. All API requests proxy seamlessly to `http://localhost:5000/api`.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router 6, Vite, Tailwind CSS, Lucide Icons |
| **Backend** | Node.js (ES Modules), Express.js, Zod, Bcrypt.js, JsonWebToken |
| **Database** | PostgreSQL 16 (Relational Schema & Versioned SQL Migrations) |
| **Authentication & Security** | JWT with HTTP-only Cookies, Strict CSRF Token & Origin Validation, In-Memory Rate Limiting, Role-Based Access Control (`STUDENT`, `ADMIN`) |
| **Containerization & Deployment**| Multi-stage Docker, Docker Compose, Render Blueprint (`render.yaml`), Neon PostgreSQL (SSL) |
| **Security & Utilities** | Helmet, CORS, Cookie-Parser, Dotenv, PG Connection Pool, Express Trust Proxy |

---

## 📁 Repository Structure

```
joineazy-student-management/
├── .env.example             # Template for shared environment variables
├── .gitignore               # Multi-layer git ignore rules
├── docker-compose.yml       # Local multi-container orchestration (DB, API, Client)
├── Dockerfile               # Production multi-stage Dockerfile (Vite build + Express static runner)
├── render.yaml              # Render blueprint for unified Web Service deployment
├── README.md                # Project documentation, ER diagrams, and deployment guide
├── client/                  # Frontend Vite + React application
│   ├── .dockerignore
│   ├── .env.example
│   ├── Dockerfile           # Standalone client container (Node + Nginx)
│   ├── index.html
│   ├── nginx.conf           # Production Nginx reverse-proxy & routing config
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       ├── main.jsx
│       ├── components/
│       │   ├── common/
│       │   │   ├── Navbar.jsx
│       │   │   └── ProtectedRoute.jsx
│       │   ├── courses/
│       │   │   └── CourseEnrollmentForm.jsx
│       │   └── groups/
│       │       ├── GroupMembersList.jsx
│       │       └── InviteMemberForm.jsx
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── pages/
│       │   ├── AdminDashboardPage.jsx     # Professor coursewide analytics & taught courses
│       │   ├── CreateGroupPage.jsx
│       │   ├── DashboardIndexPage.jsx     # Role-aware dashboard dispatcher
│       │   ├── HomePage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── MyGroupPage.jsx
│       │   ├── MyInvitationsPage.jsx
│       │   ├── RegisterPage.jsx
│       │   ├── StudentDashboardPage.jsx   # Student coursework progress & enrolled course cards
│       │   ├── courses/
│       │   │   ├── CoursesIndexPage.jsx       # Role-aware course directory dispatcher
│       │   │   ├── CreateCoursePage.jsx       # Professor course creation form
│       │   │   ├── ProfessorCoursesPage.jsx   # Professor taught courses management
│       │   │   ├── StudentCourseDetailsPage.jsx # Enrolled course assignments view
│       │   │   └── StudentCoursesPage.jsx     # Student course catalog and enrollment portal
│       │   └── assignments/
│       │       ├── AdminAssignmentsPage.jsx   # Professor assignment dashboard
│       │       ├── AssignmentDetailsPage.jsx  # Detail view with two-step modal confirmation & OneDrive link
│       │       ├── AssignmentsIndexPage.jsx   # Role-aware route dispatcher
│       │       ├── CreateAssignmentPage.jsx   # Assignment creation form with multi-group targeting
│       │       ├── EditAssignmentPage.jsx     # Assignment editor with atomic retargeting
│       │       └── StudentAssignmentsPage.jsx # Student assignment dashboard with deadline tracking
│       └── services/
│           └── api.js
└── server/                  # Backend Node.js + Express API
    ├── .dockerignore
    ├── .env.example
    ├── Dockerfile           # Standalone backend container (Alpine + non-root user)
    ├── package.json
    └── src/
        ├── app.js           # Express application configuration (static serving + SPA fallback)
        ├── index.js         # Server entrypoint & graceful shutdown (0.0.0.0 binding)
        ├── config/
        │   ├── db.js        # PostgreSQL pool & connection diagnostics (with SSL support)
        │   └── env.js       # Environment validation and defaults
        ├── controllers/
        │   ├── adminController.js
        │   ├── analyticsController.js  # Course analytics and assignment submission tracking
        │   ├── assignmentController.js # Assignment CRUD, course scoping, and student visibility
        │   ├── authController.js
        │   ├── courseController.js     # Course CRUD, enrollment, and taught courses
        │   ├── groupController.js
        │   ├── healthController.js
        │   ├── invitationController.js
        │   ├── readyController.js
        │   └── submissionController.js # Student two-step confirmation & progress endpoints
        ├── database/
        │   ├── migrate.js   # Transactional migration runner
        │   └── migrations/
        │       ├── 001_initial_schema.sql
        │       ├── 002_courses_and_submission_types.sql # Courses, enrollments, assignment extensions
        │       └── 003_group_submission_acknowledgments.sql # Leader acknowledgment and member snapshots
        ├── middleware/
        │   ├── authMiddleware.js       # JWT authentication & RBAC guards
        │   ├── csrfMiddleware.js       # CSRF token generation & dynamic origin validation
        │   ├── errorHandler.js
        │   ├── rateLimiter.js          # In-memory IP rate limiter for login
        │   └── requestLogger.js
        ├── models/
        │   ├── assignmentModel.js      # Assignment transactions, course joins, and visibility queries
        │   ├── courseModel.js          # Course creation, enrollments, and membership tracking
        │   ├── groupModel.js           # Group, membership, and invitation queries
        │   ├── submissionModel.js      # Relational submission confirmations & analytical aggregations
        │   └── userModel.js            # User authentication & RBAC queries
        ├── routes/
        │   ├── adminRoutes.js          # Admin role routes, analytics & submission tracking
        │   ├── assignmentRoutes.js     # Protected assignment routes & confirmation endpoints
        │   ├── authRoutes.js           # Auth routes with rate-limited login
        │   ├── courseRoutes.js         # Protected course management and enrollment routes
        │   ├── groupRoutes.js
        │   ├── healthRoutes.js
        │   ├── index.js
        │   ├── invitationRoutes.js
        │   ├── readyRoutes.js
        │   └── studentRoutes.js        # Student coursework progress routes
        ├── scripts/
        │   ├── seedAdmin.js            # Idempotent admin account provisioning (production-hardened)
        │   ├── verifyPhase2.js         # Phase 2 test suite (15 scenarios)
        │   ├── verifyPhase3.js         # Phase 3 integration test suite (25 scenarios)
        │   ├── verifyPhase4.js         # Phase 4 integration test suite (34 scenarios)
        │   ├── verifyPhase5.js         # Phase 5 integration test suite (40 scenarios)
        │   ├── verifyE2EFlow.js        # Phase 6A End-to-End workflow test suite (20 scenarios)
        │   ├── verifyDashboardCases.js # Dashboard edge cases & regression suite (10 scenarios)
        │   ├── verifyRound2Phase1.js   # Round 2 Phase 1 course management test suite (20 scenarios)
        │   ├── verifyRound2Phase2.js   # Round 2 Phase 2 group acknowledgment test suite (30 scenarios)
        │   └── verifyCrudDelete.js     # Assignment CRUD and safe deletion test suite (8 scenarios)
        ├── utils/
        │   ├── logger.js
        │   └── token.js
        └── validators/
            ├── assignmentValidators.js # Zod schemas for assignments and OneDrive link validation
            ├── authValidators.js       # Zod schemas for register and login
            ├── courseValidators.js     # Zod schemas for course creation and enrollment
            └── groupValidators.js      # Zod schemas for groups and invitations
```

---

## 🗄️ Relational Database Architecture

The application uses PostgreSQL 16 with relational integrity, foreign keys, cascade rules, and partial indexes. All migrations are tracked and transactional.

```mermaid
erDiagram
    users ||--o{ groups : "creates"
    users ||--o{ group_members : "belongs to"
    users ||--o{ group_invitations : "invites / invited"
    users ||--o{ assignments : "creates (professor_id)"
    users ||--o{ submission_confirmations : "confirms"
    users ||--o{ courses : "creates (professor_id)"
    users ||--o{ course_enrollments : "enrolls"

    courses ||--o{ course_enrollments : "has enrollments"
    courses ||--o{ assignments : "contains"

    groups ||--o{ group_members : "has members"
    groups ||--o{ group_invitations : "issues invites"
    groups ||--o{ assignment_groups : "targeted by"

    assignments ||--o{ assignment_groups : "targets"
    assignments ||--o{ submission_confirmations : "receives"
    assignments ||--o{ group_submission_acknowledgments : "acknowledged via"
    groups ||--o{ group_submission_acknowledgments : "submitted by"
    users ||--o{ group_submission_acknowledgments : "leader confirms"

    group_submission_acknowledgments ||--o{ group_submission_member_snapshots : "snapshots"
    users ||--o{ group_submission_member_snapshots : "included member"

    users {
        uuid id PK
        varchar full_name
        varchar email UK "idx_users_email_lower"
        varchar password_hash
        varchar role "STUDENT | ADMIN"
        timestamptz created_at
        timestamptz updated_at
    }

    courses {
        uuid id PK
        varchar course_code UK "idx_courses_course_code_lower"
        varchar title
        text description
        uuid professor_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    course_enrollments {
        uuid id PK
        uuid course_id FK
        uuid student_id FK "UK (uq_student_course_enrollment)"
        timestamptz enrolled_at
    }

    groups {
        uuid id PK
        varchar name
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    group_members {
        uuid id PK
        uuid group_id FK
        uuid student_id FK "UK (uq_student_active_group)"
        timestamptz joined_at
    }

    group_invitations {
        uuid id PK
        uuid group_id FK
        uuid invited_student_id FK
        uuid invited_by FK
        varchar status "PENDING | ACCEPTED | REJECTED"
        timestamptz created_at
        timestamptz updated_at
    }

    assignments {
        uuid id PK
        uuid course_id FK "nullable"
        uuid professor_id FK
        varchar title
        text description
        timestamptz due_date
        varchar scope "ALL | SPECIFIC_GROUPS"
        varchar submission_type "INDIVIDUAL | GROUP"
        text onedrive_link
        timestamptz created_at
        timestamptz updated_at
    }

    assignment_groups {
        uuid id PK
        uuid assignment_id FK
        uuid group_id FK
    }

    submission_confirmations {
        uuid id PK
        uuid assignment_id FK
        uuid student_id FK
        timestamptz confirmed_at
    }

    group_submission_acknowledgments {
        uuid id PK
        uuid assignment_id FK
        uuid group_id FK "UK (uq_group_assignment_acknowledgment)"
        uuid acknowledged_by FK
        timestamptz acknowledged_at
        timestamptz created_at
    }

    group_submission_member_snapshots {
        uuid id PK
        uuid acknowledgment_id FK
        uuid assignment_id FK
        uuid group_id FK
        uuid student_id FK "UK (uq_acknowledgment_member_snapshot)"
        boolean is_leader
        timestamptz snapshotted_at
    }
```

### Database Integrity Rules
1. **Single Group Membership**: `group_members` enforces `CONSTRAINT uq_student_active_group UNIQUE (student_id)`. A student cannot belong to multiple groups simultaneously.
2. **Duplicate Pending Invitation Guard**: `group_invitations` has a partial unique index `idx_pending_invitation UNIQUE (group_id, invited_student_id) WHERE status = 'PENDING'`.
3. **Idempotent Submission Declaration**: `submission_confirmations` enforces `CONSTRAINT uq_submission_confirmation UNIQUE (assignment_id, student_id)`. Duplicate confirmation attempts return `HTTP 409 Conflict` (or are safely ignored via `ON CONFLICT DO NOTHING`).
4. **Targeted Assignment Join Table**: `assignment_groups` enforces `CONSTRAINT uq_assignment_group UNIQUE (assignment_id, group_id)`. Scope transitions atomically clear or recreate joins within a single transaction.
5. **Course Enrollment Uniqueness**: `course_enrollments` enforces `CONSTRAINT uq_student_course_enrollment UNIQUE (course_id, student_id)`. A student cannot be enrolled in the same course more than once.
6. **Case-Insensitive Course Code**: `courses` enforces unique `course_code` via unique index `idx_courses_course_code_lower UNIQUE (LOWER(course_code))`.
7. **Backward-Compatible Assignment Scoping**: `assignments.course_id` is a nullable foreign key. Existing assignments without course associations remain valid (`course_id IS NULL`), maintaining complete backward compatibility.
8. **Submission Types**: `assignments.submission_type` defaults to `'INDIVIDUAL'`, with explicit support for `'GROUP'` submissions.
9. **Leader-Only Group Acknowledgment Uniqueness**: `group_submission_acknowledgments` enforces `CONSTRAINT uq_group_assignment_acknowledgment UNIQUE (assignment_id, group_id)`. Prevents duplicate or concurrent group acknowledgments.
10. **Historical Membership Snapshot Integrity**: `group_submission_member_snapshots` captures an immutable record of eligible group members at acknowledgment time (`CONSTRAINT uq_acknowledgment_member_snapshot UNIQUE (acknowledgment_id, student_id)`).

---

## 👥 Phase 3: Group Formation & Membership Management

### Architecture & Constraints
1. **Atomic Group Creation**: `POST /api/groups` runs within a PostgreSQL transaction (`BEGIN ... COMMIT`). It creates the group and adds the creator to `group_members` atomically.
2. **In-App Invitation Lifecycle**:
   - Status transitions: `PENDING` $\to$ `ACCEPTED` or `REJECTED`.
   - Only the group creator can issue invitations.
   - Only the target student can accept or reject an invitation.
   - Row-level locking (`FOR UPDATE`) on acceptance prevents concurrent race conditions.
   - Accepting an invitation automatically cancels all other pending invitations for that student.
3. **Private Roster Protection**: `GET /api/groups/:id` restricts roster viewing to active group members or administrators (`HTTP 403 Forbidden` for outsiders).

---

## 📚 Phase 4: Professor Assignment Management & Distribution

### Architecture & Constraints
1. **Assignment Scopes**:
   - **`ALL`**: Accessible to all students across the course.
   - **`SPECIFIC_GROUPS`**: Targeted strictly to selected student groups via `assignment_groups`.
2. **Relational Visibility Filtering**:
   - Student queries (`GET /api/assignments` and `GET /api/assignments/:id`) enforce database-level authorization:
     ```sql
     SELECT DISTINCT a.*
     FROM assignments a
     LEFT JOIN assignment_groups ag ON a.id = ag.assignment_id
     LEFT JOIN group_members gm ON ag.group_id = gm.group_id AND gm.student_id = $1
     WHERE a.scope = 'ALL' OR gm.student_id IS NOT NULL
     ORDER BY a.due_date ASC;
     ```
   - Students outside the assigned groups cannot view targeted assignments or details (`HTTP 403 Forbidden`).
3. **Atomic Modification Transactions**:
   - Creating or updating assignments with `SPECIFIC_GROUPS` validates all target group IDs in a single atomic transaction with `FOR UPDATE` locking.
4. **Secure External OneDrive Portal Integration**:
   - OneDrive URLs are validated via Zod against HTTPS schemes and Microsoft domains.
   - External links render with `target="_blank" rel="noopener noreferrer"` to prevent reverse-tabnabbing vulnerabilities.
   - Files are not hosted or received on Joineazy servers; submission declaration is self-reported.

---

## 📊 Phase 5: Two-Step Submission Confirmation & Professor Analytics

### Architecture & Business Rules
1. **Self-Reported Submission Declaration**: Students submit externally to the professor's OneDrive portal, then confirm their submission within Joineazy.
2. **Two-Step Confirmation Workflow**:
   - Step 1: Student clicks *"Yes, I have submitted"* on the assignment detail view.
   - Step 2: Confirmation modal prompts the student to acknowledge the declaration.
   - On confirmation, `POST /api/assignments/:id/confirm` records the declaration with server-generated `CURRENT_TIMESTAMP`.
3. **Deadline & Late Classification**:
   - $\text{is\_late} = (\text{confirmed\_at} > \text{due\_date})$
   - Late confirmations are allowed but visually flagged (`CONFIRMED_LATE` vs `CONFIRMED_ON_TIME`).
4. **Group Progress Calculation**:
   $$\text{Progress \%} = \left(\frac{\text{Confirmed Eligible Group Members}}{\text{Total Eligible Group Members}}\right) \times 100$$
   - $0\% = \text{NOT\_STARTED}$
   - $1\%\text{--}99\% = \text{IN\_PROGRESS}$
   - $100\% = \text{COMPLETED}$
5. **Professor Course Analytics & Submissions Tracking**:
   - `GET /api/admin/analytics`: Aggregates coursewide metrics (assignments, students, groups, eligible pairs, completion rate).
   - `GET /api/admin/assignments/:id/submissions`: Group-wise and student-wise tracking rosters with search, status filtering, and progress metrics.

---

## 🛡️ Security Architecture & Controls (Phase 6A)

1. **Authentication Mode**:
   - JWT tokens stored in an `httpOnly`, `sameSite: 'lax'`, `secure: production` cookie named `token`.
   - Never stored in browser `localStorage` or `sessionStorage`, mitigating XSS credential theft.
2. **CSRF Protection**:
   - State-changing HTTP methods (`POST`, `PUT`, `DELETE`, `PATCH`) require both an allowed `Origin`/`Referer` header and a valid `X-CSRF-Token` header.
   - Supports both cross-origin setups (`CLIENT_ORIGIN`) and single-origin production deployments (`${req.protocol}://${req.get('host')}`).
3. **Rate Limiting**:
   - `POST /api/auth/login` is protected by an in-memory IP rate limiter (25 attempts per 5 minutes per IP).
   - Exceeded attempts return `HTTP 429 Too Many Requests` with a `Retry-After` header. Bypassed automatically during automated test suites.
4. **Admin Credential Hardening**:
   - Plaintext passwords scrubbed from `.env.example` templates.
   - Production seeding script (`seedAdmin.js`) explicitly rejects well-known default passwords (`AdminInitialPassword123!`, `AdminPass123!`).
   - Manual password rotation is mandatory for any deployment where initial credentials were shared.
5. **SQL Injection Defense**:
   - 100% of SQL queries utilize parameterized placeholders (`$1, $2, ...`). Zero string interpolation.
6. **Single-Origin Routing Protection**:
   - `app.all('/api/*', ...)` strictly returns JSON 404 responses, preventing the SPA fallback from accidentally returning HTML to broken API requests.

---

## 🎓 Round 2 - Phase 1: Course Management Foundation & Enrollment

### Architecture & Constraints
1. **Course Creation & Ownership**:
   - Professors (`ADMIN` role) create courses with a unique `course_code`, `title`, and optional `description`.
   - Courses are indexed with `LOWER(course_code)` to guarantee case-insensitive uniqueness.
   - Professors can view and manage their taught courses via `GET /api/courses/my/taught` and drill down into enrolled students and course deliverables.
2. **Student Self-Enrollment**:
   - Students (`STUDENT` role) browse available courses and self-enroll via `POST /api/courses/:id/enroll`.
   - Relational constraint `CONSTRAINT uq_student_course_enrollment UNIQUE (course_id, student_id)` prevents duplicate enrollments with `409 Conflict`.
   - Students view their active courses via `GET /api/courses/my/enrolled` and dedicated course pages.
3. **Course-Scoped Assignments**:
   - Assignments are optionally linked to a course via `course_id` (foreign key referencing `courses.id`).
   - Backward Compatibility: Existing assignments with `course_id IS NULL` remain visible and fully functional as general assignments.
   - When an assignment has a `course_id`, students must be actively enrolled in that course (or the assignment is general) to view and access it:
     ```sql
     (a.course_id IS NULL OR EXISTS (
       SELECT 1 FROM course_enrollments ce
       WHERE ce.course_id = a.course_id AND ce.student_id = $1
     ))
     ```
4. **Individual vs Group Submission Types**:
   - Assignments now declare a `submission_type`: `'INDIVIDUAL'` (default) or `'GROUP'`.
   - Enables clear distinction between solo assignments and team collaborative deliverables.
5. **Role-Based Redirects & Dashboard Enhancements**:
   - Login and Register workflows redirect both Students and Professors to `/dashboard`, which cleanly renders the role-appropriate experience (`StudentDashboardPage` or `AdminDashboardPage`).
   - Student Dashboard surfaces quick-access enrolled course cards with assignment counts.
   - Professor Dashboard surfaces taught course cards with active student enrollment numbers and deliverable counts.

---

## 👥 Round 2 - Task 2: Leader-Only Group Assignment Acknowledgment

### Architecture & Business Rules
1. **Leader-Only Submission Authorization**:
   - For `GROUP` assignments, **only the designated group leader** (`groups.created_by = requester.id`) possesses authorization to acknowledge submission via `POST /api/assignments/:id/group-acknowledge`.
   - Ordinary group members cannot independently confirm the group assignment; attempts to do so return `403 Forbidden`.
   - The legacy per-student confirmation endpoint (`POST /api/assignments/:id/confirm`) strictly rejects `GROUP` assignments (`400 Bad Request`), preventing member bypass.
2. **Reflected Acknowledgment Across Eligible Members**:
   - A single authorized leader acknowledgment automatically reflects complete submission status for all current eligible group members.
   - For student dashboards and progress tracking, eligible members see `Confirmed` (or `Confirmed Late` if `acknowledged_at > due_date`) along with the leader's name and recorded timestamp.
3. **Course Enrollment & Scope Validation**:
   - If an assignment has a `course_id`, the group leader and group members must be actively enrolled in `course_enrollments` to be eligible for acknowledgment and reflection.
   - If an assignment has `scope = 'SPECIFIC_GROUPS'`, the leader's group must be targeted in `assignment_groups`.
4. **Historical Group Membership Snapshot Policy**:
   - When a group leader acknowledges a submission, `group_submission_member_snapshots` records an immutable audit snapshot of all eligible students active in the group at that moment.
   - If a student subsequently leaves or joins the group, historical submissions maintain complete forensic integrity.
5. **Professor Analytics & Distinguishing Metrics**:
   - Professor analytics distinctly separate group-level metrics from student-level reflected metrics:
     - Group-level: `eligible_groups`, `confirmed_groups`, and `group_completion_percentage`.
     - Student-level: `eligible_students`, `confirmed_students` (reflected from group submissions), and `completion_percentage`.
   - Prevents double-counting and provides safe zero-denominator divisions across all cohorts.

---

## 🚀 Production Deployment Guide (Render + Neon)

This application is architected for single-origin production deployment on **Render** (as a Web Service running Docker) connected to **Neon** (serverless PostgreSQL with SSL).

### Step 1: Provision Neon PostgreSQL
1. Sign up / log in to [Neon Console](https://console.neon.tech/).
2. Create a new project (e.g. `joineazy-db`) running PostgreSQL 16.
3. In the Neon Dashboard, copy the pooled connection string. It will look like:
   ```text
   postgres://username:password@ep-example-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Confirm `sslmode=require` is present in the query string. The application automatically enforces TLS with strict server certificate verification (`rejectUnauthorized: true`).

### Step 2: Run Database Migrations & Seed Admin (Pre-Deployment)
> [!NOTE]
> Render Free Web Services do not support Dashboard Shell / SSH access, and `preDeployCommand` is unavailable on the Free plan. Database migrations and initial admin account provisioning must be executed locally against the Neon database before launching the service on Render.

Run the migration and admin seed scripts from your local workstation targeted to the Neon database:
```bash
# PowerShell (Windows)
$env:DATABASE_URL="<YOUR_NEON_DATABASE_URL>?sslmode=require"
$env:ADMIN_EMAIL="<YOUR_ADMIN_EMAIL>"
$env:ADMIN_PASSWORD="<YOUR_SECURE_PASSWORD>"
$env:ADMIN_NAME="<OPTIONAL_ADMIN_NAME>"
node server/src/database/migrate.js
node server/src/scripts/seedAdmin.js

# Bash / POSIX
DATABASE_URL="<YOUR_NEON_DATABASE_URL>?sslmode=require" \
ADMIN_EMAIL="<YOUR_ADMIN_EMAIL>" \
ADMIN_PASSWORD="<YOUR_SECURE_PASSWORD>" \
ADMIN_NAME="<OPTIONAL_ADMIN_NAME>" \
node server/src/database/migrate.js

DATABASE_URL="<YOUR_NEON_DATABASE_URL>?sslmode=require" \
ADMIN_EMAIL="<YOUR_ADMIN_EMAIL>" \
ADMIN_PASSWORD="<YOUR_SECURE_PASSWORD>" \
ADMIN_NAME="<OPTIONAL_ADMIN_NAME>" \
node server/src/scripts/seedAdmin.js
```

### Step 3: Deploy to Render via Blueprint (`render.yaml`)
1. Push your repository to GitHub or GitLab.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** $\to$ **Blueprint**.
3. Select your repository. Render will automatically parse `render.yaml`.
4. Fill in the required private environment variables:
   - `DATABASE_URL`: Paste your Neon connection string.
   - `ADMIN_EMAIL`: Set your designated administrator email.
   - `ADMIN_PASSWORD`: Enter your strong password (minimum 12 characters, non-default).
   - `JWT_SECRET`: Auto-generated by Render.
   - `CSRF_SECRET`: Auto-generated by Render.
5. Click **Apply**. Render will build the multi-stage `Dockerfile` and start the container on `PORT 5000`.

### Step 4: Verify Deployment (Smoke Tests)
Once the service is active on Render:
1. Health check: `https://<your-render-app>.onrender.com/api/health` $\to$ Returns HTTP 200 with pool stats.
2. Readiness probe: `https://<your-render-app>.onrender.com/api/ready` $\to$ Returns HTTP 200 with database connectivity.
3. Web application: Open `https://<your-render-app>.onrender.com/` in your browser.
4. Log in using the provisioned administrator credentials and verify all dashboards load without errors.

---

## ⚙️ Environment Variables Reference

| Variable | Required | Default / Example | Purpose |
|---|---|---|---|
| `NODE_ENV` | Optional | `development` / `production` | Enables production security flags (secure cookies, rate limiting, strict admin password). |
| `PORT` | Optional | `5000` | Port on which the Express server listens. |
| `DATABASE_URL` | **Yes** | `postgres://user:pass@host:5432/db` | PostgreSQL connection string. Enables TLS verification when host contains `neon.tech` or `sslmode=require`. |
| `JWT_SECRET` | **Yes** | 64+ char random hex string | Secret key used to sign and verify user authentication JWTs. |
| `CSRF_SECRET` | **Yes** | 64+ char random hex string | Secret key used to cryptographically bind CSRF tokens. |
| `CLIENT_ORIGIN` | Optional | `http://localhost:5173` (dev only) | Allowed external CORS / CSRF origin. Not required in production single-origin deployments. |
| `ADMIN_NAME` | Optional | `Course Administrator` | Full name assigned during admin account provisioning. |
| `ADMIN_EMAIL` | **Yes** (Seed) | `<YOUR_ADMIN_EMAIL>` | Email address for the provisioned admin account (alias: `ADMIN_SEED_EMAIL`). |
| `ADMIN_PASSWORD` | **Yes** (Prod) | (Min 12 characters) | Secure password for admin account seeding (alias: `ADMIN_SEED_PASSWORD`). Default passwords rejected in production. |

---

## 📡 API Endpoints Reference

### Diagnostics & Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Process health and database pool state. |
| `GET` | `/api/ready` | Public | Returns `200 OK` when DB is connected, `503` when unreachable. |
| `GET` | `/api/auth/csrf-token` | Public | Generates and returns CSRF token. |
| `POST` | `/api/auth/register` | Public | Registers a new student account (`STUDENT` role enforced). |
| `POST` | `/api/auth/login` | Public (Rate-limited)| Authenticates user and issues HTTP-only cookie (max 25 attempts / 5 min). |
| `GET` | `/api/auth/me` | Authenticated | Fetches profile of currently logged-in user. |
| `POST` | `/api/auth/logout` | Authenticated | Clears authentication and CSRF cookies. |

### Courses & Enrollment (Round 2 - Phase 1)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/courses` | Admin | Creates a new course (`code`, `title`, `description`). |
| `GET` | `/api/courses` | Authenticated | Lists all courses (with enrollment status for students, or taught courses for professors). |
| `GET` | `/api/courses/my/enrolled` | Student | Lists courses currently enrolled by the authenticated student. |
| `GET` | `/api/courses/my/taught` | Admin | Lists courses created and taught by the authenticated professor. |
| `GET` | `/api/courses/:id` | Authenticated | Fetches course details, instructor, and student enrollment count. |
| `POST` | `/api/courses/:id/enroll` | Student | Enrolls authenticated student in the specified course (409 on duplicate). |
| `GET` | `/api/courses/:id/assignments` | Authenticated | Lists all assignments belonging to the course (enforces enrollment for students). |

### Groups & Invitations (Phase 3)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/groups` | Student | Creates group and assigns creator as leader atomically. |
| `GET` | `/api/groups/my` | Student | Retrieves student's current active group, roster, and pending invites (creator only). |
| `GET` | `/api/groups/:id` | Member/Admin | Retrieves private group details and member roster. |
| `POST` | `/api/groups/:id/invitations` | Group Creator | Invites peer student by email or student ID. |
| `GET` | `/api/groups/:id/invitations` | Group Creator | Retrieves list of all invitations sent by this group. |
| `GET` | `/api/invitations/my-pending` | Student | Retrieves pending invitations addressed to current student. |
| `POST` | `/api/invitations/:id/respond` | Recipient | Accepts (`ACCEPT`) or rejects (`REJECT`) a pending invitation. |

### Assignments (Phase 4 & Round 2)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/groups` | Admin | Retrieves all active groups for assignment targeting dropdowns. |
| `POST` | `/api/assignments` | Admin | Creates an assignment (`course_id`, `submission_type`, `scope`, OneDrive link). |
| `GET` | `/api/assignments` | Authenticated | Lists all assignments for Admin, or course/group visible assignments for Student. |
| `GET` | `/api/assignments/:id` | Authenticated | Fetches details for Admin or eligible enrolled Student (includes submission status). |
| `PUT` | `/api/assignments/:id` | Admin (Author) | Atomically updates assignment details, deadlines, course, submission type, and target groups. |
| `DELETE` | `/api/assignments/:id` | Admin (Author) | Atomically deletes assignment and cascades cleanup across groups, submissions, and snapshots. |

### Submissions & Analytics (Phase 5 & Round 2)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/assignments/:id/confirm` | Student | Records two-step individual submission confirmation (rejects GROUP assignments with 400). |
| `POST` | `/api/assignments/:id/group-acknowledge` | Group Leader | Records leader-only group submission declaration with member snapshots (201 on success, 403 for non-leader, 409 if already acknowledged). |
| `GET` | `/api/assignments/:id/group-status` | Authenticated | Retrieves group submission status, leader authorization flag, and member roster. |
| `GET` | `/api/assignments/:id/submission` | Student | Retrieves student's personal submission status (`confirmed`, `confirmed_at`, `is_late`, reflected for group). |
| `GET` | `/api/student/progress` | Student | Retrieves student's coursework summary and group-level progress across applicable assignments. |
| `GET` | `/api/admin/analytics` | Admin | Retrieves coursewide analytics overview, distinguishing individual vs group assignment completion. |
| `GET` | `/api/admin/assignments/:id/submissions` | Admin | Retrieves group-wise and student-wise submission tracking breakdown for an assignment. |

---

## 🧪 Automated Testing & Verification

The project includes **202 automated backend test scenarios** across 9 test suites covering unit, integration, RBAC, cascade cleanup, and end-to-end workflows:

```bash
# Run Phase 2 Regression Tests (15 test scenarios)
npm --prefix server run test:phase2

# Run Phase 3 Regression Tests (25 test scenarios)
npm --prefix server run test:phase3

# Run Phase 4 Regression Tests (34 test scenarios)
npm --prefix server run test:phase4

# Run Phase 5 Integration Test Suite (40 test scenarios)
npm --prefix server run test:phase5

# Run Phase 6A End-to-End Workflow Test Suite (20 test scenarios)
npm --prefix server run test:e2e

# Run Dashboard Edge Cases & Regression Suite (10 test scenarios)
npm --prefix server run test:dashboard

# Run Round 2 Phase 1 Integration Test Suite (20 test scenarios)
npm --prefix server run test:round2:phase1

# Run Round 2 Phase 2 Integration Test Suite (30 test scenarios)
npm --prefix server run test:round2:phase2

# Run Assignment CRUD & Safe Delete Test Suite (8 test scenarios)
npm --prefix server run test:crud:delete

# Compile Frontend Production Build
npm --prefix client run build
```

### Test Suite Summary
| Suite | Scenarios | Focus Area | Status |
|---|---|---|---|
| `test:phase2` | 15 | Migrations, Registration, Login, JWT Cookies, Password Hashing, RBAC | **15/15 PASS** |
| `test:phase3` | 25 | Group Creation, Unique Active Group, Invitations, Accept/Reject, Roster Privacy | **25/25 PASS** |
| `test:phase4` | 34 | Assignments CRUD, Scope Targeting (`ALL` vs `SPECIFIC_GROUPS`), Visibility Guards, OneDrive URL Validation | **34/34 PASS** |
| `test:phase5` | 40 | Two-Step Confirmation, Late Flagging, Idempotency, Group Progress Math, Professor Analytics | **40/40 PASS** |
| `test:e2e` | 20 | Complete 20-step lifecycle across Student 1, Student 2, and Professor roles | **20/20 PASS** |
| `test:dashboard` | 10 | Zero-denominator handling, null tracking states, mixed scopes, empty arrays | **10/10 PASS** |
| `test:round2:phase1` | 20 | Course Creation, Unique Enrollment, Assignment Course Scope, Submission Types, RBAC | **20/20 PASS** |
| `test:round2:phase2` | 30 | Leader-Only Acknowledgment, Reflected Member Status, Snapshots, Non-Leader Rejection, Analytics | **30/30 PASS** |
| `test:crud:delete` | 8 | Assignment CRUD Deletion, Author Isolation (403), Non-author 403, Student 403, Cascade Purge | **8/8 PASS** |
| **Total** | **202** | **Complete Full-Stack Application Verification** | **202/202 PASS** |

---

## 🎨 Round 2 — Phase 3: Professional UI/UX Enhancement

### 1. Visual Identity & Design Principles
- **Color Palette**: Clean light/white backgrounds (`bg-slate-50`, `bg-white`), dark navy typography (`text-slate-900`), and brand indigo/purple accents (`brand-600`, `purple-600`).
- **Cards & Layout**: Rounded cards (`rounded-2xl`, `rounded-xl`), subtle borders (`border-slate-200`), clean spacing, and modern typography hierarchy.
- **Micro-Interactions**: Smooth hover transitions, progress bar transitions (`transition-all duration-500`), and accessible focus rings (`focus:ring-2 focus:ring-brand-500`).

### 2. Authentication UI (`LoginPage.jsx`, `RegisterPage.jsx`)
- **Password Visibility**: Interactive toggle buttons (`Eye`, `EyeOff`) with accessible `aria-label`.
- **Accessible Forms**: Associated labels with `htmlFor` and input `id` attributes, standard `autoComplete` tags (`email`, `current-password`, `name`, `new-password`).
- **Feedback & Validation**: Inline error alerts with `role="alert"` and `aria-live="assertive"`, loading spinners during request processing, and disabled submit buttons during flight.

### 3. Student Academic Dashboard (`StudentDashboardPage.jsx`)
- **Welcome Banner**: Displays student name, overall coursework completion percentage, and instant quick-action pills (`Browse Courses`, `View Assignments`, `My Team Group`).
- **Summary Cards (5 metrics)**: Enrolled Courses, Assigned Deliverables, Confirmed Submissions, Pending Submissions, and Progress Bar.
- **My Enrolled Courses**: Responsive cards displaying course title, course code badge, instructor name, assignment count, and direct link to course details.
- **Group Progress**: Displays group name, active member count, Leader badge (`Crown`), aggregate completion rate, and per-assignment progress bars.
- **Assigned Coursework**: Displays course code, submission type badge (`Individual` vs `Group Task`), scope badge, formatted due date, and submission status (`Confirmed`, `Confirmed Late`, `Pending`, `Overdue`).
- **Alerts**: Highlight banner notifying student of pending group invitations.

### 4. Professor Oversight Console (`AdminDashboardPage.jsx`)
- **Overview Metrics (6 metrics)**: Total Courses, Total Students, Total Assignments, Submitted Deliverables, Pending Deliverables, and Coursewide Completion Rate.
- **Academic Courses Taught**: Course cards with enrollment counts, assignment counts, "+ Assign Task", and "Inspect" navigation.
- **Assignment Performance Table**: Comprehensive breakdown with Course Code, Submission Type, Scope, Deadline, Eligible Students, Confirmed Count, Pending Count, Progress Bar, and "Inspect" button.
- **Submission Tracking Drilldown**:
  - Safe against null reference bugs (`(trackingData.group_tracking || [])`).
  - **Group-Wise Progress Tracking**: Displays Group Name, Leader Name, Active Members, Confirmed Members, Pending Members, Group Progress %, and Status.
  - **Student-Wise Confirmation Roster**: Real-time search filter and status dropdown filter (`All`, `Confirmed`, `Pending`, `Late`), showing student name, email, group, status, and recorded timestamp.

### 5. Assignment Details & Two-Step Verification (`AssignmentDetailsPage.jsx`)
- **Course & Task Metadata**: Title, course code link, submission type badge (`Individual` vs `Group Deliverable`), scope badge, instructor details, formatted deadline, and external OneDrive submission portal box.
- **Individual Submission**: Two-step confirmation with mandatory declaration checkbox before button unlocks.
- **Group Submission — Leader**: Displays group name, member list snapshot preview, leader badge, and "Acknowledge Group Submission" button. Modal enforces declaration on behalf of team.
- **Group Submission — Ordinary Member**: Clear read-only explanatory panel noting that only the group leader can acknowledge submission. Automatically reflects completed status when acknowledged.
- **Ungrouped Student**: Friendly warning card with quick links to create a group or view pending invitations.
- **Keyboard Accessibility**: Modal closes via Escape key, auto-focuses primary action, and traps/handles focus safely.

### 6. Responsive Architecture & Breakpoint Verification
- **1440px / 1024px (Desktop)**: Full multi-column grids, horizontal table layouts, desktop navigation with role badges.
- **768px (Tablet)**: Responsive 2-column grids, adaptive navigation.
- **375px / 320px (Mobile)**: Single-column stacking, horizontal scroll wrappers on tables (`overflow-x-auto`), mobile hamburger drawer with 44px touch targets, zero horizontal page overflow.

---

## 📸 Real Browser Visual Verification & Screenshot Gallery

All views were rendered in a live Chrome browser via Chrome DevTools Protocol (CDP) connected to the local full-stack server and PostgreSQL test database (`joineazy_round2_test`). Authentic PNG screenshots were captured across 5 standard viewport breakpoints (`1440px`, `1024px`, `768px`, `375px`, `320px`) and are stored in `docs/screenshots/`:

| Viewport | Page / View | Screenshot File | Description |
|---|---|---|---|
| **1440px** | Homepage Hero & Navigation | `docs/screenshots/01_homepage_desktop_1440px.png` | Professional SaaS landing page with dark typography, CTAs, and responsive nav. |
| **375px** | Homepage Mobile | `docs/screenshots/02_homepage_mobile_375px.png` | Stacked hero section with touch-friendly navigation drawer. |
| **1440px** | Sign In Page | `docs/screenshots/03_login_page_desktop_1440px.png` | Accessible email/password form with interactive password visibility toggle (`Eye`/`EyeOff`). |
| **375px** | Sign In Mobile | `docs/screenshots/04_login_page_mobile_375px.png` | Full-width mobile login card with loading state indicators. |
| **1440px** | Student Registration | `docs/screenshots/05_register_page_desktop_1440px.png` | Student registration with password guideline cues and student-role enforcement disclaimers. |
| **1440px** | Student Dashboard (Desktop) | `docs/screenshots/06_student_dashboard_desktop_1440px.png` | Welcome progress banner, 5 metric cards, course cards, team progress, and coursework roster. |
| **768px** | Student Dashboard (Tablet) | `docs/screenshots/07_student_dashboard_tablet_768px.png` | 2-column responsive layout with adaptive metric cards. |
| **375px** | Student Dashboard (Mobile) | `docs/screenshots/08_student_dashboard_mobile_375px.png` | Single-column stacked cards with touch-friendly tap targets and zero overflow. |
| **1440px** | Professor Oversight Console | `docs/screenshots/09_professor_dashboard_desktop_1440px.png` | 6 overview metric cards, courses taught, assignment performance table, and submission drilldown. |
| **1024px** | Professor Dashboard (Laptop) | `docs/screenshots/10_professor_dashboard_laptop_1024px.png` | Responsive multi-column layout with horizontal scroll containers on data tables. |
| **375px** | Professor Dashboard (Mobile) | `docs/screenshots/11_professor_dashboard_mobile_375px.png` | Mobile-optimized faculty oversight console with stacked metric cards. |
| **1440px** | Course Catalog | `docs/screenshots/12_course_catalog_desktop_1440px.png` | Enrolled and available courses with course code chips and enrollment actions. |
| **1440px** | Create Course Form | `docs/screenshots/13_create_course_desktop_1440px.png` | Professor course authoring interface with code uniqueness validations. |
| **1440px** | Assignment Details (Individual) | `docs/screenshots/14_assignment_details_individual_1440px.png` | Two-step confirmation flow, external OneDrive portal link, and honor declaration modal. |
| **1440px** | Assignment Details (Group Leader) | `docs/screenshots/15_assignment_details_group_leader_1440px.png` | Group leader acknowledgment view with member roster snapshot preview and team declaration modal. |
| **1440px** | Student Group Management | `docs/screenshots/16_student_group_management_1440px.png` | Active group roster, member management, invitation tools, and status chips. |
| **320px** | Ultra-Small Mobile Viewport | `docs/screenshots/17_responsive_small_screen_320px.png` | Strict 320px layout verification verifying zero horizontal scrollbar and legible typography. |

---

## 🛡️ Round 2 - Phase 4: Full-Stack QA & Production Readiness Audit

### 1. Test Suite Reconciliation (202 Passing Assertions across 9 Test Suites)
The comprehensive automated regression suite comprises exactly **202 unique executed assertions** across 9 test suites (including Phase 2 through Phase 6A, Round 2 Phase 1 and 2, and the Assignment CRUD Delete suite), with zero skipped, zero failed, and zero blocked:

| Suite Name | Command | Unique Scenarios | Result | Description |
|---|---|---|---|---|
| `test:round2:phase1` | `npm --prefix server run test:round2:phase1` | 20 | **20/20 PASS** | Course Creation, Unique Enrollment, Assignment Scoping, Submission Types, RBAC |
| `test:round2:phase2` | `npm --prefix server run test:round2:phase2` | 30 | **30/30 PASS** | Leader-Only Acknowledgment, Reflected Member Status, Snapshots, Non-Leader 403, Analytics |
| `test:crud:delete` | `npm --prefix server run test:crud:delete` | 8 | **8/8 PASS** | Assignment CRUD Deletion, Author Isolation (403), Non-author 403, Student 403, Cascade Purge |
| `test:phase2` | `npm --prefix server run test:phase2` | 15 | **15/15 PASS** | User Registration, Password Hashing, JWT Cookies, CSRF, Student/Admin Roles |
| `test:phase3` | `npm --prefix server run test:phase3` | 25 | **25/25 PASS** | Group Creation, Membership Constraints, In-App Invitations, Security Guards |
| `test:phase4` | `npm --prefix server run test:phase4` | 34 | **34/34 PASS** | Assignment Authoring, Scoping (`ALL` vs `SPECIFIC_GROUPS`), OneDrive Validation |
| `test:phase5` | `npm --prefix server run test:phase5` | 40 | **40/40 PASS** | Two-Step Confirmations, Late Detection, Group Progress Math, Analytics Aggregations |
| `test:e2e` | `npm --prefix server run test:e2e` | 20 | **20/20 PASS** | Complete multi-user academic lifecycle across 2 students and 1 professor |
| `test:dashboard` | `npm --prefix server run test:dashboard` | 10 | **10/10 PASS** | Zero-denominator edge cases, null tracking states, mixed scopes, empty arrays |
| **Total Automated Regression** | | **202** | **202/202 PASS** | **100% Passing Regression Suite** |

### 2. Live HTTP Full-Stack QA Audit (32/32 Passing Scenarios)
A live end-to-end audit executed against the running Express application and local test database verified:
- **Infrastructure**: `/api/health` returns HTTP 200 `{ status: 'healthy', database: 'connected' }`, `/api/ready` returns HTTP 200 `{ ready: true }`, and `/` serves the static compiled React SPA bundle.
- **Authentication**: Student registration (201), duplicate registration rejection (409), invalid password rejection (401), professor login with HTTP-only JWT cookies (200), and client role enforcement (registration strictly creates `STUDENT` accounts).
- **Role Guards**: Students denied access to `/api/admin/overview` (403), professors denied student-only endpoints (403).
- **Course Lifecycle**: Course creation with unique code (201), duplicate course code rejection (409), student course self-enrollment (201), duplicate enrollment rejection (409), unenrolled student assignment access blocked (403), enrolled student assignment visibility (200).
- **Group Management**: Group creation with leader assignment (201), invitation creation (201), invitation acceptance (200), roster update to 2 members.
- **Individual Submissions**: Individual confirmation (201), duplicate confirmation rejection (409), independent unconfirmed status for other students.
- **Group Acknowledgment Security**: Non-leader member acknowledgment blocked (403 Forbidden), individual confirm endpoint on group assignment blocked (400 Bad Request), leader acknowledgment accepted (201), duplicate acknowledgment rejected (409 Conflict), member reflected status confirmed (200).
- **Professor Analytics**: Accurate group acknowledgment tracking, member status reflection, zero duplicate counting, and correct percentage calculation.

### 3. Production Deployment Preparation Checklist (Render + Neon)
Before deploying Round 2 to production:
1. **Neon PostgreSQL Database Migrations**:
   - Run migration `002_courses_and_submission_types.sql` to create `courses`, `course_enrollments`, and extend `assignments`.
   - Run migration `003_group_submission_acknowledgments.sql` to create `group_submission_acknowledgments` and `group_submission_member_snapshots`.
   - The migrations are idempotent (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) and safe against existing Round 1 records.
2. **Environment Variables on Render**:
   - Ensure `NODE_ENV=production`.
   - Ensure `DATABASE_URL` contains the Neon connection string with TLS enabled (`sslmode=require`).
   - Ensure `JWT_SECRET` and `CSRF_SECRET` are securely generated 64-character hex strings.
3. **Single-Origin Express Runner**:
   - The production Dockerfile and Render build script build the Vite frontend (`npm --prefix client run build`) and Express statically serves `client/dist` from the same origin, avoiding CORS issues and cookie domain mismatches.

---

## 🗺️ Project Implementation History

- [x] **Phase 1: Project Scaffolding & Health Baseline** (Vite + React, Express, PostgreSQL Pool, Docker Compose)
- [x] **Phase 2: PostgreSQL Schema, Migrations, JWT Auth & RBAC** (Users, Roles, Secure Cookies, CSRF Token)
- [x] **Phase 3: Group Formation & Membership Management** (Groups, Members, In-App Invites, Roster Security)
- [x] **Phase 4: Assignment Distribution & OneDrive Portal Links** (Assignments, Groups Mapping, External Portals)
- [x] **Phase 5: Two-Step Submission Verification & Analytics** (Declarations, Late Flags, Progress Math, Course Analytics)
- [x] **Phase 6A: QA, Security Hardening & Deployment Preparation** (Single-Origin Container, Neon SSL, Rate Limiting, Render Blueprint, 134 Tests)
- [x] **Round 2 - Phase 1: Course Management Foundation & Enrollment** (Courses, Enrollments, Submission Types, Dashboard Integration, 20 Scenarios)
- [x] **Round 2 - Phase 2: Leader-Only Group Assignment Acknowledgment** (Leader Authorization, Group Submissions, Member Snapshots, Reflected Status, Analytics, 30 Scenarios)
- [x] **Round 2 - Phase 2.5: Test Database Restoration & Integration Verification** (Dedicated `joineazy_round2_test` DB, Model Alignment, 194/194 initial tests passing)
- [x] **Round 2 - Phase 3: Professional UI/UX Enhancement** (Modern Academic SaaS Design, Password Toggles, 5-Stat Student Dashboard, 6-Stat Professor Console, Group Acknowledgment Modals, Responsive Grids)
- [x] **Round 2 - Phase 4: Full QA, Browser Verification, Security Audit & Production Readiness** (Real Chrome CDP Automation, 17 Authentic Screenshots, 202 Backend Tests Reconciled across 9 Suites, 32 Live HTTP Probes, Zero Console Errors, Production Deployment Checklist)
