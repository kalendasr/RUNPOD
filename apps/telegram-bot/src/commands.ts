export type Command =
  | { type: "help" }
  | { type: "projects" }
  | { type: "status"; name: string }
  | { type: "logs"; name: string }
  | { type: "test"; name: string }
  | { type: "stop"; name: string }
  | { type: "new"; name: string; projectType: string; features: string[] }
  | { type: "deploy"; name: string; confirmed: boolean }
  | { type: "natural_language"; text: string }
  | { type: "error"; message: string };

const VALID_TYPES = ["website", "saas", "ecommerce", "ai-saas"];

/** Parses one Telegram message into a Command. Pure — no I/O. */
export function parseCommand(text: string): Command {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) {
    return { type: "natural_language", text: trimmed };
  }

  const [rawCommand, ...args] = trimmed.slice(1).split(/\s+/);
  const command = rawCommand.split("@")[0].toLowerCase(); // strip @BotName suffix (group chats)

  switch (command) {
    case "start":
    case "help":
      return { type: "help" };

    case "projects":
      return { type: "projects" };

    case "status":
      if (!args[0]) return { type: "error", message: "Usage: /status <project-name>" };
      return { type: "status", name: args[0] };

    case "logs":
      if (!args[0]) return { type: "error", message: "Usage: /logs <project-name>" };
      return { type: "logs", name: args[0] };

    case "test":
      if (!args[0]) return { type: "error", message: "Usage: /test <project-name>" };
      return { type: "test", name: args[0] };

    case "stop":
      if (!args[0]) return { type: "error", message: "Usage: /stop <project-name>" };
      return { type: "stop", name: args[0] };

    case "new": {
      const [name, projectType, ...features] = args;
      if (!name || !projectType) {
        return { type: "error", message: "Usage: /new <name> <website|saas|ecommerce|ai-saas> [feature ...]" };
      }
      if (!VALID_TYPES.includes(projectType)) {
        return { type: "error", message: `Invalid type "${projectType}". Must be one of: ${VALID_TYPES.join(", ")}` };
      }
      return { type: "new", name, projectType, features };
    }

    case "deploy": {
      if (!args[0]) return { type: "error", message: "Usage: /deploy <project-name> — then /deploy <project-name> confirm" };
      const confirmed = args[1]?.toLowerCase() === "confirm";
      return { type: "deploy", name: args[0], confirmed };
    }

    default:
      return { type: "error", message: `Unknown command: /${command}. Send /help for the list of commands.` };
  }
}
