import nodemailer from "nodemailer";

function publicWebOrigin(): string {
  return process.env.NEXT_PUBLIC_WEB_URL || "";
}

function canSend(): boolean {
  const host = process.env.SMTP_HOST || "";
  if (!host) return false;
  if (process.env.NODE_ENV === "production") {
    return !/(localhost|127\.0\.0\.1|mailpit)/i.test(host);
  }
  return true;
}

async function send(to: string, subject: string, text: string, html: string) {
  if (!canSend()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Transactional email is not configured");
    }
    return;
  }

  const port = Number(process.env.SMTP_PORT || "587");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
}

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${publicWebOrigin()}/verify-email?token=${encodeURIComponent(token)}`;
  await send(
    email,
    "Verify your email for The Queue",
    `Verify your email: ${url}`,
    `<p>Verify your email for The Queue by opening <a href="${url}">this link</a>.</p>`,
  );
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${publicWebOrigin()}/reset-password?token=${encodeURIComponent(token)}`;
  await send(
    email,
    "Reset your The Queue password",
    `Reset your password: ${url}`,
    `<p>Reset your The Queue password <a href="${url}">here</a>. If you did not request this, ignore this email.</p>`,
  );
}

export async function sendHostDecisionEmail(
  email: string,
  approved: boolean,
) {
  const subject = approved
    ? "Your host application was approved"
    : "Your host application was not approved";
  const text = approved
    ? "Your host application was approved. You can finish station setup in The Queue."
    : "Your host application was not approved. You can review the decision in your account.";
  await send(email, subject, text, `<p>${text}</p>`);
}
