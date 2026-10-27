import nodemailer from 'nodemailer';
import type { Config } from '../../core/config.ts';
import type { Db } from '../../core/db.ts';
import { log } from '../../core/log.ts';

export type Mailer = { send(msg: { to: string; subject: string; text: string }): Promise<void> } | null;

/** Real delivery only when SMTP_URL is set. The Outbox always records the email. */
export function createMailer(cfg: Config): Mailer {
  if (!cfg.SMTP_URL) return null;
  const transport = nodemailer.createTransport(cfg.SMTP_URL);
  return {
    async send(msg) {
      await transport.sendMail({ from: cfg.EMAIL_FROM, ...msg });
    },
  };
}

export async function sendEmail(
  db: Db,
  mailer: Mailer,
  msg: { kind: 'booked' | 'cancelled' | 'welcome'; to: string; subject: string; text: string },
) {
  await db.Email.create(msg);
  if (!mailer) return;
  // Delivery problems must not fail the booking that caused them.
  mailer.send(msg).catch((err: Error) => log.warn('email delivery failed', { kind: msg.kind, err: err.message }));
}
