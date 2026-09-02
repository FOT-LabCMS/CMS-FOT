const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Send an email using the configured SMTP server.
 */
const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    throw new Error("Recipient email address is required.");
  }

  if (!process.env.SMTP_HOST) {
    throw new Error("SMTP_HOST is not configured.");
  }

  if (!process.env.SMTP_USER) {
    throw new Error("SMTP_USER is not configured.");
  }

  if (!process.env.SMTP_PASSWORD) {
    throw new Error("SMTP_PASSWORD is not configured.");
  }

  const info = await transporter.sendMail({
    from: {
      name: process.env.MAIL_FROM_NAME || "FOTLAB",
      address: process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER,
    },
    to,
    subject,
    text,
    html,
  });

  console.log(
    `[EmailService] Email sent successfully to ${to}. Message ID: ${info.messageId}`,
  );

  return info;
};

/**
 * Verify SMTP connection.
 */
const verifyEmailConnection = async () => {
  try {
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASSWORD
    ) {
      console.warn(
        "[EmailService] SMTP configuration is incomplete. Email verification skipped.",
      );
      return false;
    }

    await transporter.verify();

    console.log(
      `[EmailService] SMTP connection verified successfully: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}`,
    );

    return true;
  } catch (error) {
    console.error("[EmailService] SMTP verification failed:");
    console.error(error);

    return false;
  }
};

module.exports = {
  sendEmail,
  verifyEmailConnection,
};