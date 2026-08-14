# Hermes Digital Factory

> Master roadmap for building an AI-powered software factory using Claude Code.

## 1. Vision

Build an autonomous development platform where the user can provide a natural-language project brief and the system can:

1. Understand the requirements.
2. Create a project specification.
3. Design the technical architecture.
4. Create the project repository.
5. Generate the code.
6. Install dependencies.
7. Run the application.
8. Create and manage databases.
9. Run automated tests.
10. Test the UI in a real browser.
11. Detect and fix errors.
12. Perform code quality and security checks.
13. Commit changes to Git.
14. Create a deployment build.
15. Deploy the project.
16. Verify the production deployment.
17. Report the completed project.

The system must support two primary project types:

- Websites
- SaaS applications

The architecture must allow additional project types to be added later.

---

# 2. Core principle

The factory is not a chatbot.

It is an autonomous software-development environment.

The LLM is responsible for reasoning and coding, while deterministic tools are responsible for:

- File operations
- Git
- Docker
- Testing
- Browser automation
- Database operations
- Builds
- Deployment
- Infrastructure

Never rely on the AI to claim that an operation succeeded.

The system must verify success using actual commands, tests, health checks, or deployment checks.

---

# 3. Target user experience

The ideal interaction should eventually look like:

```text
User:

Build me a SaaS for construction companies.

It should allow users to:
- create accounts
- manage customers
- create projects
- create quotations
- generate PDF quotations
- send quotations by email
- manage materials
- have an admin dashboard
- have subscription billing
```

The factory responds:

```text
Project created.

Project:
construction-quotes

Architecture:
Next.js
TypeScript
PostgreSQL
Prisma
Stripe
Docker

I created the implementation plan.

Ready to begin?
```

After approval:

```text
Phase 1 complete
✓ Project structure
✓ Authentication
✓ Database
✓ Dashboard

Phase 2 complete
✓ Customer management
✓ Projects
✓ Quotations

Tests:
✓ 87 passed
✓ Build successful
✓ Browser tests passed

Deployment:
✓ Production deployed

URL:
https://example.com
```

---

# 4. High-level architecture

```text
                         USER
                           │
                 ┌─────────┴─────────┐
                 │                   │
             Web UI              Telegram
                 │                   │
                 └─────────┬─────────┘
                           │
                           ▼
                  FACTORY CONTROL API
                           │
                           ▼
                    ORCHESTRATOR
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
         PLANNER        CODER         REVIEWER
             │             │             │
             └─────────────┼─────────────┘
                           │
                           ▼
                    PROJECT SANDBOX
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
      Docker             Git              Database
        │                  │                  │
        ▼                  ▼                  ▼
    Application        GitHub           PostgreSQL
        │
        ▼
   Browser Testing
        │
        ▼
    Quality Gates
        │
        ▼
     Deployment
        │
        ▼
    Production
```

---

# 5. Infrastructure architecture

## Development server

Initial target:

- Ubuntu 24.04 LTS
- 4 vCPU
- 8 GB RAM
- 75–100 GB NVMe
- Docker
- Git
- Node.js
- Python
- PostgreSQL
- Playwright

This server runs continuously.

Its responsibilities:

- Claude Code
- project orchestration
- project files
- Git operations
- test execution
- Docker
- development databases
- deployment orchestration

---

## AI inference server

Initial target:

- NVIDIA RTX 3090
- 24 GB VRAM
- Linux
- Ollama or compatible inference server
- Qwen-class coding model

The GPU should not be required to remain online 24/7.

The architecture should support:

```text
GPU OFF
   ↓
Factory receives task
   ↓
GPU required
   ↓
Start GPU
   ↓
Run inference
   ↓
Task complete
   ↓
GPU idle
   ↓
Stop GPU
```

Implement this only after the core factory works.

---

# 6. Technology stack

## Core

- TypeScript
- Node.js
- Docker
- Git
- GitHub

## Frontend

- Next.js
- TypeScript
- Tailwind CSS

## Backend

Use Next.js server functionality for simple applications.

Use FastAPI for services that require a separate Python backend.

## Database

- PostgreSQL
- Prisma

## Browser automation

- Playwright

## Testing

