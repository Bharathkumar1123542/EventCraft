# EventCraft

> AI-powered event management platform that turns event descriptions into complete plans with budgets, timelines, vendor checklists, and personalized ideas.

Built with Next.js 16, TypeScript, PostgreSQL, and Claude AI.

## Quick Start

```bash
# 1. Install dependencies
corepack enable && pnpm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL, BETTER_AUTH_SECRET, and ANTHROPIC_API_KEY

# 3. Start database
docker compose up db -d

# 4. Run migrations
pnpm db:migrate

# 5. Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and create your first event!

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Development](#development)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [Project Structure](#project-structure)
8. [Architecture](#architecture)
9. [Key Concepts](#key-concepts)
10. [Documentation](#documentation)
11. [Contributing](#contributing)
12. [License](#license)

---

## Prerequisites

- **Node.js** ≥ 24.0.0 (LTS)
- **pnpm** ≥ 10.0.0
- **PostgreSQL** 16
- **Anthropic API key** ([Get one here](https://console.anthropic.com/))

### System Requirements

- **Memory:** 512 MB RAM minimum
- **Storage:** 1 GB free space
- **OS:** Linux, macOS, or Windows (with WSL2 recommended)

---

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd eventcraft
```

### 2. Enable Corepack

```bash
corepack enable
corepack prepare pnpm@10.0.0 --activate
```

### 3. Install Dependencies

```bash
pnpm install
```

This will install:
- Next.js 16 (React 19, App Router)
- Drizzle ORM with PostgreSQL driver
- Better Auth for authentication
- Anthropic SDK for AI features
- TanStack Query for data fetching
- Radix UI for accessible components
- Tailwind CSS 4 for styling

---

## Configuration

### Environment Variables

Create `.env.local` from the template:

```bash
cp .env.example .env.local
```

#### Required Variables

```bash
# Application
APP_URL=http://localhost:3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/eventcraft

# Authentication
BETTER_AUTH_SECRET=your-secret-at-least-32-characters-long

# AI Provider
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-api-key
```

#### Optional Variables

```bash
# Google OAuth (optional - both or neither)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Rate Limiting
QUOTA_GENERATIONS_PER_DAY=10
QUOTA_ASSISTANT_MESSAGES_PER_DAY=50

# AI Models
LLM_MODEL_PRIMARY=claude-sonnet-4
LLM_MODEL_FAST=claude-haiku-4

# Database
DB_POOL_MAX=10

# Logging
LOG_LEVEL=info

# Proxy (if behind reverse proxy)
TRUST_PROXY_HOPS=0
```

### Database Setup

#### Option 1: Docker Compose (Recommended)

```bash
# Start PostgreSQL
docker compose up db -d

# Run migrations
pnpm db:migrate

# (Optional) Open Drizzle Studio
pnpm db:studio
```

#### Option 2: Local PostgreSQL

```bash
# Create database
createdb eventcraft

# Set DATABASE_URL in .env.local
DATABASE_URL=postgresql://localhost:5432/eventcraft

# Run migrations
pnpm db:migrate
```

---

## Development

### Start Development Server

```bash
pnpm dev
```

