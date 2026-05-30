'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

const TIMEOUT_MS = 60 * 60 * 1000 // 1 jam
const STORAGE_KEY = 'arvifund_last_active'

export function useSessionTimeout() {
  const router = useRouter()
  const timerRef = useRef(null)

  const logout = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY)
    await supabase.auth.signOut()
    router.replace('/login?reason=timeout')
  }, [router])

  const resetTimer = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(logout, TIMEOUT_MS)
  }, [logout])

  useEffect(() => {
    // Cek apakah session sudah expired saat app dibuka
    const lastActive = localStorage.getItem(STORAGE_KEY)
    if (lastActive) {
      const elapsed = Date.now() - parseInt(lastActive)
      if (elapsed >= TIMEOUT_MS) {
        logout()
        return
      }
      // Sisa waktu
      const remaining = TIMEOUT_MS - elapsed
      timerRef.current = setTimeout(logout, remaining)
    } else {
      resetTimer()
    }

    // Event listener untuk activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))

    // Cek saat tab/window kembali aktif (visibility change)
    // Bug 3 fix: reset timer saat tab kembali aktif jika session belum expired
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        const lastActive = localStorage.getItem(STORAGE_KEY)
        if (lastActive) {
          const elapsed = Date.now() - parseInt(lastActive)
          if (elapsed >= TIMEOUT_MS) {
            logout()
          } else {
            resetTimer()
          }
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach(e => window.removeEventListener(e, resetTimer))
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [logout, resetTimer])
}
