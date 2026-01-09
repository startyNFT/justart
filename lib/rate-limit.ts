/**
 * Rate limiting utility for API routes
 * Uses in-memory storage with LRU eviction
 */

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max number of unique tokens to track
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

class RateLimiter {
  private config: RateLimitConfig;
  private tokens: Map<string, number[]>;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.tokens = new Map();
  }

  /**
   * Check if a request should be rate limited
   * @param identifier - Unique identifier for the client (e.g., IP address, wallet address)
   * @param limit - Maximum number of requests allowed in the interval
   * @returns Rate limit result with success status and headers
   */
  check(identifier: string, limit: number): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.config.interval;

    // Get existing timestamps for this identifier
    let timestamps = this.tokens.get(identifier) || [];

    // Filter out timestamps outside the current window
    timestamps = timestamps.filter((timestamp) => timestamp > windowStart);

    // Check if limit exceeded
    const success = timestamps.length < limit;

    // Add current timestamp if not rate limited
    if (success) {
      timestamps.push(now);
      this.tokens.set(identifier, timestamps);
    }

    // Implement LRU eviction if too many unique tokens
    if (this.tokens.size > this.config.uniqueTokenPerInterval) {
      // Remove oldest entries
      const entries = Array.from(this.tokens.entries());
      const sortedEntries = entries.sort((a, b) => {
        const aLatest = Math.max(...a[1]);
        const bLatest = Math.max(...b[1]);
        return aLatest - bLatest;
      });

      // Keep only the most recent half
      const keepCount = Math.floor(this.config.uniqueTokenPerInterval / 2);
      this.tokens = new Map(sortedEntries.slice(-keepCount));
    }

    return {
      success,
      limit,
      remaining: Math.max(0, limit - timestamps.length),
      reset: windowStart + this.config.interval,
    };
  }

  /**
   * Reset rate limit for a specific identifier
   */
  reset(identifier: string): void {
    this.tokens.delete(identifier);
  }

  /**
   * Clear all rate limit data
   */
  clear(): void {
    this.tokens.clear();
  }
}

// Pre-configured rate limiters for different use cases

// Strict rate limiter for expensive operations (10 requests per minute)
export const strictRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

// Standard rate limiter for normal API routes (30 requests per minute)
export const standardRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 1000,
});

// Lenient rate limiter for read-heavy operations (100 requests per minute)
export const lenientRateLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 2000,
});

/**
 * Get client identifier from request
 * Uses IP address as the primary identifier
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (for proxies/CDNs)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  // Fallback to a generic identifier
  return 'unknown';
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.reset).toISOString(),
  };
}

/**
 * Middleware to apply rate limiting to API routes
 */
export function withRateLimit(
  handler: (request: Request) => Promise<Response>,
  limiter: RateLimiter = standardRateLimiter,
  limit: number = 30
) {
  return async (request: Request): Promise<Response> => {
    const identifier = getClientIdentifier(request);
    const result = limiter.check(identifier, limit);

    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...createRateLimitHeaders(result),
            'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Call the handler and add rate limit headers to response
    const response = await handler(request);
    const headers = new Headers(response.headers);
    Object.entries(createRateLimitHeaders(result)).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