Server runs at [http://localhost:3000](http://localhost:3000)

### Development Workflow

1. **Make changes** to code
2. **Run linter:** `pnpm lint`
3. **Type check:** `pnpm typecheck`
4. **Run tests:** `pnpm test`
5. **Check changes** in browser (hot reload enabled)
6. **Commit** changes

### Database Migrations

```bash
# Generate migration from schema changes
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Open database GUI
pnpm db:studio
```

### Useful Commands

```bash
# Full quality check before commit
pnpm check:all  # Runs lint, typecheck, unit tests, integration tests

# Build for production
pnpm build

# Start production server
pnpm start

# Check bundle sizes
pnpm check:bundle
```

---

## Testing

### Unit Tests

```bash
# Run once
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test -- --coverage
```

**Coverage Thresholds:**
- Domain logic: 95% lines, 90% branches
- Services: 85% lines, 75% branches
- Global: 80% lines, 70% branches

### Integration Tests

```bash
# Requires PostgreSQL running
pnpm test:integration
```

Tests repositories, services, and database triggers.

### End-to-End Tests

```bash
# Start app first
pnpm build && pnpm start

# Run E2E tests (in another terminal)
pnpm test:e2e
```

Tests four complete user journeys:
- **J1:** Wedding planner (sign-up → plan → lock budget → expense → task)
- **J2:** Birthday parent (create → ideas feedback → regenerate → export .ics)
- **J3:** Community volunteer (create → vendor checklist → status pipeline)
- **J4:** Mid-planning user (assistant chat with contextual answers)

Also includes accessibility testing with axe-core on all 12 pages.

### Performance Tests

```bash
# Start server with fake LLM
LLM_PROVIDER=fake pnpm dev

# Run performance tests (in another terminal)
pnpm test:perf
```

Tests latency with 20 concurrent connections:
- Read operations: p95 ≤ 200ms
- Write operations: p95 ≤ 300ms

### Live Generation Test

⚠️ **Warning:** Uses real Anthropic API and costs money!

```bash
# Run 30 real AI generations
ANTHROPIC_API_KEY=sk-ant-... pnpm test:live
```

Success criteria: ≥29/30 must validate (96.7% success rate)

---

## Deployment

### Docker

#### Build Image

```bash
docker build -t eventcraft:latest -f docker/Dockerfile .
```

#### Run with Docker Compose

```bash
# Set required environment variables
export ANTHROPIC_API_KEY=sk-ant-your-key
export BETTER_AUTH_SECRET=your-secret-here

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

Services:
- **app:** Next.js application (port 3000)
- **db:** PostgreSQL 16 (port 5432)

#### Environment Variables for Production

```bash
# Required
DATABASE_URL=postgresql://user:pass@db:5432/eventcraft
BETTER_AUTH_SECRET=<32+ character secret>
ANTHROPIC_API_KEY=sk-ant-<your-key>
APP_URL=https://yourdomain.com

# Recommended
NODE_ENV=production
LOG_LEVEL=warn
QUOTA_GENERATIONS_PER_DAY=10
QUOTA_ASSISTANT_MESSAGES_PER_DAY=50
```

### Cloud Deployment

EventCraft works on any platform supporting Node.js 24+ and PostgreSQL 16:

- **Vercel:** Deploy with PostgreSQL add-on
- **AWS:** ECS/Fargate + RDS PostgreSQL
- **Google Cloud:** Cloud Run + Cloud SQL
- **Azure:** App Service + Azure Database for PostgreSQL

#### Health Checks

- **Liveness:** `GET /api/health` (no dependencies)
- **Readiness:** `GET /api/ready` (checks database)

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `BETTER_AUTH_SECRET` (32+ random characters)
- [ ] Configure `APP_URL` with your domain
- [ ] Set up PostgreSQL with connection pooling
- [ ] Configure reverse proxy (nginx/Traefik)
- [ ] Enable HTTPS
- [ ] Set `TRUST_PROXY_HOPS` if behind proxy
- [ ] Configure rate limiting quotas
- [ ] Set up monitoring and logging
- [ ] Run database migrations before deployment
- [ ] Test with `pnpm test:e2e` in staging

---

## Project Structure

```
eventcraft/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD pipeline
├── docs/                        # Project documentation
│   ├── architecture.md          # System architecture
│   ├── prd.md                   # Product requirements
│   ├── spec.md                  # Technical specification
│   ├── plan.md                  # Implementation plan
│   ├── scope.md                 # Project scope
│   └── checklist.md             # Build checklist
├── drizzle/                     # SQL migrations
├── e2e/                         # End-to-end tests (Playwright)
├── scripts/                     # Utility scripts
│   ├── check-bundle-size.ts    # Bundle size checker
│   ├── perf-smoke.ts            # Performance tests
│   ├── live-test.ts             # Live AI validation
│   └── migrate.ts               # Database migration runner
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (app)/              # Authenticated routes
│   │   ├── (public)/           # Public routes
│   │   ├── api/                # API routes
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing page
│   ├── components/              # React components
│   │   ├── auth/               # Auth components
│   │   ├── layout/             # Layout components
│   │   └── ui/                 # UI primitives
│   ├── domain/                  # Pure business logic
│   │   ├── budget.ts           # Budget allocation
│   │   ├── timeline.ts         # Task scheduling
│   │   ├── money.ts            # Currency handling
│   │   ├── dates.ts            # Date utilities
│   │   ├── ics.ts              # Calendar export
│   │   └── templates.ts        # Event templates
│   ├── lib/                     # Shared utilities
│   │   ├── client/             # Client-side utilities
│   │   └── utils.ts            # Common helpers
│   ├── schemas/                 # Zod validation schemas
│   ├── server/                  # Server-side code
│   │   ├── ai/                 # LLM integration
│   │   ├── auth/               # Authentication
│   │   ├── config/             # Configuration
│   │   ├── db/                 # Database layer
│   │   │   ├── client.ts       # DB client
│   │   │   ├── schema/         # Drizzle schema
│   │   │   └── repositories/   # Data access
│   │   ├── http/               # HTTP utilities
│   │   ├── schemas/            # Server schemas
│   │   ├── security/           # Security (rate limiting, sanitization)
│   │   ├── services/           # Business logic
│   │   └── testing/            # Test helpers
│   └── middleware.ts            # Next.js middleware
├── docker/
│   └── Dockerfile               # Production Docker image
├── compose.yaml                 # Docker Compose config
├── drizzle.config.ts            # Drizzle configuration
├── next.config.ts               # Next.js configuration
├── playwright.config.ts         # Playwright configuration
├── tailwind.config.ts           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
├── vitest.config.ts             # Vitest configuration
├── package.json                 # Dependencies and scripts
└── README.md                    # This file
```

---

## Architecture

### Tech Stack

- **Frontend:** Next.js 16 (React 19, App Router, Server Components)
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI primitives
- **State Management:** TanStack Query
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL 16 + Drizzle ORM
- **Authentication:** Better Auth (email/password + Google OAuth)
- **AI:** Anthropic Claude (Sonnet 4 primary, Haiku 4 fast)
- **Testing:** Vitest (unit/integration), Playwright (E2E), axe-core (a11y)

### Key Design Patterns

#### Layer Architecture

```
┌─────────────────────────────────────┐
│  UI Layer (Client Components)       │
│  - Forms, tables, dialogs           │
│  - TanStack Query for data          │
└─────────────────────────────────────┘
              ↓ HTTP
┌─────────────────────────────────────┐
│  API Layer (Route Handlers)         │
│  - Authentication                   │
│  - Validation (Zod)                 │
│  - Rate limiting                    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Service Layer                      │
│  - Business logic coordination      │
│  - Domain calls                     │
│  - Repository calls                 │
└─────────────────────────────────────┘
       ↓                    ↓
┌────────────────┐   ┌──────────────┐
│ Domain Layer   │   │ Data Layer   │
│ Pure functions │   │ Repositories │
│ No I/O         │   │ SQL queries  │
└────────────────┘   └──────────────┘
```

#### Money Handling

All monetary values stored as **integer minor units**:

```typescript
// ✅ Correct
const budgetMinor = 5000000;  // $50,000.00

// ❌ Wrong
const budget = 50000.00;  // Floating-point precision issues
```

Convert for display only:

```typescript
function formatMoney(minor: number, currency: string): string {
  const decimals = CURRENCY_DECIMALS[currency] || 2;
  const major = minor / Math.pow(10, decimals);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(major);
}
```

#### Date Handling

All dates computed in event's timezone:

```typescript
// ✅ Correct
const today = clock.today(event.timezone);

// ❌ Wrong
const today = new Date();  // Uses server timezone
```

Use `IsoDate` type (`YYYY-MM-DD` string) for calendar dates.

---

## Key Concepts

### Event Types

Three event types with specialized templates:

1. **Wedding** - Large guest count, venue priority, photographer emphasis
2. **Birthday** - Age-appropriate ideas, entertainment focus
3. **Community** - Permits, insurance, accessibility requirements

### Budget Allocation

- **Initial:** AI suggests allocation based on event type and total budget
- **Rebalancing:** When locked categories exist, others rebalance proportionally
- **Categories:** 3-15 per event, each with allocated/committed/paid/remaining
- **Expenses:** Track against categories, marked as paid/unpaid

### Timeline Scheduling

- **Ideal spacing:** Tasks scheduled with buffer time
- **Compression:** When event date is soon, tasks may be "compressed"
- **Dependencies:** Critical tasks scheduled first
- **Priorities:** High/medium/low affect urgency

### Vendor Checklist

- **Needs:** What type of vendor (venue, caterer, photographer, etc.)
- **Questions:** 3-5 questions to ask each vendor type
- **Status Pipeline:** not_started → contacted → quoted → booked/declined
- **Validation:** Can't mark "booked" without vendor name

### Ideas Feedback Loop

- **Like/Dislike:** Toggle buttons with aria-pressed
- **Save:** Bookmark ideas for later
- **Regenerate:** Excludes disliked items, keeps saved ones
- **Filters:** All/Saved/Liked views

### Assistant Chat

- **Context-aware:** Sees budget, tasks, vendors (not private notes)
- **Streaming:** Word-by-word SSE responses
- **Privacy:** Clear disclosure of what AI can see
- **History:** Last 10 messages displayed

---

## Documentation

### For Users

- `docs/prd.md` - Product requirements and features
- `docs/scope.md` - What's in scope and out of scope

### For Developers

- `docs/architecture.md` - System architecture and design decisions
- `docs/spec.md` - Technical specification (data models, APIs, testing)
- `docs/plan.md` - Implementation plan and milestones
- `CLAUDE.md` - Quick reference for AI-assisted development

### For QA

- `docs/checklist.md` - Build checklist and test plan
- `scripts/README.md` - Testing scripts documentation

---

## Contributing

### Code Style

- **TypeScript:** Strict mode enabled
- **Linting:** ESLint with complexity limits (max 10, max lines 300)
- **Formatting:** Prettier
- **Accessibility:** WCAG 2.1 AA compliance
- **Testing:** ≥80% coverage globally, ≥95% for domain logic

### Commit Guidelines

```bash
# Before committing
pnpm check:all  # Lint, typecheck, tests

# Commit message format
type(scope): description

# Examples
feat(budget): add expense tracking
fix(timeline): correct date calculation
docs(readme): update installation steps
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with tests
3. Run `pnpm check:all`
4. Push branch and create PR
5. CI must pass (all jobs green)
6. Request review
7. Merge when approved

---

## License

Proprietary. All rights reserved.

---

## Support

- **Documentation:** See `docs/` folder
- **Issues:** Check existing issues or create new one
- **Questions:** Refer to `CLAUDE.md` for quick answers

---

**Built with ❤️ for event planners everywhere.**
