import type Stripe from 'stripe'

import getStripe from '../clients/stripe.js'

export interface BuildSessionInput {
  invoiceId: string
  publicToken: string
  amount: number
  currency: string
  invoiceNumber: string
  successUrl: string
  cancelUrl: string
  customerEmail?: string
}

export interface CheckoutSession {
  url: string
  id: string
}

export const buildCheckoutSession = async (
  input: BuildSessionInput,
): Promise<CheckoutSession> => {
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: input.currency.toLowerCase(),
          product_data: {
            name: `Invoice ${input.invoiceNumber}`,
          },
          unit_amount: Math.round(input.amount * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      invoice_id: input.invoiceId,
      public_token: input.publicToken,
      invoice_number: input.invoiceNumber,
    },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.customerEmail,
  })
  if (!session.url) {
    throw new Error('Stripe Checkout Session returned no URL')
  }
  return { url: session.url, id: session.id }
}

export const verifyWebhookSignature = (
  rawBody: Buffer,
  signature: string,
  secret: string,
): Stripe.Event => {
  const stripe = getStripe()
  return stripe.webhooks.constructEvent(rawBody, signature, secret)
}
