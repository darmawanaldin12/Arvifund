'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * useCountUp — animasikan angka dari 0 → target dalam `duration` ms.
 *
 * @param {number} target    - nilai akhir
 * @param {number} duration  - durasi animasi ms (default 600)
 * @param {boolean} enabled  - matikan animasi jika false (mis. reduced-motion)
 * @returns {number} nilai saat ini selama animasi berlangsung
 */
export function useCountUp(target, duration = 600, enabled = true) {
  const [current, setCurrent] = useState(0)
  const rafRef  = useRef(null)
  const prevRef = useRef(target)

  useEffect(() => {
    // Respek prefers-reduced-motion
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!enabled || prefersReduced) {
      setCurrent(target)
      return
    }

    // Jika nilai tidak berubah, skip animasi
    if (prevRef.current === target && current === target) return
    prevRef.current = target

    const start      = performance.now()
    const from       = current  // mulai dari nilai saat ini (smooth re-animate)

    function tick(now) {
      const elapsed  = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Easing: easeOutCubic — cepat di awal, melambat di akhir
      const eased    = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(from + (target - from) * eased))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setCurrent(target)
      }
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, enabled])

  return current
}

/**
 * AnimatedAmount — tampilkan angka rupiah dengan count-up animation.
 * Re-usable di mana saja: cukup pass `value` (number) dan `formatter` (function).
 *
 * @param {number}   value      - nilai angka asli (bukan string)
 * @param {function} formatter  - fungsi format, mis. fmt atau fmtFull
 * @param {number}   duration   - durasi animasi ms (default 600)
 * @param {string}   className  - class CSS tambahan
 * @param {object}   style      - style inline tambahan
 */
export function AnimatedAmount({ value, formatter, duration = 600, className, style }) {
  const animated = useCountUp(value ?? 0, duration)
  return (
    <span className={className} style={style}>
      {formatter(animated)}
    </span>
  )
}
