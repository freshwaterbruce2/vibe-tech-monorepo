/**
 * Email Service for Cloudflare Workers
 * Handles SendGrid API integration for transactional emails
 */

export class EmailService {
  private sendgridApiKey: string;
  private fromEmail = 'noreply@dc8980shipping.com';
  private fromName = 'DC8980 Shipping';

  constructor(private env: any) {
    this.sendgridApiKey = env.SENDGRID_API_KEY;
  }

  async sendEmail(to: string, subject: string, html: string, text?: string) {
    if (!this.sendgridApiKey) {
      console.warn('SendGrid API key not configured, skipping email');
      return;
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sendgridApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: to }]
          }],
          from: {
            email: this.fromEmail,
            name: this.fromName
          },
          subject,
          content: [
            { type: 'text/plain', value: text || 'Please view this email in HTML' },
            { type: 'text/html', value: html }
          ]
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SendGrid error: ${error}`);
      }

      return true;
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(to: string, data: {
    tenantName: string;
    apiKey: string;
    subdomain: string;
  }) {
    const subject = `Welcome to DC8980 Shipping - ${data.tenantName}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0052CC; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f4f4f4; }
          .api-key { background: #fff; padding: 15px; border-left: 4px solid #0052CC; margin: 20px 0; font-family: monospace; }
          .cta-button { display: inline-block; background: #0052CC; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to DC8980 Shipping!</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.tenantName}!</h2>
            <p>Your warehouse management platform is ready. Here's everything you need to get started:</p>

            <h3>Your API Credentials</h3>
            <div class="api-key">
              <strong>API Key:</strong> ${data.apiKey}<br>
              <strong>Subdomain:</strong> ${data.subdomain}
            </div>

            <p><strong>Important:</strong> Please save your API key in a secure location. You won't be able to see it again.</p>

            <h3>Your Dashboard URL</h3>
            <p>Access your dashboard at: <a href="https://${data.subdomain}.dc8980shipping.com">https://${data.subdomain}.dc8980shipping.com</a></p>

            <h3>Next Steps</h3>
            <ol>
              <li>Log in to your dashboard</li>
              <li>Configure your warehouse settings</li>
              <li>Add team members</li>
              <li>Start managing your shipping operations</li>
            </ol>

            <p style="text-align: center; margin: 30px 0;">
              <a href="https://${data.subdomain}.dc8980shipping.com" class="cta-button">Go to Dashboard</a>
            </p>

            <p>If you have any questions, our support team is here to help at support@dc8980shipping.com</p>
          </div>
          <div class="footer">
            <p>© 2025 DC8980 Shipping. All rights reserved.</p>
            <p>You're receiving this email because you signed up for DC8980 Shipping.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to DC8980 Shipping!

Your warehouse management platform is ready.

API Key: ${data.apiKey}
Subdomain: ${data.subdomain}

Access your dashboard at: https://${data.subdomain}.dc8980shipping.com

Please save your API key in a secure location.

If you have any questions, contact support@dc8980shipping.com
    `;

    return this.sendEmail(to, subject, html, text);
  }

  async sendUsageWarning(tenantId: string, data: {
    currentUsage: number;
    limit: number;
  }) {
    // Get tenant email from database
    const tenant = await this.env.DB.prepare(
      'SELECT config FROM tenants WHERE id = ?'
    ).bind(tenantId).first();

    if (!tenant || !tenant.config) return;

    const config = JSON.parse(tenant.config);
    if (!config.ownerEmail) return;

    const percentage = Math.round((data.currentUsage / data.limit) * 100);
    const subject = `Usage Warning: ${percentage}% of monthly limit reached`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FFA500; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f4f4f4; }
          .usage-box { background: #fff; padding: 15px; border-left: 4px solid #FFA500; margin: 20px 0; }
          .cta-button { display: inline-block; background: #0052CC; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Usage Warning</h1>
          </div>
          <div class="content">
            <h2>You've reached ${percentage}% of your monthly limit</h2>

            <div class="usage-box">
              <strong>Current Usage:</strong> ${data.currentUsage} doors<br>
              <strong>Monthly Limit:</strong> ${data.limit} doors<br>
              <strong>Remaining:</strong> ${data.limit - data.currentUsage} doors
            </div>

            <p>To avoid service interruption, consider upgrading your plan for increased limits and additional features.</p>

            <h3>Upgrade Options</h3>
            <ul>
              <li><strong>Starter Plan:</strong> 100 doors/month - $49/month</li>
              <li><strong>Professional Plan:</strong> Unlimited doors - $149/month</li>
              <li><strong>Enterprise Plan:</strong> Custom limits - Contact us</li>
            </ul>

            <p style="text-align: center; margin: 30px 0;">
              <a href="https://dc8980shipping.com/upgrade" class="cta-button">Upgrade Now</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(config.ownerEmail, subject, html);
  }

  async sendPasswordReset(to: string, data: {
    resetToken: string;
    userName: string;
  }) {
    const subject = 'Password Reset Request - DC8980 Shipping';
    const resetUrl = `https://dc8980shipping.com/reset-password?token=${data.resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0052CC; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f4f4f4; }
          .cta-button { display: inline-block; background: #0052CC; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.userName},</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="cta-button">Reset Password</a>
            </p>

            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(to, subject, html);
  }
}