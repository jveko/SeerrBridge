import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { mkdir } from 'fs/promises';
import { traktRateLimiter } from '@/lib/trakt-rate-limiter';

// Create the cache directory if it doesn't exist
const CACHE_DIR = path.join(process.cwd(), 'public', 'cache', 'trakt');

// Keep track of the last API request time
let lastTraktApiRequest = 0;
// Minimum time between API requests in milliseconds (250ms)
const MIN_REQUEST_INTERVAL = 250;

// Cache of IDs that consistently return 404 to avoid repeated Trakt API calls
const notFoundCache = new Set<string>();

// Ensure the cache directory exists
async function ensureCacheDir() {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating cache directory:', error);
  }
}

// Function to enforce minimum delay between API requests
async function enforceRequestDelay(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastTraktApiRequest;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const delayMs = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  lastTraktApiRequest = Date.now();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const traktId = searchParams.get('traktId');
  
  if (!traktId) {
    return NextResponse.json({ error: 'Trakt ID is required' }, { status: 400 });
  }

  // Check the not-found cache to quickly return 404 for known missing IDs
  if (notFoundCache.has(traktId)) {
    console.log(`[API] Return cached 404 for known missing Trakt ID: ${traktId}`);
    return NextResponse.json({ 
      error: 'Show data not found (cached 404)',
      traktId 
    }, { status: 404 });
  }

  try {
    // Create the cache path for this show
    const cacheFilePath = path.join(CACHE_DIR, `${traktId}.json`);
    
    // Check if the image data is already cached
    if (fs.existsSync(cacheFilePath)) {
      try {
        const cachedData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
        return NextResponse.json(cachedData);
      } catch (cacheError) {
        console.error(`Error reading cache file for traktId ${traktId}:`, cacheError);
        // If cache file is corrupted, continue to fetch from API
      }
    }
    
    // Wait for a token from the rate limiter before proceeding
    await traktRateLimiter.acquireToken();
    
    // Enforce minimum delay between actual API requests
    await enforceRequestDelay();
    
    // Only proceed with the API call once we have a token
    const traktApiKey = process.env.TRAKT_API_KEY;
    
    if (!traktApiKey) {
      return NextResponse.json({ error: 'Trakt API key not configured' }, { status: 500 });
    }
    
    console.log(`[API] Making Trakt API request for ID: ${traktId} with type=show filter`);
    const response = await fetch(`https://api.trakt.tv/search/trakt/${traktId}?extended=images&type=show`, {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': traktApiKey
      }
    });
    
    // Handle rate limit responses properly
    if (response.status === 429) {
      // Get the retry-after value from the header
      const retryAfter = response.headers.get('Retry-After');
      const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 10;
      
      console.warn(`Rate limit exceeded for Trakt API. Retry after ${retrySeconds} seconds.`);
      
      // Read rate limit details from the header if available
      const rateLimitHeader = response.headers.get('X-Ratelimit');
      if (rateLimitHeader) {
        try {
          const rateLimitInfo = JSON.parse(rateLimitHeader);
          console.warn('Rate limit details:', rateLimitInfo);
        } catch (e) {
          console.error('Failed to parse rate limit header:', e);
        }
      }
      
      return NextResponse.json({ 
        error: 'Rate limit exceeded', 
        retryAfter: retrySeconds 
      }, { 
        status: 429,
        headers: {
          'Retry-After': String(retrySeconds)
        }
      });
    }
    
    if (!response.ok) {
      console.error(`[API] Trakt API error ${response.status} for ID: ${traktId}`);
      return NextResponse.json({ 
        error: `Failed to fetch from Trakt API: ${response.status} ${response.statusText}` 
      }, { status: response.status });
    }
    
    const data = await response.json();
    
    // Find the show data - this is simplified now that we filter by type=show
    const showData = data.length > 0 ? data[0].show : null;
    
    if (!showData) {
      console.warn(`[API] No show data found for Trakt ID: ${traktId}, returning 404`);
      
      // Cache this 404 response for future reference
      notFoundCache.add(traktId);
      
      return NextResponse.json({ 
        error: 'Show data not found', 
        traktId
      }, { status: 404 });
    }
    
    // Extract the image data we need
    const imageData = {
      traktId,
      title: showData.title,
      year: showData.year,
      images: {
        poster: showData.images?.poster?.[0] || null,
        thumb: showData.images?.thumb?.[0] || null
      }
    };
    
    // Ensure cache directory exists
    await ensureCacheDir();
    
    // Save to cache
    fs.writeFileSync(cacheFilePath, JSON.stringify(imageData, null, 2));
    
    return NextResponse.json(imageData);
  } catch (error) {
    console.error('Error fetching Trakt show image:', error);
    return NextResponse.json({ 
      error: `Failed to fetch show image: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
} 