import { NextRequest, NextResponse } from 'next/server';
import { traktRateLimiter } from '@/lib/trakt-rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const status = traktRateLimiter.getStatus();
    
    return NextResponse.json({
      availableTokens: status.availableTokens,
      queueLength: status.queueLength,
      maxTokens: 1000,  // Same as in the rate limiter
      refillPeriod: '5 minutes',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching rate limit status:', error);
    return NextResponse.json({ 
      error: `Failed to fetch rate limit status: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
} 