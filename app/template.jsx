'use client'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'

// Tentukan variant animasi berdasarkan pathname
function getVariants(pathname) {
  // Fade + Scale — Auth pages & profile
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/arpijan')
  ) {
    return {
      initial:  { opacity: 0, scale: 0.97 },
      animate:  { opacity: 1, scale: 1 },
      exit:     { opacity: 0, scale: 1.02 },
    }
  }

  // Slide Up — Action & input pages
  if (
    pathname.startsWith('/input') ||
    pathname.startsWith('/budget') ||
    pathname.startsWith('/wallet')
  ) {
    return {
      initial:  { opacity: 0, y: 28 },
      animate:  { opacity: 1, y: 0 },
      exit:     { opacity: 0, y: -16 },
    }
  }

  // Slide Left — Data / record pages (drill-down feel)
  if (
    pathname.startsWith('/transaksi') ||
    pathname.startsWith('/income') ||
    pathname.startsWith('/expenses') ||
    pathname.startsWith('/cashrecord') ||
    pathname.startsWith('/record')
  ) {
    return {
      initial:  { opacity: 0, x: 32 },
      animate:  { opacity: 1, x: 0 },
      exit:     { opacity: 0, x: -24 },
    }
  }

  // Fade — Dashboard & settings (default)
  return {
    initial:  { opacity: 0 },
    animate:  { opacity: 1 },
    exit:     { opacity: 0 },
  }
}

export default function Template({ children }) {
  const pathname = usePathname()
  const variants = getVariants(pathname)

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={{
          duration: 0.25,
          ease: 'easeOut',
        }}
        style={{ willChange: 'opacity, transform' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
