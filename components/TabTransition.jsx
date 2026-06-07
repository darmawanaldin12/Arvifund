'use client'
import { AnimatePresence, motion } from 'motion/react'
import { useRef } from 'react'

/**
 * TabTransition — wrapper untuk animasi slide left/right antar tab
 *
 * Props:
 *   tabKey   : string/number — key unik tab aktif (misal: 'ai', 'manual', 0, 1)
 *   direction: 'left' | 'right' — arah slide (opsional, default 'left')
 *   children : konten tab
 */
export default function TabTransition({ tabKey, direction = 'left', children }) {
  const xIn  = direction === 'right' ? -28 : 28
  const xOut = direction === 'right' ? 28  : -28

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={tabKey}
        initial={{ opacity: 0, x: xIn }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: xOut }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{ willChange: 'opacity, transform' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
