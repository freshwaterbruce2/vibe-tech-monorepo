import sgMail from '@sendgrid/mail'
import nodemailer from 'nodemailer'

// Email Template Types
export interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

export interface EmailRecipient {
  email: string
  name?: string
}

export interface EmailOptions {
  to: EmailRecipient | EmailRecipient[]
  template: EmailTemplate
  data?: Record<string, any>
  attachments?: {
    filename: string
    content: string | Buffer
    contentType?: string
  }[]
}

// Predefined email templates
export const EmailTemplates = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  SUBSCRIPTION_ACTIVATED: 'subscription_activated',
  SUBSCRIPTION_EXPIRED: 'subscription_expired',
  USAGE_LIMIT_WARNING: 'usage_limit_warning',
  INVOICE: 'invoice',
  TRIAL_ENDING: 'trial_ending',
  DOOR_SCHEDULE_REPORT: 'door_schedule_report',
  SYSTEM_ALERT: 'system_alert',
  TENANT_SUSPENDED: 'tenant_suspended',
} as const

export type EmailTemplateType =
  (typeof EmailTemplates)[keyof typeof EmailTemplates]

class EmailService {
  private isConfigured = false
  private provider: 'sendgrid' | 'smtp' | 'console' = 'console'
  private transporter?: nodemailer.Transporter
  private templates = new Map<EmailTemplateType, EmailTemplate>()

  constructor() {
    this.initialize()
    this.loadTemplates()
  }

