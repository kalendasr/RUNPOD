import { TelegramClient } from "./telegramClient.js";
import { FactoryClient } from "./factoryClient.js";
import { handleUpdate, type BotDeps } from "./bot.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required (see .env.example).");
  process.exit(1);
}

const allowedChatIds = new Set(
  (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number),
);

if (allowedChatIds.size === 0) {
  console.warn(
    "TELEGRAM_ALLOWED_CHAT_IDS is empty — the bot will refuse every chat. " +
      "Message the bot once, then check factory-api logs or Telegram's getUpdates to find your chat ID.",
  );
}

const deps: BotDeps = {
  telegram: new TelegramClient(token),
  factory: new FactoryClient(process.env.FACTORY_API_URL ?? "http://localhost:4100"),
  allowedChatIds,
};

async function main(): Promise<void> {
  console.log("Hermes Telegram bot polling for updates...");
  let offset = 0;
  while (true) {
    let updates;
    try {
      updates = await deps.telegram.getUpdates(offset, 30);
    } catch (err) {
      console.error("getUpdates failed, retrying in 5s:", (err as Error).message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      continue;
    }

    for (const update of updates) {
      offset = update.update_id + 1;
      handleUpdate(update, deps).catch((err) => console.error("Error handling update:", err));
    }
  }
}

main();
