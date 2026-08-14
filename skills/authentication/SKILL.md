# Skill: authentication

> Email/password login with signed session cookies. Roadmap §12.

## When the Planner selects this

Any `saas`/`ecommerce`/`ai-saas` project where the brief mentions user
accounts, login, or "who can see what." Not needed for a plain `website`.

## What it provides

Real, tested, drop-in modules — not duplicated here, see `templates/`:

| File | Responsibility |
|---|---|
| `templates/saas/lib/auth.ts` | Password hashing (bcrypt) — `hashPassword`/`verifyPassword` |
| `templates/saas/lib/session.ts` | Signed JWT session tokens (`jose`) — `createSessionToken`/`verifySessionToken` |
| `templates/saas/lib/currentUser.ts` | Server Component/Route Handler helper reading the session cookie |
| `templates/saas/components/AuthForm.tsx` | Login/signup form |
| `templates/saas/app/api/auth/` | Route handlers wiring the above together |
| `templates/saas/middleware.ts` | Route protection |

## Key decision: fail loudly, not silently

`session.ts` throws if `SESSION_SECRET` is unset rather than signing with
a guessable default — see `docs/security-model.md` § Secrets management.
Don't "fix" this by adding a fallback secret; an unset secret in
production should be a deploy-time failure, not a security hole.

## Related skills

- [`../database/SKILL.md`](../database/SKILL.md) — the `User` model this reads/writes
- [`../security/SKILL.md`](../security/SKILL.md) — `SESSION_SECRET`/production credentials are human-approval-gated per `docs/security-model.md`

## Tests

`templates/saas/lib/auth.test.ts` — password hashing round-trip and
rejection of an incorrect password.
