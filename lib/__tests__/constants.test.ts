import {
  STARGAZE_CHAIN_ID,
  STARGAZE_RPC,
  PAGE_SIZE,
  FAST_INITIAL_SIZE,
  CONCURRENT_REQUESTS,
  PREFETCH_PAGES_AHEAD,
  LARGE_COLLECTION_THRESHOLD,
  RATE_LIMIT_IMAGE_ENDPOINT,
  RATE_LIMIT_GALLERY_CREATE,
  RATE_LIMIT_STANDARD,
  SIZE_OPTIONS,
  ARRANGEMENT_OPTIONS,
  GALLERY_CATEGORIES,
} from '../constants'

describe('Constants', () => {
  describe('Blockchain Configuration', () => {
    it('should have valid Stargaze configuration', () => {
      expect(STARGAZE_CHAIN_ID).toBe('stargaze-1')
      expect(STARGAZE_RPC).toContain('https://')
      expect(STARGAZE_RPC).toContain('stargaze')
    })
  })

  describe('NFT Loading Configuration', () => {
    it('should have sensible page size', () => {
      expect(PAGE_SIZE).toBe(75)
      expect(PAGE_SIZE).toBeGreaterThan(0)
    })

    it('should have fast initial size smaller than page size', () => {
      expect(FAST_INITIAL_SIZE).toBe(12)
      expect(FAST_INITIAL_SIZE).toBeLessThan(PAGE_SIZE)
    })

    it('should have reasonable concurrent requests', () => {
      expect(CONCURRENT_REQUESTS).toBe(6)
      expect(CONCURRENT_REQUESTS).toBeGreaterThan(0)
      expect(CONCURRENT_REQUESTS).toBeLessThanOrEqual(10)
    })

    it('should have valid prefetch configuration', () => {
      expect(PREFETCH_PAGES_AHEAD).toBe(5)
      expect(PREFETCH_PAGES_AHEAD).toBeGreaterThan(0)
    })

    it('should have reasonable large collection threshold', () => {
      expect(LARGE_COLLECTION_THRESHOLD).toBe(300)
      expect(LARGE_COLLECTION_THRESHOLD).toBeGreaterThan(PAGE_SIZE)
    })
  })

  describe('Rate Limiting Configuration', () => {
    it('should have image endpoint rate limit', () => {
      expect(RATE_LIMIT_IMAGE_ENDPOINT).toBe(1000)
      expect(RATE_LIMIT_IMAGE_ENDPOINT).toBeGreaterThan(RATE_LIMIT_STANDARD)
    })

    it('should have gallery create rate limit (strictest)', () => {
      expect(RATE_LIMIT_GALLERY_CREATE).toBe(10)
      expect(RATE_LIMIT_GALLERY_CREATE).toBeLessThan(RATE_LIMIT_STANDARD)
    })

    it('should have standard rate limit', () => {
      expect(RATE_LIMIT_STANDARD).toBe(30)
      expect(RATE_LIMIT_STANDARD).toBeGreaterThan(0)
    })

    it('should have correct rate limit hierarchy', () => {
      expect(RATE_LIMIT_GALLERY_CREATE).toBeLessThan(RATE_LIMIT_STANDARD)
      expect(RATE_LIMIT_STANDARD).toBeLessThan(RATE_LIMIT_IMAGE_ENDPOINT)
    })
  })

  describe('Layout Options', () => {
    it('should have three size options', () => {
      expect(SIZE_OPTIONS).toHaveLength(3)
      expect(SIZE_OPTIONS.map(o => o.id)).toEqual(['small', 'medium', 'large'])
    })

    it('should have four arrangement options', () => {
      expect(ARRANGEMENT_OPTIONS).toHaveLength(4)
      expect(ARRANGEMENT_OPTIONS.map(o => o.id)).toEqual([
        'grid',
        'vertical',
        'justified',
        'presentation',
      ])
    })
  })

  describe('Gallery Categories', () => {
    it('should have 10 gallery categories', () => {
      expect(GALLERY_CATEGORIES).toHaveLength(10)
    })

    it('should have valid category structure', () => {
      GALLERY_CATEGORIES.forEach(category => {
        expect(category).toHaveProperty('value')
        expect(category).toHaveProperty('label')
        expect(typeof category.value).toBe('string')
        expect(typeof category.label).toBe('string')
      })
    })

    it('should include common categories', () => {
      const values = GALLERY_CATEGORIES.map(c => c.value)
      expect(values).toContain('photography')
      expect(values).toContain('digital-art')
      expect(values).toContain('abstract')
    })
  })
})
