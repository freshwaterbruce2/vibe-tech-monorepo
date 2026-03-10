import { Router } from 'express';
import type { Request, Response } from 'express';
import { tenantManager, healthService } from '../services/index.js';
import { squarePaymentService } from '../../src/services/squarePaymentService.js';
import { getUsageMetrics } from '../utils/index.js';

const router = Router();

// Get available subscription plans
router.get('/plans', (req: Request, res: Response) => {
  try {
    const plans = squarePaymentService.getSubscriptionPlans();

    res.json({
      success: true,
      plans: plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        features: plan.features
      }))
    });
  } catch (error) {
    healthService.incrementError();
    console.error('Get payment plans error:', error);
    res.status(500).json({
      error: 'Failed to get subscription plans',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create checkout session for subscription upgrade
router.post('/checkout', async (req: any, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant not identified' });
    }

    const { planId, redirectUrl } = req.body;

    if (!planId || !redirectUrl) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['planId', 'redirectUrl']
      });
    }

    const plan = squarePaymentService.getSubscriptionPlan(planId);
    if (!plan) {
      return res.status(400).json({ error: 'Invalid subscription plan', planId });
    }

    const result = await squarePaymentService.createCheckoutSession({
      planId,
      tenantId: tenant.id,
      redirectUrl
    });

    if (result.success) {
      res.json({
        success: true,
        checkoutUrl: result.checkoutUrl,
        plan: {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          currency: plan.currency
        }
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    healthService.incrementError();
    console.error('Create checkout session error:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Handle Square webhooks
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-square-signature'] as string;
    const body = JSON.stringify(req.body);

    const isValid = await squarePaymentService.verifyWebhookSignature(body, signature);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const success = await squarePaymentService.handleWebhook(req.body);

    if (success) {
      res.json({ success: true, message: 'Webhook processed successfully' });
    } else {
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  } catch (error) {
    healthService.incrementError();
    console.error('Webhook processing error:', error);
    res.status(500).json({
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get payment/subscription status for tenant
router.get('/status', (req: any, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant not identified' });
    }

    const data = tenantManager.getTenantData(tenant.id);
    const usage = {
      doors: data?.doorEntries.length || 0,
      users: data?.users.length || 0
    };

    const needsUpgrade =
      usage.doors > tenant.subscription.maxDoors ||
      usage.users > tenant.subscription.maxUsers ||
      tenant.subscription.status !== 'active' ||
      new Date(tenant.subscription.expiresAt) < new Date();

    res.json({
      success: true,
      subscription: tenant.subscription,
      usage,
      limits: {
        doors: { used: usage.doors, max: tenant.subscription.maxDoors },
        users: { used: usage.users, max: tenant.subscription.maxUsers }
      },
      needsUpgrade,
      upgradeReasons: needsUpgrade ? [
        ...(usage.doors > tenant.subscription.maxDoors ? ['Door limit exceeded'] : []),
        ...(usage.users > tenant.subscription.maxUsers ? ['User limit exceeded'] : []),
        ...(tenant.subscription.status !== 'active' ? ['Subscription not active'] : []),
        ...(new Date(tenant.subscription.expiresAt) < new Date() ? ['Subscription expired'] : [])
      ] : [],
      availableUpgrades: squarePaymentService.getSubscriptionPlans().filter(
        plan => plan.id !== tenant.subscription.tier
      )
    });
  } catch (error) {
    healthService.incrementError();
    console.error('Get payment status error:', error);
    res.status(500).json({
      error: 'Failed to get payment status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get tenant usage metrics for billing
router.get('/usage', (req: any, res: Response) => {
  try {
    const tenant = req.tenant;
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant not identified' });
    }

    const currentPeriod = new Date().toISOString().slice(0, 7);
    const usage = getUsageMetrics(tenant.id, currentPeriod);

    const tier = tenant.subscription.tier;
    let perDoorRate = 0;
    let baseFee = 0;

    switch (tier) {
      case 'starter':
        baseFee = 2900;
        perDoorRate = 10;
        break;
      case 'professional':
        baseFee = 7900;
        perDoorRate = 5;
        break;
      case 'enterprise':
        baseFee = 19900;
        perDoorRate = 2;
        break;
    }

    const usageCharges = usage ? usage.doorsProcessed * perDoorRate : 0;
    const totalCharges = baseFee + usageCharges;

    res.json({
      success: true,
      period: currentPeriod,
      usage: usage || {
        tenantId: tenant.id,
        period: currentPeriod,
        doorsProcessed: 0,
        palletsTracked: 0,
        apiCalls: 0,
        storageUsedMB: 0
      },
      billing: {
        baseFee: baseFee / 100,
        perDoorRate: perDoorRate / 100,
        usageCharges: usageCharges / 100,
        totalCharges: totalCharges / 100,
        currency: 'USD'
      },
      limits: {
        doorsIncluded: tenant.subscription.maxDoors,
        usersIncluded: tenant.subscription.maxUsers
      }
    });
  } catch (error) {
    healthService.incrementError();
    console.error('Get usage metrics error:', error);
    res.status(500).json({
      error: 'Failed to get usage metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
