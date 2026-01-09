import { useState, useEffect, useRef } from 'react'

/**
 * Hook to animate loading progress
 * Smoothly animates from 0-75% over 5 seconds, then increments toward 99%
 */
export function useLoadingProgress(loading: boolean) {
  const [progress, setProgress] = useState(0)
  const progressRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!loading) {
      // Reset when not loading
      setProgress(0)
      return
    }

    const startTime = Date.now()
    const duration = 5000 // 5 seconds to reach 75%
    let currentProgress = 0

    const animate = () => {
      const elapsed = Date.now() - startTime

      if (elapsed < duration) {
        // Phase 1: 0-75% over 5 seconds (smooth)
        currentProgress = (elapsed / duration) * 75
      } else if (currentProgress < 99) {
        // Phase 2: smooth random increments toward 99%
        // Smaller increments as we get closer to 99%
        const remaining = 99 - currentProgress
        const increment = Math.random() * Math.min(0.5, remaining * 0.1) + 0.05
        currentProgress = Math.min(currentProgress + increment, 99)
      }

      setProgress(currentProgress)

      if (currentProgress < 99 && loading) {
        // Random interval between 50-150ms for organic feel
        const nextInterval = 50 + Math.random() * 100
        progressRef.current = setTimeout(animate, nextInterval)
      }
    }

    animate()

    return () => {
      if (progressRef.current) {
        clearTimeout(progressRef.current)
      }
    }
  }, [loading])

  return progress
}