  private initialize(): void {
    // Try SendGrid first
    const sendgridApiKey = process.env.SENDGRID_API_KEY
    if (sendgridApiKey) {
      try {
        sgMail.setApiKey(sendgridApiKey)
        this.provider = 'sendgrid'
        this.isConfigured = true
        console.log('Email service initialized with SendGrid')
        return
      } catch (error) {
        console.warn('Failed to initialize SendGrid:', error)
      }
    }

    // Fallback to SMTP (for development or alternative providers)
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = parseInt(process.env.SMTP_PORT ?? '587')
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (smtpHost && smtpUser && smtpPass) {
      try {
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        })
        this.provider = 'smtp'
        this.isConfigured = true
        console.log('Email service initialized with SMTP')
        return
      } catch (error) {
        console.warn('Failed to initialize SMTP:', error)
      }
    }

    // Fallback to console logging for development
    console.warn(
      'Email service not configured. Emails will be logged to console.'
    )
  }

  private loadTemplates(): void {
    // Welcome email template
    this.templates.set(EmailTemplates.WELCOME, {
      subject: 'Welcome to {{companyName}} Shipping Management',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, {{primaryColor}} 0%, {{secondaryColor}} 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Welcome to {{companyName}}!</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Hi {{userName}},</h2>
            <p>Thank you for joining {{companyName}}. Your warehouse shipping management system is ready to use!</p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Your Account Details:</h3>
              <ul style="list-style: none; padding: 0;">
                <li><strong>Company:</strong> {{tenantName}}</li>
                <li><strong>Warehouse:</strong> {{warehouseName}}</li>
                <li><strong>Subscription:</strong> {{subscriptionTier}}</li>
                <li><strong>Trial Ends:</strong> {{trialEndDate}}</li>
              </ul>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Quick Start Guide:</h3>
              <ol>
                <li>Configure your warehouse settings</li>
                <li>Add your team members</li>
                <li>Start scheduling doors</li>
                <li>Track pallet counts</li>
                <li>Export reports as needed</li>
              </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="{{dashboardUrl}}" style="display: inline-block; background: {{primaryColor}}; color: white; padding: 15px 30px; border-radius: 5px; text-decoration: none; font-weight: bold;">
                Go to Dashboard
              </a>
            </div>

            <p>Need help? Check out our <a href="{{docsUrl}}">documentation</a> or reply to this email.</p>

            <p>Best regards,<br>The {{companyName}} Team</p>
          </div>
        </div>
      `,
      text: `Welcome to {{companyName}}!

Hi {{userName}},

Thank you for joining {{companyName}}. Your warehouse shipping management system is ready to use!

Your Account Details:
- Company: {{tenantName}}
- Warehouse: {{warehouseName}}
- Subscription: {{subscriptionTier}}
- Trial Ends: {{trialEndDate}}

Quick Start Guide:
1. Configure your warehouse settings
2. Add your team members
3. Start scheduling doors
4. Track pallet counts
5. Export reports as needed

Go to Dashboard: {{dashboardUrl}}

Need help? Check out our documentation at {{docsUrl}} or reply to this email.

Best regards,
The {{companyName}} Team`,
    })

    // Password reset template
    this.templates.set(EmailTemplates.PASSWORD_RESET, {
      subject: 'Password Reset Request - {{companyName}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: {{primaryColor}}; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Password Reset Request</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Hi {{userName}},</h2>
            <p>We received a request to reset your password for your {{companyName}} account.</p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p>Click the button below to reset your password:</p>
              <a href="{{resetUrl}}" style="display: inline-block; background: {{primaryColor}}; color: white; padding: 15px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; margin: 20px 0;">
                Reset Password
              </a>
              <p style="font-size: 12px; color: #666;">This link will expire in 1 hour.</p>
            </div>

            <p>If you didn't request this, please ignore this email. Your password won't be changed.</p>

            <p style="font-size: 12px; color: #666;">
              Or copy and paste this link into your browser:<br>
              {{resetUrl}}
            </p>

            <p>Best regards,<br>The {{companyName}} Team</p>
          </div>
        </div>
      `,
      text: `Password Reset Request

Hi {{userName}},

We received a request to reset your password for your {{companyName}} account.

Click this link to reset your password:
{{resetUrl}}

This link will expire in 1 hour.

If you didn't request this, please ignore this email. Your password won't be changed.

Best regards,
The {{companyName}} Team`,
    })

    // Usage limit warning template
    this.templates.set(EmailTemplates.USAGE_LIMIT_WARNING, {
      subject: 'Usage Limit Warning - {{companyName}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #ff9800; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">⚠️ Usage Limit Warning</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Hi {{userName}},</h2>
            <p>Your {{companyName}} account is approaching its usage limits.</p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Current Usage:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Doors Processed:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{{doorsUsed}} / {{doorsLimit}}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Active Users:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{{usersActive}} / {{usersLimit}}</td>
                </tr>
                <tr>
                  <td style="padding: 10px;"><strong>Usage Percentage:</strong></td>
                  <td style="padding: 10px; text-align: right;"><strong>{{usagePercentage}}%</strong></td>
                </tr>
              </table>
            </div>

            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
              <p style="margin: 0;"><strong>Action Required:</strong> Consider upgrading your plan to avoid service interruption.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="{{upgradeUrl}}" style="display: inline-block; background: #4caf50; color: white; padding: 15px 30px; border-radius: 5px; text-decoration: none; font-weight: bold;">
                Upgrade Plan
              </a>
            </div>

            <p>Questions? Contact our support team or reply to this email.</p>

            <p>Best regards,<br>The {{companyName}} Team</p>
          </div>
        </div>
      `,
      text: `Usage Limit Warning

Hi {{userName}},

Your {{companyName}} account is approaching its usage limits.

Current Usage:
- Doors Processed: {{doorsUsed}} / {{doorsLimit}}
- Active Users: {{usersActive}} / {{usersLimit}}
- Usage Percentage: {{usagePercentage}}%

Action Required: Consider upgrading your plan to avoid service interruption.

Upgrade your plan: {{upgradeUrl}}

Questions? Contact our support team or reply to this email.

Best regards,
The {{companyName}} Team`,
    })

    // Door schedule report template
    this.templates.set(EmailTemplates.DOOR_SCHEDULE_REPORT, {
      subject: 'Daily Door Schedule Report - {{date}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <div style="background: {{primaryColor}}; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Daily Door Schedule Report</h1>
            <p style="color: white; margin: 10px 0;">{{date}}</p>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Summary Statistics</h3>
              <div style="display: flex; justify-content: space-around; text-align: center;">
                <div>
                  <h4 style="color: {{primaryColor}}; margin: 10px 0;">{{totalDoors}}</h4>
                  <p style="margin: 0; color: #666;">Total Doors</p>
                </div>
                <div>
                  <h4 style="color: {{primaryColor}}; margin: 10px 0;">{{totalPallets}}</h4>
                  <p style="margin: 0; color: #666;">Total Pallets</p>
                </div>
                <div>
                  <h4 style="color: {{primaryColor}}; margin: 10px 0;">{{efficiency}}%</h4>
                  <p style="margin: 0; color: #666;">Efficiency</p>
                </div>
              </div>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Door Schedule Details</h3>
              {{doorTableHtml}}
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Top Destinations</h3>
              {{destinationsTableHtml}}
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="{{dashboardUrl}}" style="display: inline-block; background: {{primaryColor}}; color: white; padding: 15px 30px; border-radius: 5px; text-decoration: none; font-weight: bold;">
                View Full Dashboard
              </a>
            </div>

            <p style="font-size: 12px; color: #666;">
              This is an automated report. To change your email preferences, visit your account settings.
            </p>
          </div>
        </div>
      `,
      text: `Daily Door Schedule Report - {{date}}

Summary Statistics:
- Total Doors: {{totalDoors}}
- Total Pallets: {{totalPallets}}
- Efficiency: {{efficiency}}%

View full dashboard: {{dashboardUrl}}

This is an automated report. To change your email preferences, visit your account settings.`,
    })
  }

  // Replace template variables with actual data
  private processTemplate(
    template: EmailTemplate,
    data: Record<string, any> = {}
  ): EmailTemplate {
    let html = template.html
    let text = template.text ?? ''
    let subject = template.subject

    // Add default values
    const defaultData = {
      companyName: process.env.COMPANY_NAME ?? 'ShipDock',
      primaryColor: '#1f2937',
      secondaryColor: '#3f4f5f',
      dashboardUrl: process.env.APP_URL ?? 'https://app.shipdock.io',
      docsUrl: process.env.DOCS_URL ?? 'https://docs.shipdock.io',
      ...data,
    }

    // Replace all template variables
    Object.entries(defaultData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      html = html.replace(regex, String(value))
      text = text.replace(regex, String(value))
      subject = subject.replace(regex, String(value))
    })

    return { subject, html, text }
  }

  // Send email using configured provider
  public async sendEmail(
    options: EmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to]
      const processedTemplate = this.processTemplate(
        options.template,
        options.data
      )

      if (this.provider === 'sendgrid') {
        return await this.sendWithSendGrid(
          recipients,
          processedTemplate,
          options.attachments
        )
      } else if (this.provider === 'smtp' && this.transporter) {
        return await this.sendWithSMTP(
          recipients,
          processedTemplate,
          options.attachments
        )
      } else {
        return this.logEmailToConsole(recipients, processedTemplate)
      }
    } catch (error) {
      console.error('Failed to send email:', error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  private async sendWithSendGrid(
    recipients: EmailRecipient[],
    template: EmailTemplate,
    attachments?: EmailOptions['attachments']
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const msg = {
        to: recipients.map(r => ({ email: r.email, name: r.name })),
        from: {
          email: process.env.SENDGRID_FROM_EMAIL ?? 'noreply@shipdock.io',
          name: process.env.SENDGRID_FROM_NAME ?? 'ShipDock',
        },
        subject: template.subject,
        html: template.html,
        text: template.text,
        attachments: attachments?.map(a => ({
          filename: a.filename,
          content:
            typeof a.content === 'string'
              ? a.content
              : a.content.toString('base64'),
          type: a.contentType,
        })),
      }

      const response = await sgMail.send(msg)
      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
      }
    } catch (error) {
      console.error('SendGrid error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SendGrid error',
      }
    }
  }

  private async sendWithSMTP(
    recipients: EmailRecipient[],
    template: EmailTemplate,
    attachments?: EmailOptions['attachments']
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: 'SMTP transporter not configured' }
    }

    try {
      const mailOptions = {
        from: `${process.env.SMTP_FROM_NAME ?? 'ShipDock'} <${process.env.SMTP_FROM_EMAIL ?? 'noreply@shipdock.io'}>`,
        to: recipients
          .map(r => (r.name ? `${r.name} <${r.email}>` : r.email))
          .join(', '),
        subject: template.subject,
        html: template.html,
        text: template.text,
        attachments: attachments?.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      }

      const info = await this.transporter.sendMail(mailOptions)
      return {
        success: true,
        messageId: info.messageId,
      }
    } catch (error) {
      console.error('SMTP error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMTP error',
      }
    }
  }

  private logEmailToConsole(
    recipients: EmailRecipient[],
    template: EmailTemplate
  ): { success: boolean; messageId?: string; error?: string } {
    console.log('=== EMAIL (Console Mode) ===')
    console.log('To:', recipients.map(r => r.email).join(', '))
    console.log('Subject:', template.subject)
    console.log('---')
    console.log(template.text ?? 'No text version')
    console.log('===========================')

    return {
      success: true,
      messageId: `console-${Date.now()}`,
    }
  }

  // Convenience methods for common emails
  public async sendWelcomeEmail(
    recipient: EmailRecipient,
    data: {
      userName: string
      tenantName: string
      warehouseName: string
      subscriptionTier: string
      trialEndDate: string
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.templates.get(EmailTemplates.WELCOME)
    if (!template) {
      return { success: false, error: 'Welcome template not found' }
    }

    return this.sendEmail({
      to: recipient,
      template,
      data,
    })
  }

  public async sendPasswordResetEmail(
    recipient: EmailRecipient,
    data: {
      userName: string
      resetUrl: string
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.templates.get(EmailTemplates.PASSWORD_RESET)
    if (!template) {
      return { success: false, error: 'Password reset template not found' }
    }

    return this.sendEmail({
      to: recipient,
      template,
      data,
    })
  }

  public async sendUsageLimitWarning(
    recipient: EmailRecipient,
    data: {
      userName: string
      doorsUsed: number
      doorsLimit: number
      usersActive: number
      usersLimit: number
      usagePercentage: number
      upgradeUrl: string
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.templates.get(EmailTemplates.USAGE_LIMIT_WARNING)
    if (!template) {
      return { success: false, error: 'Usage warning template not found' }
    }

    return this.sendEmail({
      to: recipient,
      template,
      data,
    })
  }

  public async sendDoorScheduleReport(
    recipients: EmailRecipient[],
    data: {
      date: string
      totalDoors: number
      totalPallets: number
      efficiency: number
      doorTableHtml: string
      destinationsTableHtml: string
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.templates.get(EmailTemplates.DOOR_SCHEDULE_REPORT)
    if (!template) {
      return { success: false, error: 'Report template not found' }
    }

    return this.sendEmail({
      to: recipients,
      template,
      data,
    })
  }

  // Verify email service configuration
  public async verifyConfiguration(): Promise<{
    success: boolean
    provider: string
    error?: string
  }> {
    if (this.provider === 'smtp' && this.transporter) {
      try {
        await this.transporter.verify()
        return { success: true, provider: 'smtp' }
      } catch (error) {
        return {
          success: false,
          provider: 'smtp',
          error:
            error instanceof Error ? error.message : 'SMTP verification failed',
        }
      }
    }

    return {
      success: this.isConfigured,
      provider: this.provider,
    }
  }
}

// Export singleton instance
export const emailService = new EmailService()
export default emailService