- Vitest or Jest
- Playwright
- ESLint
- TypeScript compiler

## Infrastructure

- Docker Compose for development
- Docker for production
- Cloudflare where appropriate

## AI

The AI provider must be abstracted behind an internal interface so that the factory can support:

- local models
- hosted models
- different providers
- future model upgrades

Do not hard-code the entire system around one model.

---

# 7. Repository structure

Create the factory repository with:

```text
hermes-digital-factory/

├── apps/
│   ├── control-panel/
│   └── factory-api/
│
├── packages/
│   ├── core/
│   ├── agents/
│   ├── projects/
│   ├── git/
│   ├── testing/
│   ├── browser/
│   ├── deployment/
│   ├── infrastructure/
│   └── shared/
│
├── templates/
│   ├── website/
│   ├── saas/
│   ├── ecommerce/
│   └── ai-saas/
│
├── skills/
│   ├── website/
│   ├── saas/
│   ├── authentication/
│   ├── database/
│   ├── payments/
│   ├── email/
│   ├── pdf/
│   ├── testing/
│   ├── security/
│   └── deployment/
│
├── projects/
│
├── infrastructure/
│   ├── docker/
│   ├── dev/
│   └── production/
│
├── docs/
│
├── scripts/
│
├── tests/
│
├── .env.example
├── docker-compose.yml
├── README.md
└── ROADMAP.md
```

---

# 8. Project lifecycle

Every project must have a state.

```text
DRAFT
  ↓
PLANNING
  ↓
APPROVED
  ↓
BUILDING
  ↓
TESTING
  ↓
FIXING
  ↓
REVIEW
  ↓
READY_TO_DEPLOY
  ↓
DEPLOYING
  ↓
DEPLOYED
```

Possible failure states:

```text
FAILED_BUILD
FAILED_TESTS
FAILED_DEPLOYMENT
BLOCKED
```

Never silently move between states.

---

# 9. Project manifest

Every generated project must contain a machine-readable project manifest.

Example:

```yaml
name: construction-quotes
type: saas
status: building

stack:
  frontend: nextjs
  language: typescript
  database: postgresql
  orm: prisma

features:
  - authentication
  - customers
  - projects
  - quotations
  - pdf
  - email
  - subscriptions

deployment:
  provider: docker

testing:
  unit: true
  integration: true
  browser: true
```

The factory uses this manifest to understand the project.

---

# 10. Agent architecture

Do not build one giant autonomous prompt.

Use specialized responsibilities.

## Planner

Responsible for:

- requirements
- architecture
- task breakdown
- dependencies
- acceptance criteria

Output:

```text
requirements.md
architecture.md
tasks.md
```

## Builder

Responsible for:

- creating files
- modifying code
- installing packages
- implementing features

## Tester

Responsible for:

- unit tests
- integration tests
- browser tests
- build verification

## Debugger

Responsible for:

- investigating failures
- reproducing problems
- implementing fixes
- rerunning tests

## Reviewer

Responsible for:

- code quality
- architecture
- security
- incomplete functionality

## Deployment agent

Responsible for:

- production build
- deployment
- health checks
- rollback

---

# 11. Website factory

The website generator must support:

## Basic websites

- Home
- About
- Services
- Projects
- Contact

## Marketing websites

- Landing pages
- CTA sections
- Testimonials
- Pricing
- FAQ
- SEO

## Business websites

- Contact forms
- WhatsApp integration
- Maps
- CMS-style content

## E-commerce

- Products
- Categories
- Cart
- Checkout
- Orders
- Admin

Every generated website must be responsive.

Minimum browser targets:

- Desktop
- Tablet
- Mobile

---

# 12. SaaS factory

SaaS templates should support:

- Authentication
- User profiles
- Organizations
- Roles
- Permissions
- Dashboard
- CRUD functionality
- PostgreSQL
- Billing
- Email
- File storage
- Admin panel
- API
- Usage limits

Not every project needs every feature.

The planner determines which modules are required.

---

# 13. Design system generator

Add a design-system stage.

Input:

```text
Modern
Premium
Minimal
Target audience: teenagers
Brand colors: ...
```

Output:

```text
design-system.md
```

and reusable components:

