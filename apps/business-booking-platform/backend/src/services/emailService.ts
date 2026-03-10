import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

interface EmailTemplate {
	subject: string;
	html: string;
	text: string;
}

interface SendEmailOptions {
	to: string | string[];
	cc?: string | string[];
	bcc?: string | string[];
	template: EmailTemplate;
	attachments?: {
		filename: string;
		content: Buffer;
		contentType: string;
	}[];
}

class EmailService {
	private transporter?: nodemailer.Transporter;
	private useSendGrid: boolean;

	constructor() {
		// Determine email provider based on configuration
		this.useSendGrid =
			config.email.provider === 'sendgrid' && !!config.email.apiKey;

		if (this.useSendGrid) {
			// Initialize SendGrid
			sgMail.setApiKey(config.email.apiKey!);
			logger.info('Email service initialized with SendGrid');
		} else {
			// Fallback to SMTP
			const emailConfig = {
				host: config.email.smtp?.host || 'localhost',
				port: config.email.smtp?.port || 587,
				secure: config.email.smtp?.secure || false,
				auth: {
					user: config.email.smtp?.user || '',
					pass: config.email.smtp?.pass || '',
				},
			};

			this.transporter = nodemailer.createTransport(emailConfig);
			this.verifyConnection();
		}
	}

	private async verifyConnection(): Promise<void> {
		if (!this.transporter) {
return;
}

		try {
			await this.transporter.verify();
			logger.info('SMTP email service connected successfully');
		} catch (error) {
			logger.error('SMTP email service connection failed:', error);
		}
	}

	async sendEmail(options: SendEmailOptions): Promise<boolean> {
		try {
			if (this.useSendGrid) {
				return await this.sendWithSendGrid(options);
			} else {
				return await this.sendWithSMTP(options);
			}
		} catch (error) {
			logger.error('Failed to send email:', error);
			return false;
		}
	}

	private async sendWithSendGrid(options: SendEmailOptions): Promise<boolean> {
		try {
			const msg = {
				to: Array.isArray(options.to) ? options.to : [options.to],
				cc: options.cc
					? Array.isArray(options.cc)
						? options.cc
						: [options.cc]
					: undefined,
				bcc: options.bcc
					? Array.isArray(options.bcc)
						? options.bcc
						: [options.bcc]
					: undefined,
				from: {
					email: config.email.from,
					name: 'Vibe Booking',
				},
				subject: options.template.subject,
				html: options.template.html,
				text: options.template.text,
				attachments: options.attachments?.map((att) => ({
					filename: att.filename,
					content: att.content.toString('base64'),
					type: att.contentType,
					disposition: 'attachment',
				})),
			};

			const result = await sgMail.send(msg);
			logger.info('Email sent successfully via SendGrid', {
				messageId: result[0].headers['x-message-id'],
				to: options.to,
				subject: options.template.subject,
			});
			return true;
		} catch (error: any) {
			logger.error('SendGrid email failed:', {
				error: error.message,
				response: error.response?.body,
				code: error.code,
			});
			return false;
		}
	}

	private async sendWithSMTP(options: SendEmailOptions): Promise<boolean> {
		if (!this.transporter) {
			logger.error('SMTP transporter not initialized');
			return false;
		}

		try {
			const mailOptions = {
				from: config.email.from,
				to: options.to,
				cc: options.cc,
				bcc: options.bcc,
				subject: options.template.subject,
				html: options.template.html,
				text: options.template.text,
				attachments: options.attachments,
			};

			const result = await this.transporter.sendMail(mailOptions);
			logger.info(`Email sent successfully via SMTP: ${result.messageId}`);
			return true;
		} catch (error) {
			logger.error('SMTP email failed:', error);
			return false;
		}
	}

