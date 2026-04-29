import puppeteer from 'puppeteer';
import type { Browser } from 'puppeteer';
import { logger } from '../utils/logger.js';

interface BookingReceiptData {
	bookingId: string;
	guestName: string;
	guestEmail: string;
	hotelName: string;
	hotelAddress: string;
	roomType: string;
	checkIn: string;
	checkOut: string;
	nights: number;
	pricePerNight: number;
	taxes: number;
	totalAmount: number;
	paymentMethod: string;
	transactionId: string;
	bookingDate: string;
}

interface RefundReceiptData {
	refundId: string;
	bookingId: string;
	guestName: string;
	refundAmount: number;
	reason: string;
	refundDate: string;
	processingTime: string;
}

class PDFService {
	private browser: Browser | null = null;

	private async getBrowser(): Promise<Browser> {
		if (!this.browser) {
			this.browser = await puppeteer.launch({
				headless: true,
				args: ['--no-sandbox', '--disable-setuid-sandbox'],
			});
		}
		return this.browser;
	}

	async close(): Promise<void> {
		if (this.browser) {
			await this.browser.close();
			this.browser = null;
		}
	}

	private generateBookingReceiptHTML(data: BookingReceiptData): string {
		return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Booking Receipt</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
          }
          .receipt-title {
            font-size: 18px;
            color: #666;
          }
          .booking-info {
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .section {
            margin-bottom: 30px;
          }
          .section h3 {
            color: #2563eb;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 5px 0;
          }
          .info-row:nth-child(even) {
            background-color: #f9fafb;
          }
          .label {
            font-weight: bold;
            color: #374151;
          }
          .value {
            color: #111827;
          }
          .amount-section {
            background-color: #f0f9ff;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
          }
          .total-amount {
            font-size: 20px;
            font-weight: bold;
            color: #1e40af;
            text-align: right;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 2px solid #2563eb;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">VIBE BOOKING</div>
          <div class="receipt-title">Booking Confirmation Receipt</div>
        </div>

        <div class="booking-info">
          <div class="info-row">
            <span class="label">Booking ID:</span>
            <span class="value">${data.bookingId}</span>
          </div>
          <div class="info-row">
            <span class="label">Booking Date:</span>
            <span class="value">${data.bookingDate}</span>
          </div>
        </div>

        <div class="section">
          <h3>Guest Information</h3>
          <div class="info-row">
            <span class="label">Name:</span>
            <span class="value">${data.guestName}</span>
          </div>
          <div class="info-row">
            <span class="label">Email:</span>
            <span class="value">${data.guestEmail}</span>
          </div>
        </div>

        <div class="section">
          <h3>Hotel Information</h3>
          <div class="info-row">
            <span class="label">Hotel Name:</span>
            <span class="value">${data.hotelName}</span>
          </div>
          <div class="info-row">
            <span class="label">Address:</span>
            <span class="value">${data.hotelAddress}</span>
          </div>
          <div class="info-row">
            <span class="label">Room Type:</span>
            <span class="value">${data.roomType}</span>
          </div>
        </div>

        <div class="section">
          <h3>Stay Details</h3>
          <div class="info-row">
            <span class="label">Check-in Date:</span>
            <span class="value">${data.checkIn}</span>
          </div>
          <div class="info-row">
            <span class="label">Check-out Date:</span>
            <span class="value">${data.checkOut}</span>
          </div>
          <div class="info-row">
            <span class="label">Number of Nights:</span>
            <span class="value">${data.nights}</span>
          </div>
        </div>

        <div class="amount-section">
          <h3>Payment Details</h3>
          <div class="info-row">
            <span class="label">Price per Night:</span>
            <span class="value">$${data.pricePerNight.toFixed(2)}</span>
          </div>
          <div class="info-row">
            <span class="label">Subtotal (${data.nights} nights):</span>
            <span class="value">$${(data.pricePerNight * data.nights).toFixed(2)}</span>
          </div>
          <div class="info-row">
            <span class="label">Taxes & Fees:</span>
            <span class="value">$${data.taxes.toFixed(2)}</span>
          </div>
          <div class="total-amount">
            Total Amount: $${data.totalAmount.toFixed(2)}
          </div>
          <div class="info-row" style="margin-top: 15px;">
            <span class="label">Payment Method:</span>
            <span class="value">${data.paymentMethod}</span>
          </div>
          <div class="info-row">
            <span class="label">Transaction ID:</span>
            <span class="value">${data.transactionId}</span>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for choosing Vibe Booking!</p>
          <p>This is an official receipt for your booking. Please keep it for your records.</p>
          <p>For support, contact us at support@vibebooking.com</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
	}

	private generateRefundReceiptHTML(data: RefundReceiptData): string {
		return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Refund Receipt</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #dc2626;
            padding-bottom: 20px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #dc2626;
            margin-bottom: 10px;
          }
          .receipt-title {
            font-size: 18px;
            color: #666;
          }
          .refund-info {
            background-color: #fef2f2;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #dc2626;
          }
          .section {
            margin-bottom: 30px;
          }
          .section h3 {
            color: #dc2626;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 5px 0;
          }
          .info-row:nth-child(even) {
            background-color: #f9fafb;
          }
          .label {
            font-weight: bold;
            color: #374151;
          }
          .value {
            color: #111827;
          }
          .refund-amount {
            font-size: 24px;
            font-weight: bold;
            color: #dc2626;
            text-align: center;
            margin: 20px 0;
            padding: 20px;
            background-color: #fef2f2;
            border-radius: 8px;
            border: 2px solid #dc2626;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">VIBE BOOKING</div>
          <div class="receipt-title">Refund Receipt</div>
        </div>

        <div class="refund-info">
          <div class="info-row">
            <span class="label">Refund ID:</span>
            <span class="value">${data.refundId}</span>
          </div>
          <div class="info-row">
            <span class="label">Original Booking ID:</span>
            <span class="value">${data.bookingId}</span>
          </div>
          <div class="info-row">
            <span class="label">Refund Date:</span>
            <span class="value">${data.refundDate}</span>
          </div>
        </div>

        <div class="section">
          <h3>Refund Details</h3>
          <div class="info-row">
            <span class="label">Customer Name:</span>
            <span class="value">${data.guestName}</span>
          </div>
          <div class="info-row">
            <span class="label">Refund Reason:</span>
            <span class="value">${data.reason}</span>
          </div>
          <div class="info-row">
            <span class="label">Processing Time:</span>
            <span class="value">${data.processingTime}</span>
          </div>
        </div>

        <div class="refund-amount">
          Refund Amount: $${data.refundAmount.toFixed(2)}
        </div>

        <div class="footer">
          <p>Your refund has been processed successfully.</p>
          <p>The amount will appear in your original payment method within the specified processing time.</p>
          <p>For support, contact us at support@vibebooking.com</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
	}

	async generateBookingReceipt(data: BookingReceiptData): Promise<Buffer> {
		const browser = await this.getBrowser();
		const page = await browser.newPage();

		try {
			const html = this.generateBookingReceiptHTML(data);
			await page.setContent(html, { waitUntil: 'networkidle0' });

			const pdfBuffer = await page.pdf({
				format: 'A4',
				margin: {
					top: '20px',
					right: '20px',
					bottom: '20px',
					left: '20px',
				},
				printBackground: true,
			});

			await page.close();
			logger.info(
				`Generated booking receipt PDF for booking ${data.bookingId}`,
			);
			return Buffer.from(pdfBuffer);
		} catch (error) {
			await page.close();
			logger.error('Failed to generate booking receipt PDF:', error);
			throw new Error('Failed to generate PDF receipt');
		}
	}

	async generateRefundReceipt(data: RefundReceiptData): Promise<Buffer> {
		const browser = await this.getBrowser();
		const page = await browser.newPage();

		try {
			const html = this.generateRefundReceiptHTML(data);
			await page.setContent(html, { waitUntil: 'networkidle0' });

			const pdfBuffer = await page.pdf({
				format: 'A4',
				margin: {
					top: '20px',
					right: '20px',
					bottom: '20px',
					left: '20px',
				},
				printBackground: true,
			});

			await page.close();
			logger.info(`Generated refund receipt PDF for refund ${data.refundId}`);
			return Buffer.from(pdfBuffer);
		} catch (error) {
			await page.close();
			logger.error('Failed to generate refund receipt PDF:', error);
			throw new Error('Failed to generate PDF receipt');
		}
	}
}

export const pdfService = new PDFService();
export default pdfService;

// Cleanup on process exit
process.on('exit', () => {
	pdfService.close();
});

process.on('SIGINT', () => {
	pdfService.close();
	process.exit(0);
});

process.on('SIGTERM', () => {
	pdfService.close();
	process.exit(0);
});
