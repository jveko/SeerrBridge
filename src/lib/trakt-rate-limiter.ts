/**
 * Trakt API Rate Limiter
 * 
 * Implements a token bucket algorithm to manage API rate limits:
 * - 1000 calls every 5 minutes (300 seconds) for GET requests
 */

interface RateLimiterState {
  tokens: number;
  lastRefill: number;
  waitingRequests: Array<{
    resolve: () => void;
    timestamp: number;
  }>;
}

class TraktRateLimiter {
  private static instance: TraktRateLimiter;
  private state: RateLimiterState;
  
  // Rate limit configuration (based on Trakt's docs)
  private readonly MAX_TOKENS = 1000;  // Maximum number of tokens (requests)
  private readonly REFILL_RATE = 300;  // Seconds for complete refill (5 minutes)
  private readonly TOKEN_REFILL_INTERVAL = 500; // Milliseconds between token check/refills
  
  private constructor() {
    this.state = {
      tokens: this.MAX_TOKENS,
      lastRefill: Date.now(),
      waitingRequests: []
    };
    
    // Start the token refill process
    this.startRefillProcess();
  }
  
  public static getInstance(): TraktRateLimiter {
    if (!TraktRateLimiter.instance) {
      TraktRateLimiter.instance = new TraktRateLimiter();
    }
    return TraktRateLimiter.instance;
  }
  
  /**
   * Acquire permission to make an API request.
   * Returns a promise that resolves when a token is available.
   */
  public async acquireToken(): Promise<void> {
    // If we have tokens available, use one immediately
    if (this.state.tokens > 0) {
      this.state.tokens--;
      return Promise.resolve();
    }
    
    // No tokens available, queue the request
    return new Promise<void>(resolve => {
      this.state.waitingRequests.push({
        resolve,
        timestamp: Date.now()
      });
      
      // Log the queue length when it starts to back up
      if (this.state.waitingRequests.length > 5) {
        console.warn(`Trakt API rate limit reached. ${this.state.waitingRequests.length} requests waiting.`);
      }
    });
  }
  
  /**
   * Get current rate limiter status
   */
  public getStatus(): { availableTokens: number; queueLength: number } {
    return {
      availableTokens: this.state.tokens,
      queueLength: this.state.waitingRequests.length
    };
  }
  
  /**
   * Start the token refill process
   */
  private startRefillProcess(): void {
    setInterval(() => {
      this.refillTokens();
      this.processQueue();
    }, this.TOKEN_REFILL_INTERVAL);
  }
  
  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.state.lastRefill) / 1000;
    
    // Calculate how many tokens to add based on elapsed time
    const tokensToAdd = Math.floor((elapsedSeconds * this.MAX_TOKENS) / this.REFILL_RATE);
    
    if (tokensToAdd > 0) {
      // Add tokens and update last refill time
      this.state.tokens = Math.min(this.MAX_TOKENS, this.state.tokens + tokensToAdd);
      this.state.lastRefill = now;
    }
  }
  
  /**
   * Process the queue of waiting requests
   */
  private processQueue(): void {
    // Process queued requests if we have tokens available
    while (this.state.tokens > 0 && this.state.waitingRequests.length > 0) {
      const request = this.state.waitingRequests.shift();
      if (request) {
        this.state.tokens--;
        request.resolve();
      }
    }
  }
}

export const traktRateLimiter = TraktRateLimiter.getInstance(); 