```text
Button
Card
Modal
Navbar
Footer
Form
Input
Table
Dashboard
PricingCard
Hero
```

The generated application must use the design system instead of creating random styles for each page.

---

# 14. Browser testing

Use Playwright.

The factory should be able to:

1. Start the application.
2. Open the browser.
3. Navigate through the application.
4. Click buttons.
5. Fill forms.
6. Submit forms.
7. Verify results.
8. Take screenshots.
9. Detect console errors.
10. Detect failed network requests.

Example:

```text
Homepage
 ↓
Sign up
 ↓
Create account
 ↓
Login
 ↓
Dashboard
 ↓
Create customer
 ↓
Create project
 ↓
Create quotation
 ↓
Generate PDF
```

If a step fails, the project does not pass the quality gate.

---

# 15. Autonomous debugging loop

Implement a controlled loop:

```text
BUILD
 ↓
TEST
 ↓
PASS?
 ├── YES → NEXT STAGE
 └── NO
       ↓
    ANALYZE
       ↓
      FIX
       ↓
      TEST
       ↓
    PASS?
```

Set limits.

Example:

```text
maximum_attempts = 5
```

After five failed attempts:

```text
BLOCKED

Human intervention required.
```

Never allow infinite autonomous loops.

---

# 16. Git workflow

Every project must use Git.

Recommended workflow:

```text
main
 │
 ├── feature/auth
 ├── feature/dashboard
 ├── feature/billing
 └── fix/login-error
```

Hermes should commit frequently.

Commit messages should describe the actual change.

Example:

```text
feat: add customer management
fix: prevent duplicate quotation submission
test: add quotation browser tests
```

Never deploy uncommitted production code.

---

# 17. Deployment pipeline

The deployment pipeline must be deterministic.

```text
Git commit
 ↓
Install dependencies
 ↓
Type check
 ↓
Lint
 ↓
Unit tests
 ↓
Integration tests
 ↓
Production build
 ↓
Security checks
 ↓
Docker build
 ↓
Deploy
 ↓
Health check
 ↓
Smoke tests
 ↓
LIVE
```

If any mandatory step fails:

```text
DEPLOYMENT BLOCKED
```

---

# 18. Human approval gates

Initially require approval for:

- Production deployment
- Database destruction
- Domain changes
- Payment configuration
- Production secrets
- Infrastructure deletion
- Sending bulk email
- Financial actions

Hermes may prepare the action but must wait for approval.

Later, trusted actions can be automated.

---

# 19. Secrets management

Never put secrets inside generated source code.

Use environment variables.

Example:

```text
DATABASE_URL
STRIPE_SECRET_KEY
GITHUB_TOKEN
CLOUDFLARE_API_TOKEN
AI_API_KEY
```

Create:

```text
.env.example
```

but never commit:

```text
.env
```

The factory must scan generated code for accidentally exposed secrets.

---

# 20. Security rules

Hermes must not have unrestricted access to the host.

Use:

- Docker isolation
- non-root containers where possible
- project-specific directories
- restricted credentials
- environment variables
- deployment tokens with minimal permissions
- network restrictions where practical

Production credentials must be separated from development credentials.

---

# 21. Factory control panel

Eventually create a web dashboard.

Features:

```text
Dashboard
Projects
New Project
Project Details
Tasks
Logs
Tests
Deployments
Costs
Settings
```

Project page:

```text
Construction Quotes

Status:
BUILDING

Progress:
██████████████░░░░ 78%

Tasks:
✓ Authentication
✓ Database
✓ Dashboard
✓ Customers
✓ Projects
✓ Quotations
○ PDF
○ Billing
○ Deployment

Tests:
87 passed
2 failed
```

---

# 22. Cost monitoring

Track:

- GPU usage
- AI inference cost
- VPS cost
- storage
- deployment cost

For every project store:

```text
project_id
gpu_time
inference_tokens
storage
deployment_cost
total_estimated_cost
```

Eventually the dashboard should show:

```text
This month

Factory:
$8.42

Project A:
$1.20

Project B:
$3.84

Project C:
$0.72
```

---

# 23. Phase roadmap

## PHASE 0 — Planning

Goal:

Understand the architecture before writing the factory.

Tasks:

