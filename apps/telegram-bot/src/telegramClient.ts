/**
 * Minimal Telegram Bot API client — long polling + sendMessage only, no SDK
 * dependency. https://core.telegram.org/bots/api
 */

export interface TelegramMessage {
  message_id: number;
  date: number;
  chat: { id: number; type: string; username?: string; title?: string };
  from?: { id: number; username?: string; first_name?: string };
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export class TelegramClient {
  private readonly base: string;

  constructor(token: string) {
    this.base = `https://api.telegram.org/bot${token}`;
  }

  async getUpdates(offset: number, timeoutSeconds: number): Promise<TelegramUpdate[]> {
    const res = await fetch(`${this.base}/getUpdates`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ offset, timeout: timeoutSeconds }),
    });
    const body = (await res.json()) as { ok: boolean; result: TelegramUpdate[]; description?: string };
    if (!body.ok) throw new Error(`getUpdates failed: ${body.description}`);
    return body.result;
  }

  async sendMessage(chatId: number, text: string): Promise<void> {
    const res = await fetch(`${this.base}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // Telegram messages cap at 4096 chars.
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4096) }),
    });
    const body = (await res.json()) as { ok: boolean; description?: string };
    if (!body.ok) throw new Error(`sendMessage failed: ${body.description}`);
  }
}
