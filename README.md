# Joineazy - Student, Group & Assignment Management System

A role-based web application tailored for higher education academic workflows. Enables students to form groups, receive assignments, access external OneDrive submission portals, confirm submissions through a secure two-step verification workflow, and track collaborative progress. Enables professors (admins) to create targeted assignments, oversee group/student progress, and inspect submission analytics.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons |
| **Backend** | Node.js (ES Modules), Express.js |
| **Database** | PostgreSQL 16 |
| **Containerization** | Docker, Docker Compose |
| **Security & Utilities** | Helmet, CORS, Dotenv, PG Connection Pool |

---

## 📁 Repository Structure

```
joineazy-student-management/
├── .env.example             # Template for root/shared environment variables
├── .gitignore               # Multi-layer git ignore rules
├── docker-compose.yml       # Multi-container orchestration (DB, API, Client)
├── README.md                # Project documentation and quick start
├── client/                  # Frontend Vite + React application
│   ├── .dockerignore
│   ├── .env.example
│   ├── Dockerfile           # Multi-stage production build (Node + Nginx)
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
│       ├── pages/
│       │   └── HomePage.jsx
│       └── services/
│           └── api.js
└── server/                  # Backend Node.js + Express API
    ├── .dockerignore
    ├── .env.example
    ├── Dockerfile           # Production container (Alpine + non-root user)
    ├── package.json
    └── src/
        ├── app.js           # Express application configuration
        ├── index.js         # Server entrypoint & graceful shutdown
        ├── config/
        │   ├── db.js        # PostgreSQL pool & connection diagnostics
        │   └── env.js       # Environment validation and defaults
        ├── controllers/
        │   └── healthController.js
        ├── middleware/
        │   ├── errorHandler.js
        │   └── requestLogger.js
        ├── routes/
        │   ├── healthRoutes.js
        │   └── index.js
        └── utils/
            └── logger.js
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on Node v24.x)
- **npm**: v9+
- *(Optional)* **Docker & Docker Compose**: For containerized deployment

---

### Option A: Local Development (Without Docker)

#### 1. Setup Backend
```bash
cd server
cp .env.example .env
npm install
npm run dev
```
The server will start on `http://localhost:5000`. Test the health status:
```bash
curl http://localhost:5000/api/health
```

#### 2. Setup Frontend
In a new terminal window:
```bash
cd client
cp .env.example .env
npm install
npm run dev
```
The client will start on `http://localhost:5173`.

---

### Option B: Docker Compose Deployment

When Docker and Docker Compose are installed on the target machine:
```bash
# 1. Copy root environment variables
cp .env.example .env

# 2. Build and launch all services (PostgreSQL, Backend API, Frontend Nginx)
docker compose up --build -d

# 3. View running services
docker compose ps

# 4. View logs
docker compose logs -f
```

---

## 📡 API Endpoints (Phase 1)

### `GET /api/health`
Checks backend responsiveness and PostgreSQL database connectivity.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-11-22T05:54:00.000Z",
  "uptimeSeconds": 142,
  "service": "joineazy-backend",
  "version": "1.0.0",
  "database": {
    "connected": true,
    "message": "PostgreSQL database connected successfully"
  }
}
```

---

## 🗺️ Roadmap & Phases

- [x] **Phase 1: Project Scaffolding & Health Baseline**
- [ ] **Phase 2: Authentication & Role-Based Access Control (JWT)**
- [ ] **Phase 3: Group Formation & Membership Invitations**
- [ ] **Phase 4: Assignment Distribution & OneDrive Portal Links**
- [ ] **Phase 5: Two-Step Submission Verification & Analytics**
