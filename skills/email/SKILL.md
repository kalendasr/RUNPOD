# Skill: email

> Transactional email, abstracted behind a provider interface. Roadmap §12.

## When the Planner selects this

Any project that needs to notify a user (signup confirmation, quotation
sent, password reset, etc).

## What it provides

`templates/saas/lib/email.ts`:

```ts
interface EmailProvider {
  send(message: { to: string; subject: string; body: string }): Promise<void>;
}
```

Call sites depend only on this interface, never a concrete provider — so
swapping in Resend/SendGrid/SES later means changing one file, not every
caller (same pattern as `packages/ai`'s `AIProvider` abstraction from
Phase 7, and `docs/architecture.md`'s general rule on abstracting external
providers).

The default `ConsoleEmailProvider` just logs — no real email provider
credentials exist yet, and configuring one is a human-approval-gated
action (`docs/security-model.md` § Human approval gates: "Sending bulk
email"). A generated project's email call sites work end to end in
dev/test (they log, callers don't need to special-case it), and start
sending real mail the moment a human wires up a real provider behind the
same interface.

## Related skills

- [`../pdf/SKILL.md`](../pdf/SKILL.md) — "email the generated quotation" pairs these two
- [`../security/SKILL.md`](../security/SKILL.md)

## Tests

None yet — the console provider has nothing worth asserting beyond "it
doesn't throw." If a real provider is added, test it the way `stripe`'s
future test should be: against that provider's own test/sandbox mode.