- [ ] Create repository
- [ ] Create architecture document
- [ ] Define project manifest
- [ ] Define project lifecycle
- [ ] Define security model
- [ ] Define environment strategy
- [ ] Define deployment strategy

---

## PHASE 1 — Claude Code Development Environment

Goal:

Create the environment Claude Code will use to build the factory.

Tasks:

- [ ] Configure Ubuntu server
- [ ] Install Git
- [ ] Install Docker
- [ ] Install Node.js
- [ ] Install Python
- [ ] Install Playwright dependencies
- [ ] Configure SSH
- [ ] Configure GitHub
- [ ] Create repository
- [ ] Create development scripts

Acceptance criteria:

```text
Claude Code can:
✓ modify repository
✓ run application
✓ run tests
✓ use Docker
✓ commit to Git
```

---

# PHASE 2 — Project Engine

Goal:

Allow the factory to create isolated projects.

Tasks:

- [ ] Create project registry
- [ ] Create project manifest
- [ ] Create project directories
- [ ] Create Docker sandbox
- [ ] Create project lifecycle
- [ ] Add project logs
- [ ] Add project status
- [ ] Add task tracking

Acceptance criteria:

```text
Create project
 ↓
Sandbox created
 ↓
Manifest created
 ↓
Docker environment starts
```

---

# PHASE 3 — Website Factory

Goal:

Generate a working website from a brief.

Tasks:

- [ ] Create Next.js template
- [ ] Create Tailwind template
- [ ] Create design-system template
- [ ] Create page generator
- [ ] Create responsive components
- [ ] Add SEO
- [ ] Add contact forms
- [ ] Add Playwright tests
- [ ] Add build verification

First milestone:

```text
Prompt
 ↓
Website
 ↓
Tests
 ↓
Production build
```

---

# PHASE 4 — SaaS Factory

Goal:

Generate complete SaaS applications.

Tasks:

- [ ] Authentication
- [ ] PostgreSQL
- [ ] Prisma
- [ ] User management
- [ ] Dashboard
- [ ] CRUD generator
- [ ] Roles
- [ ] Permissions
- [ ] API
- [ ] Email
- [ ] File storage
- [ ] Billing
- [ ] Admin panel

---

# PHASE 5 — Autonomous Testing

Goal:

Make the factory verify its own work.

Tasks:

- [ ] Unit testing
- [ ] Integration testing
- [ ] Browser testing
- [ ] Screenshot testing
- [ ] Console error detection
- [ ] Network error detection
- [ ] Build verification
- [ ] Automatic debugging loop
- [ ] Maximum retry limits

---

# PHASE 6 — Deployment Factory

Goal:

Allow projects to deploy automatically.

Tasks:

- [ ] Docker production builds
- [ ] Deployment service
- [ ] Environment configuration
- [ ] Domain configuration
- [ ] SSL
- [ ] Health checks
- [ ] Smoke tests
- [ ] Rollback
- [ ] Deployment logs

First deployment milestone:

```text
Build
 ↓
Test
 ↓
Approve
 ↓
Deploy
 ↓
Verify
```

---

# PHASE 7 — Local AI

Goal:

Add local inference.

Tasks:

- [ ] Configure GPU provider
- [ ] Configure RTX 3090
- [ ] Install inference server
- [ ] Install coding model
- [ ] Create AI abstraction
- [ ] Connect factory to local model
- [ ] Measure inference performance
- [ ] Implement GPU start/stop

The factory must continue functioning if the local GPU is unavailable.

---

# PHASE 8 — Factory Dashboard

Goal:

Create a visual interface.

Tasks:

- [ ] Dashboard
- [ ] Project list
- [ ] Project details
- [ ] Live logs
- [ ] Task progress
- [ ] Test results
- [ ] Deployment status
- [ ] Cost tracking
- [ ] Approval controls

---

# PHASE 9 — Telegram Interface

Goal:

Allow projects to be managed from Telegram.

Commands:

```text
/new
/projects
/status
/logs
/test
/deploy
/stop
```

Natural language should also be supported.

Example:

```text
Build me a landing page for Alpha Red.
```

---

# PHASE 10 — Skills System

Create reusable skills:

```text
website
saas
ecommerce
authentication
database
stripe
email
pdf
seo
security
testing
deployment
```