	// Booking confirmation email
	async sendBookingConfirmation(
		to: string,
		bookingDetails: {
			bookingId: string;
			hotelName: string;
			checkIn: string;
			checkOut: string;
			guestName: string;
			roomType: string;
			totalAmount: number;
		},
	): Promise<boolean> {
		const template: EmailTemplate = {
			subject: `🏨 Booking Confirmed - ${bookingDetails.bookingId}`,
			html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
          <div style="background: linear-gradient(135deg, #1C2951 0%, #355E3B 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #F7F3E9; margin: 0; font-size: 28px; font-weight: 600;">Booking Confirmed!</h1>
            <p style="color: #B8860B; margin: 10px 0 0 0; font-size: 16px;">Your luxury getaway awaits</p>
          </div>
          
          <div style="padding: 30px 20px; background-color: white;">
            <p style="color: #1C2951; font-size: 16px; line-height: 1.6;">Dear ${bookingDetails.guestName},</p>
            <p style="color: #64748b; font-size: 16px; line-height: 1.6;">Your booking has been confirmed and we're excited to welcome you!</p>
            
            <div style="background-color: #F7F3E9; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #B8860B;">
              <h3 style="color: #1C2951; margin: 0 0 20px 0; font-size: 20px;">Booking Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Booking ID:</td><td style="padding: 8px 0; color: #1C2951; font-weight: 700;">${bookingDetails.bookingId}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Hotel:</td><td style="padding: 8px 0; color: #1C2951; font-weight: 700;">${bookingDetails.hotelName}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Room Type:</td><td style="padding: 8px 0; color: #1C2951;">${bookingDetails.roomType}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Check-in:</td><td style="padding: 8px 0; color: #1C2951;">${bookingDetails.checkIn}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Check-out:</td><td style="padding: 8px 0; color: #1C2951;">${bookingDetails.checkOut}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Total Amount:</td><td style="padding: 8px 0; color: #355E3B; font-weight: 700; font-size: 18px;">$${bookingDetails.totalAmount.toFixed(2)}</td></tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #1C2951; font-size: 16px; margin: 0;">Thank you for choosing Vibe Booking!</p>
              <p style="color: #64748b; font-size: 14px; margin: 10px 0 0 0;">We're here to make your stay extraordinary.</p>
            </div>
          </div>
          
          <div style="background-color: #1C2951; padding: 20px; text-align: center;">
            <p style="color: #F7F3E9; margin: 0; font-size: 14px;">Best regards,<br><span style="color: #B8860B; font-weight: 600;">The Vibe Booking Team</span></p>
          </div>
        </div>
      `,
			text: `
        Booking Confirmed!
        
        Dear ${bookingDetails.guestName},
        
        Your booking has been confirmed and we're excited to welcome you!
        
        Booking Details:
        - Booking ID: ${bookingDetails.bookingId}
        - Hotel: ${bookingDetails.hotelName}
        - Room Type: ${bookingDetails.roomType}
        - Check-in: ${bookingDetails.checkIn}
        - Check-out: ${bookingDetails.checkOut}
        - Total Amount: $${bookingDetails.totalAmount.toFixed(2)}
        
        Thank you for choosing Vibe Booking!
        We're here to make your stay extraordinary.
        
        Best regards,
        The Vibe Booking Team
      `,
		};

		return this.sendEmail({ to, template });
	}

	// Password reset email
	async sendPasswordReset(
		to: string,
		resetToken: string,
		userEmail: string,
	): Promise<boolean> {
		const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3009'}/reset-password?token=${resetToken}`;

		const template: EmailTemplate = {
			subject: '🔐 Password Reset Request - Vibe Booking',
			html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
          <div style="background: linear-gradient(135deg, #1C2951 0%, #355E3B 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #F7F3E9; margin: 0; font-size: 28px; font-weight: 600;">Password Reset</h1>
            <p style="color: #B8860B; margin: 10px 0 0 0; font-size: 16px;">Secure your account</p>
          </div>
          
          <div style="padding: 30px 20px; background-color: white;">
            <p style="color: #1C2951; font-size: 16px; line-height: 1.6;">Hello,</p>
            <p style="color: #64748b; font-size: 16px; line-height: 1.6;">You requested a password reset for your Vibe Booking account (${userEmail}).</p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #1C2951 0%, #355E3B 100%); color: #F7F3E9; padding: 15px 30px; 
                        text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;
                        box-shadow: 0 4px 6px -1px rgba(28, 41, 81, 0.1);">
                🔐 Reset Password
              </a>
            </div>
            
            <div style="background-color: #FEF2F2; padding: 20px; border-radius: 8px; border-left: 4px solid #DC2626;">
              <p style="color: #DC2626; margin: 0; font-size: 14px; font-weight: 600;">⏰ This link expires in 1 hour for security reasons.</p>
              <p style="color: #64748b; margin: 10px 0 0 0; font-size: 14px;">If you didn't request this reset, please ignore this email.</p>
            </div>
          </div>
          
          <div style="background-color: #1C2951; padding: 20px; text-align: center;">
            <p style="color: #F7F3E9; margin: 0; font-size: 14px;">Best regards,<br><span style="color: #B8860B; font-weight: 600;">The Vibe Booking Team</span></p>
          </div>
        </div>
      `,
			text: `
        Password Reset Request
        
        Hello,
        
        You requested a password reset for your Vibe Booking account (${userEmail}).
        
        Click the link below to reset your password:
        ${resetUrl}
        
        This link will expire in 1 hour for security reasons.
        If you didn't request this reset, please ignore this email.
        
        Best regards,
        The Vibe Booking Team
      `,
		};

		return this.sendEmail({ to, template });
	}

	// Payment receipt email
	async sendPaymentReceipt(
		to: string,
		paymentDetails: {
			bookingId: string;
			amount: number;
			paymentMethod: string;
			transactionId: string;
			hotelName: string;
			guestName: string;
		},
	): Promise<boolean> {
		const template: EmailTemplate = {
			subject: `💳 Payment Receipt - ${paymentDetails.bookingId}`,
			html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
          <div style="background: linear-gradient(135deg, #355E3B 0%, #16a34a 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #F7F3E9; margin: 0; font-size: 28px; font-weight: 600;">Payment Received</h1>
            <p style="color: #B8860B; margin: 10px 0 0 0; font-size: 16px;">Transaction completed successfully</p>
          </div>
          
          <div style="padding: 30px 20px; background-color: white;">
            <p style="color: #1C2951; font-size: 16px; line-height: 1.6;">Dear ${paymentDetails.guestName},</p>
            <p style="color: #64748b; font-size: 16px; line-height: 1.6;">We have successfully received your payment for booking ${paymentDetails.bookingId}.</p>
            
            <div style="background-color: #F0F9FF; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #16a34a;">
              <h3 style="color: #1C2951; margin: 0 0 20px 0; font-size: 20px;">Payment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Booking ID:</td><td style="padding: 8px 0; color: #1C2951; font-weight: 700;">${paymentDetails.bookingId}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Hotel:</td><td style="padding: 8px 0; color: #1C2951;">${paymentDetails.hotelName}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Amount:</td><td style="padding: 8px 0; color: #16a34a; font-weight: 700; font-size: 18px;">$${paymentDetails.amount.toFixed(2)}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Payment Method:</td><td style="padding: 8px 0; color: #1C2951;">${paymentDetails.paymentMethod}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Transaction ID:</td><td style="padding: 8px 0; color: #1C2951; font-family: monospace; font-size: 14px;">${paymentDetails.transactionId}</td></tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #16a34a; font-size: 16px; margin: 0; font-weight: 600;">✅ Payment Confirmed</p>
              <p style="color: #64748b; font-size: 14px; margin: 10px 0 0 0;">Your reservation is now fully secured.</p>
            </div>
          </div>
          
          <div style="background-color: #1C2951; padding: 20px; text-align: center;">
            <p style="color: #F7F3E9; margin: 0; font-size: 14px;">Best regards,<br><span style="color: #B8860B; font-weight: 600;">The Vibe Booking Team</span></p>
          </div>
        </div>
      `,
			text: `
        Payment Received
        
        Dear ${paymentDetails.guestName},
        
        We have successfully received your payment for booking ${paymentDetails.bookingId}.
        
        Payment Details:
        - Booking ID: ${paymentDetails.bookingId}
        - Hotel: ${paymentDetails.hotelName}
        - Amount: $${paymentDetails.amount.toFixed(2)}
        - Payment Method: ${paymentDetails.paymentMethod}
        - Transaction ID: ${paymentDetails.transactionId}
        
        Payment Confirmed ✅
        Your reservation is now fully secured.
        
        Best regards,
        The Vibe Booking Team
      `,
		};

		return this.sendEmail({ to, template });
	}

	// Refund notification email
	async sendRefundNotification(
		to: string,
		refundDetails: {
			bookingId: string;
			refundAmount: number;
			reason: string;
			processingTime: string;
			guestName: string;
		},
	): Promise<boolean> {
		const template: EmailTemplate = {
			subject: `💰 Refund Processed - ${refundDetails.bookingId}`,
			html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #F7F3E9; margin: 0; font-size: 28px; font-weight: 600;">Refund Processed</h1>
            <p style="color: #FEF2F2; margin: 10px 0 0 0; font-size: 16px;">Your refund has been initiated</p>
          </div>
          
          <div style="padding: 30px 20px; background-color: white;">
            <p style="color: #1C2951; font-size: 16px; line-height: 1.6;">Dear ${refundDetails.guestName},</p>
            <p style="color: #64748b; font-size: 16px; line-height: 1.6;">Your refund request has been processed successfully.</p>
            
            <div style="background-color: #FEF2F2; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #dc2626;">
              <h3 style="color: #1C2951; margin: 0 0 20px 0; font-size: 20px;">Refund Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Booking ID:</td><td style="padding: 8px 0; color: #1C2951; font-weight: 700;">${refundDetails.bookingId}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Refund Amount:</td><td style="padding: 8px 0; color: #dc2626; font-weight: 700; font-size: 18px;">$${refundDetails.refundAmount.toFixed(2)}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Reason:</td><td style="padding: 8px 0; color: #1C2951;">${refundDetails.reason}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Processing Time:</td><td style="padding: 8px 0; color: #1C2951;">${refundDetails.processingTime}</td></tr>
              </table>
            </div>
            
            <div style="background-color: #F0F9FF; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="color: #1C2951; margin: 0; font-size: 14px; font-weight: 600;">💳 The refund will appear in your original payment method within the specified processing time.</p>
              <p style="color: #64748b; margin: 10px 0 0 0; font-size: 14px;">If you have any questions, please contact our support team.</p>
            </div>
          </div>
          
          <div style="background-color: #1C2951; padding: 20px; text-align: center;">
            <p style="color: #F7F3E9; margin: 0; font-size: 14px;">Best regards,<br><span style="color: #B8860B; font-weight: 600;">The Vibe Booking Team</span></p>
          </div>
        </div>
      `,
			text: `
        Refund Processed
        
        Dear ${refundDetails.guestName},
        
        Your refund request has been processed successfully.
        
        Refund Details:
        - Booking ID: ${refundDetails.bookingId}
        - Refund Amount: $${refundDetails.refundAmount.toFixed(2)}
        - Reason: ${refundDetails.reason}
        - Processing Time: ${refundDetails.processingTime}
        
        The refund will appear in your original payment method within the specified processing time.
        If you have any questions, please contact our support team.
        
        Best regards,
        The Vibe Booking Team
      `,
		};

		return this.sendEmail({ to, template });
	}

	// Payment failure notification email
	async sendPaymentFailureNotification(details: {
		email: string;
		bookingId: string;
		guestName: string;
		errorMessage: string;
		errorCode?: string;
	}): Promise<boolean> {
		const template: EmailTemplate = {
			subject: `❌ Payment Failed - ${details.bookingId}`,
			html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #F7F3E9; margin: 0; font-size: 28px; font-weight: 600;">Payment Failed</h1>
            <p style="color: #FEF2F2; margin: 10px 0 0 0; font-size: 16px;">Action required for your booking</p>
          </div>
          
          <div style="padding: 30px 20px; background-color: white;">
            <p style="color: #1C2951; font-size: 16px; line-height: 1.6;">Dear ${details.guestName},</p>
            <p style="color: #64748b; font-size: 16px; line-height: 1.6;">We were unable to process your payment for booking ${details.bookingId}.</p>
            
            <div style="background-color: #FEF2F2; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #dc2626;">
              <h3 style="color: #1C2951; margin: 0 0 20px 0; font-size: 20px;">Error Details</h3>
              <p style="color: #dc2626; margin: 0; font-weight: 600;">${details.errorMessage}</p>
              ${details.errorCode ? `<p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Error Code: ${details.errorCode}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #1C2951; font-size: 16px; margin: 0 0 20px 0;">Please update your payment method to secure your reservation.</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3009'}/bookings/${details.bookingId}/payment" 
                 style="background: linear-gradient(135deg, #1C2951 0%, #355E3B 100%); color: #F7F3E9; padding: 15px 30px; 
                        text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;
                        box-shadow: 0 4px 6px -1px rgba(28, 41, 81, 0.1);">
                💳 Update Payment Method
              </a>
            </div>
          </div>
          
          <div style="background-color: #1C2951; padding: 20px; text-align: center;">
            <p style="color: #F7F3E9; margin: 0; font-size: 14px;">Best regards,<br><span style="color: #B8860B; font-weight: 600;">The Vibe Booking Team</span></p>
          </div>
        </div>
      `,
			text: `
        Payment Failed
        
        Dear ${details.guestName},
        
        We were unable to process your payment for booking ${details.bookingId}.
        
        Error Details:
        ${details.errorMessage}
        ${details.errorCode ? `Error Code: ${details.errorCode}` : ''}
        
        Please update your payment method to secure your reservation.
        
        Best regards,
        The Vibe Booking Team
      `,
		};

		return this.sendEmail({ to: details.email, template });
	}
}

export const emailService = new EmailService();
export default emailService;
