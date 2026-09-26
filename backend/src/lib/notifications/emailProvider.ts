import dns from "dns";
import nodemailer, { Transporter } from "nodemailer";
import { env } from "../../config/env";

// Some hosts (e.g. Railway) have no outbound IPv6 route. Gmail's SMTP
// hostname resolves to both A and AAAA records, and Node picks whichever
// DNS returns first — when that's the AAAA record, the connection fails
// with ENETUNREACH. nodemailer v10's typed options dropped the old
// per-transport `family` knob, so prefer IPv4 at the process level instead.
dns.setDefaultResultOrder("ipv4first");

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.smtpHost) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    });
  }
  return transporter;
}

// Sends via SMTP when configured; otherwise logs the rendered email and
// resolves as if it sent. Unconfigured SMTP is an expected dev-mode state
// (this environment has no real mail server) — same "simulate when real
// infra is unavailable" convention as the simulated e-Invoice generator and
// the CUSTOM-only delivery adapter. Only throws for a genuine send failure
// against a configured server.
export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const client = getTransporter();
  if (!client) {
    console.info(`[email:simulated] to=${to} subject="${subject}"\n${body}`);
    return;
  }
  await client.sendMail({
    from: `"${env.smtpFromName}" <${env.smtpFromEmail}>`,
    to,
    subject,
    html: body,
  });
}
