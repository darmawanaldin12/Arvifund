'use client'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import BottomNav from '../components/layout/BottomNav'

function isAuthRoute(pathname) {
  return (
    pathname.startsWith('/login') ||
    pathname.startsWith('/reset-password') ||
    pathname === '/'
  )
}

// Tentukan variant animasi berdasarkan pathname
function getVariants(pathname) {
  // Fade + Scale — Auth pages
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/reset-password')
  ) {
    return {
      initial:  { opacity: 0, scale: 0.97 },
      animate:  { opacity: 1, scale: 1 },
      exit:     { opacity: 0, scale: 1.02 },
    }
  }

  // Fade + Scale (halus) — Dashboard & Arpijan (halaman utama / profil)
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/arpijan')
  ) {
    return {
      initial:  { opacity: 0, scale: 0.98 },
      animate:  { opacity: 1, scale: 1 },
      exit:     { opacity: 0, scale: 1.01 },
    }
  }

  // Slide Up — Action & input pages + Settings
  if (
    pathname.startsWith('/input') ||
    pathname.startsWith('/budget') ||
    pathname.startsWith('/wallet') ||
    pathname.startsWith('/settings')
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

  // Fade — fallback
  return {
    initial:  { opacity: 0 },
    animate:  { opacity: 1 },
    exit:     { opacity: 0 },
  }
}

export default function Template({ children }) {
  const pathname = usePathname()
  const variants = getVariants(pathname)
  const showBottomNav = !isAuthRoute(pathname)

  return (
    <>
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

      {/* BottomNav di luar motion wrapper — tidak ikut animasi */}
      {showBottomNav && <BottomNav />}
    </>
  )
}
