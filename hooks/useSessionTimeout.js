'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

const TIMEOUT_MS = 60 * 60 * 1000 // 1 jam
const STORAGE_KEY = 'arvifund_last_active'

function safeGetStorage(key) {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(key) } catch { return null }
}

function safeSetStorage(key, value) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, value) } catch {}
}

function safeRemoveStorage(key) {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(key) } catch {}
}

export function useSessionTimeout() {
  const router   = useRouter()
  const timerRef = useRef(null)

  const logout = useCallback(async () => {
    safeRemoveStorage(STORAGE_KEY)
    await supabase.auth.signOut()
    router.replace('/login?reason=timeout')
  }, [router])

  const resetTimer = useCallback(() => {
    safeSetStorage(STORAGE_KEY, Date.now().toString())
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(logout, TIMEOUT_MS)
  }, [logout])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const lastActive = safeGetStorage(STORAGE_KEY)
    if (lastActive) {
      const elapsed = Date.now() - parseInt(lastActive)
      if (elapsed >= TIMEOUT_MS) { logout(); return }
      timerRef.current = setTimeout(logout, TIMEOUT_MS - elapsed)
    } else {
      resetTimer()
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        const last = safeGetStorage(STORAGE_KEY)
        if (last && Date.now() - parseInt(last) >= TIMEOUT_MS) logout()
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
