# Monetized MCP Service Deployment Guide

This document describes how to deploy the **monetized-mcp-service** to Vercel and Railway, and how to configure Stripe requirements.

## Frontend (Vercel)

The React-based web dashboard should be deployed on **Vercel**:
1. Run the deployment target:
   ```bash
   pnpm nx run monetized-mcp-service:deploy
   ```
2. Configure environment variables in the Vercel dashboard:
   - `VITE_API_BASE_URL`: The URL of your API backend hosted on Railway.
   - `VITE_STRIPE_PUBLIC_KEY`: Your Stripe publishable key.

## Backend (Railway)

The Fastify server and MCP daemon should be deployed on **Railway**:
1. Connect your GitHub repository to Railway and link the `monetized-mcp-service` project.
2. In Railway, configure the following environment variables:
   - `PORT`: Set to `6300` or bind automatically.
   - `HOST`: Set to `0.0.0.0`.
   - `STRIPE_SECRET_KEY`: Your Stripe test or live secret key.
   - `STRIPE_WEBHOOK_SECRET`: The webhook signing secret.
   - `AUTH_SECRET`: A secure random 32-character string.
   - `DATABASE_PATH`: Set to `D:\databases\auth.db` or let it default to target database storage.

## Stripe Integration

Ensure that you have set up a webhook endpoint in Stripe that points to:
`https://<your-railway-url>/api/webhooks/stripe`

Required Stripe environment variables:
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
