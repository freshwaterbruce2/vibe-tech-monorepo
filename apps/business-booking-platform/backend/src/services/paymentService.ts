// Deprecated legacy Stripe payment service stub. All methods throw to prevent accidental usage.
export class PaymentService {
	private disabled(): never {
		throw new Error('Legacy Stripe payment service disabled');
	}
	createPaymentIntent() {
		this.disabled();
	}
	confirmPayment() {
		this.disabled();
	}
	processRefund() {
		this.disabled();
	}
	savePaymentMethod() {
		this.disabled();
	}
	getUserPaymentMethods() {
		this.disabled();
	}
	deletePaymentMethod() {
		this.disabled();
	}
	handleWebhook() {
		this.disabled();
	}
}
export const paymentService = new PaymentService();
