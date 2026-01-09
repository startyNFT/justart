import { strictRateLimiter, standardRateLimiter, lenientRateLimiter, getClientIdentifier, createRateLimitHeaders } from '../rate-limit'

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Clear rate limiters before each test
    strictRateLimiter.clear()
    standardRateLimiter.clear()
    lenientRateLimiter.clear()
  })

  describe('Rate limit checking', () => {
    it('should allow requests under the limit', () => {
      const result = standardRateLimiter.check('user-1', 30)

      expect(result.success).toBe(true)
      expect(result.limit).toBe(30)
      expect(result.remaining).toBe(29)
    })

    it('should block requests over the limit', () => {
      const identifier = 'user-2'
      const limit = 3

      // Make 3 requests (should all succeed)
      for (let i = 0; i < 3; i++) {
        const result = standardRateLimiter.check(identifier, limit)
        expect(result.success).toBe(true)
      }

      // 4th request should fail
      const blockedResult = standardRateLimiter.check(identifier, limit)
      expect(blockedResult.success).toBe(false)
      expect(blockedResult.remaining).toBe(0)
    })

    it('should track different users independently', () => {
      const limit = 5

      standardRateLimiter.check('user-1', limit)
      standardRateLimiter.check('user-1', limit)

      standardRateLimiter.check('user-2', limit)

      const result1 = standardRateLimiter.check('user-1', limit)
      const result2 = standardRateLimiter.check('user-2', limit)

      expect(result1.remaining).toBe(2) // user-1 made 3 requests
      expect(result2.remaining).toBe(3) // user-2 made 2 requests
    })

    it('should reset rate limit for specific identifier', () => {
      const identifier = 'user-3'
      const limit = 3

      // Use up the limit
      for (let i = 0; i < 3; i++) {
        standardRateLimiter.check(identifier, limit)
      }

      // Should be blocked
      expect(standardRateLimiter.check(identifier, limit).success).toBe(false)

      // Reset and try again
      standardRateLimiter.reset(identifier)
      const result = standardRateLimiter.check(identifier, limit)

      expect(result.success).toBe(true)
      expect(result.remaining).toBe(2)
    })
  })

  describe('Different rate limiter tiers', () => {
    it('strict rate limiter should have lowest threshold', () => {
      const identifier = 'user-4'

      for (let i = 0; i < 10; i++) {
        strictRateLimiter.check(identifier, 10)
      }

      const result = strictRateLimiter.check(identifier, 10)
      expect(result.success).toBe(false)
    })

    it('lenient rate limiter should allow more requests', () => {
      const identifier = 'user-5'

      for (let i = 0; i < 100; i++) {
        lenientRateLimiter.check(identifier, 100)
      }

      const result = lenientRateLimiter.check(identifier, 100)
      expect(result.success).toBe(false)
    })
  })

  describe('getClientIdentifier', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('192.168.1.1')
    })

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-real-ip': '192.168.1.2',
        },
      })

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('192.168.1.2')
    })

    it('should return "unknown" if no IP headers present', () => {
      const request = new Request('http://localhost')

      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('unknown')
    })
  })

  describe('createRateLimitHeaders', () => {
    it('should create correct rate limit headers', () => {
      const result = {
        success: true,
        limit: 30,
        remaining: 25,
        reset: Date.now() + 60000,
      }

      const headers = createRateLimitHeaders(result)

      expect(headers['X-RateLimit-Limit']).toBe('30')
      expect(headers['X-RateLimit-Remaining']).toBe('25')
      expect(headers['X-RateLimit-Reset']).toBeDefined()
    })
  })
})
