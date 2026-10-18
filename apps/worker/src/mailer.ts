import nodemailer from "nodemailer";
import type { Config } from "./config.js";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
}

/** Abstraction de l'envoi : les tests injectent un faux, la production utilise SMTP. */
export interface Mailer {
  send(email: OutgoingEmail): Promise<void>;
}

export function createSmtpMailer(config: Config): Mailer {
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    auth: config.SMTP_USER
      ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD ?? "" }
      : undefined,
    // Sans délai, un serveur SMTP qui ne répond pas bloquerait le worker indéfiniment.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return {
    async send(email) {
      await transport.sendMail({
        from: config.MAIL_FROM,
        to: email.to,
        subject: email.subject,
        text: email.text,
      });
    },
  };
}
