import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load env from .env.local
function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index > 0) {
        const key = trimmed.slice(0, index).trim();
        let value = trimmed.slice(index + 1).trim();
        // remove quotes if any
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node scripts/send-mock-webhook.js <userId> <planTier>");
  console.error("Example: node scripts/send-mock-webhook.js user_123 startup");
  process.exit(1);
}

const userId = args[0];
const planTier = args[1].toLowerCase();

const priceStartup = process.env.STRIPE_PRICE_STARTUP || "price_startup";
const priceGrowth = process.env.STRIPE_PRICE_GROWTH || "price_growth";
const priceSaasScale = process.env.STRIPE_PRICE_SAAS_SCALE || "price_saas_scale";

const planPrices = {
  startup: priceStartup,
  growth: priceGrowth,
  saas_scale: priceSaasScale,
  hobby: "price_hobby",
};

const priceId = planPrices[planTier];
if (!priceId) {
  console.error(`Invalid planTier: ${planTier}. Valid tiers are: startup, growth, saas_scale, hobby`);
  process.exit(1);
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_secret";
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_mockkey";

// Initialize Stripe client
const stripe = new Stripe(stripeSecretKey);

// We generate a mock subscription ID
const subscriptionId = `sub_mock_${planTier}_${Date.now()}`;
const customerId = `cus_mock_${userId}`;

const payload = {
  id: `evt_mock_${Date.now()}`,
  object: "event",
  type: "checkout.session.completed",
  data: {
    object: {
      id: `cs_mock_${Date.now()}`,
      object: "checkout.session",
      client_reference_id: userId,
      customer: customerId,
      subscription: subscriptionId,
      status: "complete",
    },
  },
};

const payloadString = JSON.stringify(payload);
const signature = stripe.webhooks.generateTestHeaderString({
  payload: payloadString,
  secret: webhookSecret,
});

async function sendWebhook() {
  const url = "http://localhost:4300/api/webhooks/stripe";
  console.log(`Sending mock checkout.session.completed event...`);
  console.log(`- User ID: ${userId}`);
  console.log(`- Plan Tier: ${planTier}`);
  console.log(`- Mock Subscription ID: ${subscriptionId}`);
  console.log(`- Webhook Secret: ${webhookSecret}`);
  console.log(`- Target URL: ${url}`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": signature,
      },
      body: payloadString,
    });

    console.log(`Response Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`Response Body:`, text);

    if (res.ok) {
      console.log(`\nSUCCESS: Mock webhook processed successfully.`);
    } else {
      console.error(`\nFAILURE: Server returned status ${res.status}.`);
      console.error(
        `If the server returned 500, check if it tried to retrieve the mock subscription from Stripe API, or check your local server logs.`
      );
    }
  } catch (err) {
    console.error(`\nERROR: Failed to connect to server:`, err.message);
  }
}

sendWebhook();
