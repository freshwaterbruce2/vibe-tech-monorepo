import { ShareASaleSource } from '@/services/affiliates/ShareASaleSource';
import { ProductDiscoveryEngine } from '@/services/engine/ProductDiscoveryEngine';
import { SerpApiTrendSource } from '@/services/trends/SerpApiTrendSource';
import { env } from '@/lib/env';
import { NextResponse } from 'next/server';

// Force dynamic execution for API route (so it doesn't cache)
export const dynamic = 'force-dynamic';

/**
 * GET handler for the cron discovery endpoint
 * Secured with CRON_SECRET header validation in production
 */
export async function GET(request: Request) {
  // Security: Verify cron secret in production
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization');
    const expectedToken = `Bearer ${env.CRON_SECRET}`;
    
    if (!env.CRON_SECRET) {
      console.error('CRON_SECRET not configured in production');
      return NextResponse.json(
        { success: false, error: 'Cron secret not configured' },
        { status: 500 }
      );
    }
    
    if (authHeader !== expectedToken) {
      console.warn('Unauthorized cron request attempt', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  try {
    const engine = new ProductDiscoveryEngine(
       [new SerpApiTrendSource()],
       [new ShareASaleSource()]
    );

    // Run discovery
    // Note: Vercel Cron has timeouts (10s hobby, 60s pro, 300s enterprise)
    // For long-running discovery, consider using a queue system
    await engine.runDiscovery();

    return NextResponse.json({ 
      success: true, 
      message: 'Discovery completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API Discovery Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
