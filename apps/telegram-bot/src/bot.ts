import type { AIProvider } from "@hermes/ai";
import type { TelegramClient, TelegramUpdate } from "./telegramClient.js";
import type { FactoryClient } from "./factoryClient.js";
import { parseCommand, type Command } from "./commands.js";
import { parseNaturalLanguageIntent } from "./nlIntent.js";

export interface BotDeps {
  telegram: TelegramClient;
  factory: FactoryClient;
  provider: AIProvider;
  /** Chat IDs allowed to use the bot. Empty = fail closed, refuse everyone (see docs/security-model.md § Isolation). */
  allowedChatIds: Set<number>;
}

const HELP_TEXT = `Hermes Digital Factory bot.

/projects — list all projects
/status <name> — status + task progress
/logs <name> — recent activity
/test <name> — run the BUILD -> TEST -> FIX cycle
/deploy <name> — prepare a deployment (requires a second /deploy <name> confirm)
/stop <name> — stop a running deployment
/new <name> <website|saas|ecommerce|ai-saas> [feature ...] — create a project

You can also just describe what you want, e.g. "Build me a landing page for Alpha Red".`;

function formatSummaryLine(p: { name: string; status: string; taskProgress: { done: number; total: number } }): string {
  return `${p.name} — ${p.status} (${p.taskProgress.done}/${p.taskProgress.total} tasks)`;
}

async function handleCommand(command: Command, deps: BotDeps): Promise<string> {
  const { factory } = deps;

  switch (command.type) {
    case "help":
      return HELP_TEXT;

    case "error":
      return command.message;

    case "projects": {
      const projects = await factory.listProjects();
      if (projects.length === 0) return "No projects yet. Use /new to create one.";
      return projects.map((p) => `${p.name} — ${p.status} (${p.type})`).join("\n");
    }

    case "status": {
      const summary = await factory.getProject(command.name);
      const tests = summary.latestTests.length
        ? summary.latestTests.map((t) => `  ${t.step}: ${t.skipped ? "skipped" : t.passed ? "passed" : "failed"}`).join("\n")
        : "  (no test runs yet)";
      return `${formatSummaryLine(summary)}\ntests:\n${tests}`;
    }

    case "logs": {
      const logs = await factory.getLogs(command.name);
      if (logs.length === 0) return "No log entries yet.";
      return logs
        .slice(-10)
        .map((l) => `${l.timestamp} — ${l.event}`)
        .join("\n");
    }

    case "test": {
      const result = await factory.runTests(command.name);
      return `${result.outcome} after ${result.attempts} attempt(s)\n${result.reason}`;
    }

    case "stop": {
      const result = await factory.stop(command.name, "telegram");
      return result.wasRunning ? `Stopped ${command.name}.` : `${command.name} wasn't running.`;
    }

    case "new": {
      await factory.createProject({ name: command.name, type: command.projectType, features: command.features });
      return `Created project "${command.name}" (${command.projectType}).`;
    }

    case "deploy": {
      if (!command.confirmed) {
        return `This will deploy "${command.name}" to production. To confirm, send:\n/deploy ${command.name} confirm`;
      }
      const result = await factory.deploy(command.name, "telegram");
      return `${result.outcome}: ${result.reason}${result.url ? `\n${result.url}` : ""}`;
    }

    case "natural_language": {
      const parsed = await parseNaturalLanguageIntent(deps.provider, command.text);
      if (parsed.kind === "unrecognized") {
        return "I couldn't understand that as a build request. Try /help for commands, or be more specific (e.g. \"Build me a landing page for Alpha Red\").";
      }
      await factory.createProject(parsed.intent);
      return `Created project "${parsed.intent.name}" (${parsed.intent.type}) with features: ${parsed.intent.features.join(", ") || "none"}.`;
    }
  }
}

export async function handleUpdate(update: TelegramUpdate, deps: BotDeps): Promise<void> {
  const message = update.message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  if (!deps.allowedChatIds.has(chatId)) {
    // Fail closed: don't even acknowledge unauthorized chats beyond a
    // terse notice — no project data, no command execution.
    await deps.telegram.sendMessage(chatId, "This bot is not configured for this chat.");
    return;
  }

  const command = parseCommand(message.text);
  let reply: string;
  try {
    reply = await handleCommand(command, deps);
  } catch (err) {
    reply = `Error: ${(err as Error).message}`;
  }
  await deps.telegram.sendMessage(chatId, reply);
}
