# Security Model

> Phase 0 definition of the security model.
> Expands on ROADMAP.md sections 18–20.

## 1. Principle

Hermes must not have unrestricted access to the host. It operates inside
sandboxes with least-privilege credentials, and any action with real-world
or financial consequence requires explicit human approval.

## 2. Isolation

- Every project runs inside its own Docker sandbox (`security-model.md` §
  ties into `architecture.md` § Project Sandbox).
- Containers run as non-root wherever possible.
- Each project is confined to its own project-specific directory; agents
  do not read or write outside it.
- Network access from a sandbox is restricted to what the project actually
  needs (package registries, its own database, its own deployment target)
  where practical.

## 3. Credentials

- Credentials are scoped per project and per purpose (e.g. a GitHub token
  for one project cannot push to another project's repository).
- Deployment tokens carry the minimum permissions required for their
  target (e.g. deploy-only, not account-admin).
- Production credentials are fully separated from development credentials
  — different values, and ideally different providers/accounts.

## 4. Secrets management

- Secrets are never written into generated source code.
- Secrets are provided via environment variables (`DATABASE_URL`,
  `STRIPE_SECRET_KEY`, `GITHUB_TOKEN`, `CLOUDFLARE_API_TOKEN`,
  `AI_API_KEY`, etc.).
- Every generated project ships a `.env.example` documenting required
  variables, but `.env` itself is always gitignored and never committed.
- The factory scans generated code for accidentally exposed secrets before
  a project can pass its quality gates (ties into `deployment-strategy.md`
  § security checks).

## 5. Human approval gates

The following actions require explicit human approval before Hermes may
execute them — Hermes may prepare them, but must stop and wait:

- Production deployment
- Database destruction
- Domain changes
- Payment configuration
- Production secrets (creation/rotation)
- Infrastructure deletion
- Sending bulk email
- Financial actions

Trusted, low-risk actions may be automated later, but only as an explicit,
reviewed change to this list — never by default.

## 6. Failure handling

Security check failures (exposed secret, disallowed action, missing
approval) block the project's progress the same way a failed test does —
they move the project to `BLOCKED` or `FAILED_*` (see
`project-lifecycle.md`), never silently pass.
