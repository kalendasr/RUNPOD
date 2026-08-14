// Email is abstracted behind this interface so a real provider (Resend,
// SendGrid, SES, ...) can be swapped in later without touching call sites —
// see docs/architecture.md's note on abstracting external providers. The
// default implementation just logs, since no email provider credentials
// exist yet (sending real email requires a human-approved provider setup
// per docs/security-model.md § Human approval gates).

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log(`[email:dev] to=${message.to} subject="${message.subject}"\n${message.body}`);
  }
}

export const emailProvider: EmailProvider = new ConsoleEmailProvider();
