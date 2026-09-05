const nodemailer = require('nodemailer');
const config = require('../config/environment');
const logger = require('../utils/logger');

let transporter = null;

/**
 * Initialize or get Nodemailer Transporter
 */
const getTransporter = () => {
  if (!transporter) {
    if (config.EMAIL_USER && config.EMAIL_PASSWORD) {
      transporter = nodemailer.createTransport({
        service: config.EMAIL_SERVICE || 'gmail',
        auth: {
          user: config.EMAIL_USER,
          pass: config.EMAIL_PASSWORD.replace(/\s+/g, ''), // Strip spaces from Google App Password
        },
      });
    }
  }
  return transporter;
};

/**
 * Send Password Reset Confirmation Code Email
 * @param {string} toEmail - Recipient email address
 * @param {object} options - { code, resetToken, username }
 */
const sendPasswordResetEmail = async (toEmail, { code, resetToken, username }) => {
  const mailTransporter = getTransporter();
  const displayName = username || 'User';
  const resetUrl = `https://trendora-sage.vercel.app/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { margin: 0; padding: 0; background-color: #0b0c10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .wrapper { max-width: 520px; margin: 30px auto; background: #14161f; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 36px 32px; color: #ffffff; }
        .logo-text { font-size: 26px; font-weight: 800; background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-align: center; margin-bottom: 24px; }
        h2 { font-size: 20px; font-weight: 700; margin: 0 0 12px 0; color: #ffffff; text-align: center; }
        p { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin: 0 0 16px 0; }
        .code-container { background: rgba(168, 85, 247, 0.08); border: 2px dashed rgba(168, 85, 247, 0.4); border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
        .code-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #a855f7; font-weight: 600; margin-bottom: 8px; }
        .code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ffffff; font-family: monospace; }
        .expiry-note { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 8px; }
        .divider { border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0; }
        .btn-link { display: block; width: fit-content; margin: 12px auto; background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
        .footer { font-size: 11px; color: #64748b; text-align: center; margin-top: 24px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="logo-text">Trendora</div>
        <h2>Password Reset Confirmation</h2>
        <p>Hello <strong>${displayName}</strong>,</p>
        <p>We received a request to reset your Trendora password. Use the 6-digit confirmation code below to verify your identity and set a new password:</p>
        
        <div class="code-container">
          <div class="code-label">Your Confirmation Code</div>
          <div class="code">${code}</div>
          <div class="expiry-note">⏱ Valid for 15 minutes only</div>
        </div>

        <p style="text-align: center; font-size: 13px; color: #94a3b8;">Alternatively, you can reset your password directly using the link below:</p>
        <a href="${resetUrl}" class="btn-link">Reset Password Directly</a>

        <div class="divider"></div>
        <div class="footer">
          If you did not request this password reset, you can safely ignore this email. No one can change your password without this confirmation code.
          <br><br>
          &copy; ${new Date().getFullYear()} Trendora. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Trendora - Password Reset Confirmation Code

Hello ${displayName},

We received a request to reset your Trendora password.

Your 6-digit confirmation code is: ${code}

This code is valid for 15 minutes.

Alternatively, you can reset your password directly at:
${resetUrl}

If you did not request this, please ignore this email. Your account remains safe.
`;

  if (!mailTransporter) {
    logger.warn('Email service not configured (EMAIL_USER / EMAIL_PASSWORD missing in environment).', {
      to: toEmail,
      code,
      instruction: 'To send real emails to Gmail, add EMAIL_USER and EMAIL_PASSWORD in .env or Render dashboard.',
    });
    return false;
  }

  try {
    const info = await mailTransporter.sendMail({
      from: `"${config.EMAIL_FROM_NAME || 'Trendora'}" <${config.EMAIL_USER}>`,
      to: toEmail,
      subject: `Trendora - Your Confirmation Code is ${code}`,
      text,
      html,
    });
    logger.info('Password reset email sent successfully', { messageId: info.messageId, to: toEmail });
    return true;
  } catch (err) {
    logger.error('Failed to send email via nodemailer', { error: err.message, to: toEmail });
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
  getTransporter,
};
