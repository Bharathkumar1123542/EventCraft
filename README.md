# EventCraft

> AI-powered event management platform that transforms event descriptions into complete plans with budgets, timelines, vendor checklists, and personalized ideas.

**Tech Stack:** Next.js 16 · TypeScript · PostgreSQL · Claude AI · TanStack Query · Tailwind CSS 4

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
corepack enable && pnpm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local: Add DATABASE_URL, BETTER_AUTH_SECRET, ANTHROPIC_API_KEY

# 3. Start database & run migrations
docker compose up db -d
pnpm db:migrate

# 4. Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and create your first event!

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Architecture Overview](#architecture-overview)
- [Project Documentation](#project-documentation)

---

## Prerequisites

| Requirement | Version | Get It |
|------------|---------|--------|
| Node.js | ≥ 24.0.0 | [nodejs.org](https://nodejs.org) |
| pnpm | ≥ 10.0.0 | `corepack enable` |
| PostgreSQL | 16 | [Docker](#database-setup) or local install |
| Anthropic API Key | - | [console.anthropic.com](https://console.anthropic.com/) |

**System Requirements:** 512 MB RAM · 1 GB storage · Linux/macOS/Windows (WSL2)

---

## Installation & Setup

### 1. Clone & Install

```bash
git clone <repository-url>
cd eventcraft
corepack enable
pnpm install
```

### 2. Environment Configuration

Create `.env.local` from template:

```bash
cp .env.example .env.local
```

**Required variables:**

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/eventcraft
BETTER_AUTH_SECRET=your-secret-minimum-32-characters-long
ANTHROPIC_API_KEY=sk-ant-your-api-key
APP_URL=http://localhost:3000
```

**Optional variables:** Google OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), rate limiting quotas, AI model selection. See `.env.example` for full list.

### 3. Database Setup

**Option A: Docker (Recommended)**

```bash
docker compose up db -d
pnpm db:migrate
pnpm db:studio  # Optional: Open database GUI
```

**Option B: Local PostgreSQL**

```bash
createdb eventcraft
# Update DATABASE_URL in .env.local
pnpm db:migrate
```

---

## Development

### Common Commands

```bash
pnpm dev              # Start development server (localhost:3000)
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run linter
pnpm typecheck        # TypeScript type checking
pnpm test             # Run unit tests
pnpm check:all        # Run all checks (lint + typecheck + tests)
```

### Database Operations

```bash
pnpm db:generate      # Generate migration from schema changes
pnpm db:migrate       # Apply pending migrations
pnpm db:studio        # Open Drizzle Studio GUI
```

### Development Workflow

1. Make code changes (hot reload enabled)
2. Run `pnpm lint` and `pnpm typecheck`
3. Write tests and run `pnpm test`
4. Run `pnpm check:all` before committing
5. Commit changes with conventional commit format

---

## Testing

### Unit & Integration Tests

```bash
pnpm test                    # Run once
pnpm test:watch              # Watch mode
pnpm test:integration        # Integration tests (requires PostgreSQL)
pnpm test -- --coverage      # With coverage report
```

**Coverage targets:** Domain logic 95% · Services 85% · Global 80%

### End-to-End Tests

```bash
pnpm build && pnpm start     # Terminal 1: Start production server
pnpm test:e2e                # Terminal 2: Run Playwright tests
```

Tests 4 user journeys (wedding planner, birthday parent, community volunteer, assistant chat) + accessibility validation across 12 pages.

### Performance & Live Tests

```bash
# Performance smoke test (requires fake LLM provider)
LLM_PROVIDER=fake pnpm dev   # Terminal 1
pnpm test:perf               # Terminal 2

# Live AI generation test (⚠️ costs money - uses real Anthropic API)
ANTHROPIC_API_KEY=sk-ant-... pnpm test:live
```

---

## Deployment

### Docker Deployment

```bash
# Build image
docker build -t eventcraft:latest -f docker/Dockerfile .

# Run with Docker Compose
export ANTHROPIC_API_KEY=sk-ant-your-key
export BETTER_AUTH_SECRET=your-production-secret
docker compose up -d
```

**Services:** `app` (Next.js on port 3000) · `db` (PostgreSQL 16 on port 5432)

### Cloud Platforms

Compatible with **Vercel**, **AWS** (ECS/Fargate + RDS), **Google Cloud** (Cloud Run + Cloud SQL), **Azure** (App Service + Database for PostgreSQL)

**Health endpoints:**
- `GET /api/health` - Liveness check (no dependencies)
- `GET /api/ready` - Readiness check (includes database)

## Architecture Overview

### Tech Stack

**Frontend:** Next.js 16 (React 19, App Router) · Tailwind CSS 4 · Radix UI · TanStack Query  
**Backend:** Next.js API Routes · PostgreSQL 16 · Drizzle ORM  
**Auth:** Better Auth (email/password + Google OAuth)  
**AI:** Anthropic Claude (Sonnet 4 primary, Haiku 4 fast)  
**Testing:** Vitest · Playwright · axe-core (accessibility)

### Layer Architecture

```
UI Layer (Client Components)
    ↓ HTTP requests
API Layer (Route Handlers: auth, validation, rate limiting)
    ↓ 
Service Layer (business logic coordination)
    ↓                           ↓
Domain Layer                Data Layer
(pure functions)            (repositories, SQL)
```

### Design Principles

**Money Handling:** All amounts stored as integer minor units (e.g., 5000000 = $50,000.00) to avoid floating-point errors.

**Date Handling:** All date calculations use event's timezone via `IsoDate` type (`YYYY-MM-DD` strings).

**Core Features:**
- **Event Types:** Wedding, Birthday, Community (each with specialized templates)
- **Budget Management:** AI allocation, category locking, expense tracking
- **Timeline Scheduling:** Smart task scheduling with dependencies and compression
- **Vendor Pipeline:** not_started → contacted → quoted → booked/declined
- **Ideas Feedback:** Like/dislike/save system with regeneration
- **AI Assistant:** Context-aware chat with streaming responses

---

## Project Documentation

### For Developers
- **[docs/architecture.md](docs/architecture.md)** - Detailed system architecture and design decisions
- **[docs/spec.md](docs/spec.md)** - Technical specification (data models, APIs, testing strategy)
- **[docs/plan.md](docs/plan.md)** - Implementation plan and milestones

### For Users & Stakeholders
- **[docs/prd.md](docs/prd.md)** - Product requirements and features
- **[docs/scope.md](docs/scope.md)** - Project scope boundaries

### For QA & Testing
- **[docs/checklist.md](docs/checklist.md)** - Build checklist and test plan
- **[scripts/README.md](scripts/README.md)** - Testing scripts documentation

---

## Project Structure

```
eventcraft/
├── src/
│   ├── app/                 # Next.js App Router (routes, layouts, API)
│   ├── components/          # React components (auth, layout, UI primitives)
│   ├── domain/              # Pure business logic (no I/O)
│   ├── server/              # Server-side code
│   │   ├── ai/              # LLM integration
│   │   ├── auth/            # Better Auth configuration
│   │   ├── db/              # Database (schema, repositories, client)
│   │   ├── services/        # Business logic services
│   │   └── security/        # Rate limiting, input sanitization
│   ├── schemas/             # Zod validation schemas
│   └── lib/                 # Shared utilities
├── e2e/                     # Playwright end-to-end tests
├── scripts/                 # Testing & utility scripts
├── docs/                    # Comprehensive documentation
└── drizzle/                 # SQL migrations
```

---

## Contributing

### Code Standards

- **TypeScript strict mode** with ESLint (max complexity 10, max lines 300)
- **Prettier** for formatting
- **WCAG 2.1 AA** accessibility compliance
- **≥80% test coverage** globally (≥95% for domain logic)

### Commit Convention

```bash
type(scope): description

# Examples
feat(budget): add expense tracking
fix(timeline): correct timezone calculation
docs(readme): simplify installation steps
```

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes with tests
3. Run `pnpm check:all` (all checks must pass)
4. Push and open PR
5. Ensure CI passes
6. Request review and merge when approved

---

## License

Proprietary. All rights reserved.

---

## Support

**Documentation:** See `docs/` folder for detailed guides  
**Issues:** Create an issue for bugs or feature requests  
**Questions:** Check existing documentation or open a discussion

**Built with ❤️ for event planners everywhere.**
