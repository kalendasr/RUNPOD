# Skill: security

> Secret scanning + the human-approval-gate rules every other skill defers
> to. Roadmap §19, §20; `docs/security-model.md`.

## When the Planner selects this

Every project — this isn't optional per-feature the way `stripe` or
`pdf` are. Secret scanning runs as part of the quality gate for anything
that reaches `READY_TO_DEPLOY`.

## What it provides

**`packages/security`** (`scanForSecrets(rootDir)`) — walks a directory
tree and flags likely secrets (AWS keys, generic `api_key`/`secret`/`token`
assignments, private key headers, Stripe live keys, Slack tokens),
returning redacted findings (never the full matched secret). Skips
`node_modules`, `.git`, build output, and `.env.example` (which
intentionally documents variable *names*, not real values).

```bash
npx hermes-security scan <project-dir>
```

## Enforcement

`packages/deployment/src/pipeline.ts`'s `deployProject()` calls
`scanForSecrets(projectDir(name))` immediately after entering `DEPLOYING`,
before the Docker build — matching `docs/deployment-strategy.md`'s
documented "Security checks" pipeline step, between production build and
Docker build. Any finding fails the deployment (`FAILED_DEPLOYMENT`,
`security_check_failed` logged with redacted findings) and the Docker
build never runs — see `packages/deployment/tests/pipeline.security.test.ts`.

## Related skills

Every skill that touches a secret (`authentication`'s `SESSION_SECRET`,
`stripe`'s `STRIPE_SECRET_KEY`, `database`'s `DATABASE_URL`) defers to
this one's rule: secrets live in environment variables, never in source,
and production credentials are human-approval-gated
(`docs/security-model.md` § Human approval gates).

## Tests

`packages/security/tests/scanSecrets.test.ts` — one test per rule, plus
redaction and the `.env.example`/`node_modules` ignore behavior.