Every skill should contain:

```text
SKILL.md
templates/
examples/
tests/
```

Skills should be version controlled.

---

# PHASE 11 — Autonomous Digital Factory

Final target:

```text
USER
 ↓
IDEA
 ↓
PLANNER
 ↓
ARCHITECT
 ↓
BUILDER
 ↓
TESTER
 ↓
DEBUGGER
 ↓
SECURITY REVIEW
 ↓
HUMAN APPROVAL
 ↓
DEPLOYMENT
 ↓
PRODUCTION
```

The factory should be capable of running multiple projects independently.

---

# 24. Definition of done

A project is NOT complete because the AI generated code.

A project is complete only when:

- [ ] Requirements implemented
- [ ] Application starts
- [ ] Database works
- [ ] Authentication works
- [ ] Major user flows work
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Browser tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Production build succeeds
- [ ] Security checks pass
- [ ] Git changes committed
- [ ] Deployment succeeds
- [ ] Production health check succeeds
- [ ] Production smoke tests pass
- [ ] Final report generated

---

# 25. First project for the factory

Do not start by trying to build a huge SaaS.

The first project should be a simple but real website.

Recommended first test:

```text
Project:
Business website

Pages:
Home
About
Services
Projects
Contact

Requirements:
Responsive
SEO
Contact form
Modern design
Docker
GitHub
Automated tests
Deployment
```

The factory must successfully build and deploy this before attempting a complex SaaS.

Then build:

```text
Website
 ↓
CRUD SaaS
 ↓
Authentication SaaS
 ↓
Subscription SaaS
 ↓
AI SaaS
```

---

# 26. Claude Code operating rules

Claude Code must follow these rules while building the factory:

1. Read ROADMAP.md before starting.
2. Read the relevant project documentation before modifying architecture.
3. Work on one roadmap phase at a time.
4. Do not skip acceptance criteria.
5. Run tests after meaningful changes.
6. Never claim tests passed without running them.
7. Never expose secrets.
8. Never modify production without explicit authorization.
9. Prefer small commits.
10. Keep documentation synchronized with implementation.
11. When blocked, explain the exact blocker.
12. Do not rewrite working architecture without a concrete reason.
13. Prefer deterministic scripts over manual procedures.
14. Every new capability must have tests.
15. Keep the factory itself reproducible from a clean server.

---

# 27. Immediate implementation order

Start here:

```text
1. Repository
       ↓
2. Claude Code environment
       ↓
3. Docker sandbox
       ↓
4. Project manifest
       ↓
5. Project engine
       ↓
6. Next.js website template
       ↓
7. Automated testing
       ↓
8. GitHub integration
       ↓
9. Deployment
       ↓
10. SaaS template
       ↓
11. Local GPU
       ↓
12. Dashboard
       ↓
13. Telegram
       ↓
14. Advanced autonomy
```

Do not start with the GPU.

The first goal is to prove:

> **Claude Code can reliably create, run, test and package a project inside an isolated environment.**

Once that works, adding local AI inference is straightforward.

---

# 28. Ultimate goal

The finished system should make this possible:

```text
YOU

"Build a modern SaaS for construction
companies to manage customers,
projects and quotations.

It needs:
- user accounts
- subscriptions
- PDF quotations
- email
- admin dashboard
- mobile responsive UI
- PostgreSQL
- Stripe

Use a modern premium design."

             ↓

      HERMES DIGITAL FACTORY

             ↓

        Requirements
             ↓
        Architecture
             ↓
        Project creation
             ↓
        Code generation
             ↓
        Database
             ↓
        UI
             ↓
        Testing
             ↓
        Debugging
             ↓
        Security
             ↓
        Git
             ↓
        Deployment
             ↓

       LIVE SAAS PRODUCT

             ↓

      https://yourapp.com
```

The objective is not to build an AI that merely writes code.

The objective is to build an **AI-powered production system that turns ideas into working digital products.**

---

# 29. First milestone

The first major milestone is:

> **Give Claude Code one prompt and have it independently create a website inside a Docker sandbox, run it, test it with Playwright, fix any failures, create a Git commit, and produce a production-ready build.**

Once that works reliably, the Hermes Digital Factory has its foundation.