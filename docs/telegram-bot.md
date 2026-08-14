# Telegram Interface

> Phase 9 implementation of the Telegram interface described in
> ROADMAP.md §9. Matches the architecture diagram: Telegram is a second
> client of the Factory Control API, alongside the Web UI — it never talks
> to the packages directly.

## 1. Commands

| Command | Maps to |
|---|---|
| `/projects` | `GET /projects` |
| `/status <name>` | `GET /projects/:name` (status + task progress + latest test results) |
| `/logs <name>` | `GET /projects/:name/logs` (last 10 entries) |
| `/test <name>` | `POST /projects/:name/test` (runs the bounded BUILD→TEST→FIX cycle) |
| `/new <name> <type> [feature ...]` | `POST /projects` |
| `/deploy <name>` | Shows a confirmation prompt |
| `/deploy <name> confirm` | `POST /projects/:name/deploy` with `{ approve: true }` |
| `/stop <name>` | `POST /projects/:name/stop` |
| `/help` | Command list |

Anything not starting with `/` is treated as natural language (§3).

## 2. Approval gate, Telegram edition

`/deploy <name>` alone never deploys — it replies with the exact command to
send to confirm. Only `/deploy <name> confirm` calls the deploy endpoint,
same human-approval-gate principle as the CLI's `--yes` and the
dashboard's confirm dialog (`docs/security-model.md` § Human approval
gates), just a two-message version suited to a chat interface where a
single accidental tap sending the wrong message is easy.

## 3. Natural language

`src/nlIntent.ts` sends the message to whichever `@hermes/ai` provider is
available (local Ollama, falling back to hosted — see `docs/ai-provider.md`)
with a system prompt asking for a JSON `{name, type, features}` intent, and
creates that project if the model returns a valid one. If no provider is
reachable, or the model's response can't be parsed as a valid intent, the
bot says so and points at `/help` — natural language is a convenience on
top of the commands, never a requirement (mirrors the "must keep
functioning if the GPU is unavailable" rule from Phase 7).

## 4. Access control

`TELEGRAM_ALLOWED_CHAT_IDS` is a comma-separated allowlist. **Empty = fail
closed** — the bot refuses every chat rather than being open to anyone who
finds the bot's username (`docs/security-model.md` § Isolation: least
privilege, not "secure by obscurity"). To find your chat ID: message the
bot once, then call `https://api.telegram.org/bot<token>/getUpdates` and
read `message.chat.id`.

## 5. A crash found while testing this live

Sending `/test` against a project with no scaffolded app (no
`node_modules/.bin/next`) crashed `factory-api` entirely — not just that
one request. Root cause: `runE2ETests()` in `packages/website-factory` and
`packages/saas-factory` calls `spawn(nextBin, ...)` with no `'error'`
listener. Node treats an unhandled `'error'` event on a `ChildProcess` as
a fatal uncaught exception, killing the whole host process — this bypasses
async `try/catch` entirely, since it isn't part of the awaited promise
chain. Fixed by racing `waitForServer` against a promise that rejects on
the spawn's `'error'` event, so a missing binary becomes a normal
`StepResult { passed: false }` — which is what the `TestSteps` interface
already promised (`runBrowserTests(): Promise<StepResult>`, never throws).
Regression tests: `packages/website-factory/tests/e2e.test.ts`,
`packages/saas-factory/tests/e2e.test.ts`.

## 6. Running locally

```bash
TELEGRAM_BOT_TOKEN=... TELEGRAM_ALLOWED_CHAT_IDS=... npm run --workspace=@hermes/telegram-bot dev
```

Requires `apps/factory-api` running (`FACTORY_API_URL`, defaults to
`http://localhost:4100`). Long-polls `getUpdates` — no webhook/public URL
needed for local development.
