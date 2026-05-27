import { EventEmitter } from "events";

export type InvoiceEvent =
	| { type: "invoices:changed"; userId: string }
	| { type: "invoice:paid"; userId: string; invoiceId: string };

class Events extends EventEmitter {
	emitEvent(event: InvoiceEvent) {
		this.emit("event", event);
		this.emit(`user:${event.userId}`, event);
	}
}

export const events = new Events();
