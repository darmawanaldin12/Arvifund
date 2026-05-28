'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '../../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const isTimeout = searchParams?.get('reason') === 'timeout'

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      router.push('/dashboard')
    } catch (err) {
      setError('Email atau password salah')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: '#0f172a',
    }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: 110, height: 110,
          background: 'white',
          borderRadius: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
          boxShadow: '0 8px 32px rgba(56,189,248,0.25)',
          padding: 12,
          overflow: 'hidden',
        }}>
          <img
            src="/logo.png"
            alt="Arvifund"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Personal Finance Tracker</p>
      </div>

      {/* Timeout banner */}
      {isTimeout && (
        <div style={{
          width: '100%', maxWidth: 360,
          padding: '12px 16px',
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 8,
          color: '#f59e0b',
          fontSize: 13,
          fontWeight: 600,
          textAlign: 'center',
          marginBottom: 16,
        }}>
          ⏱ Sesi berakhir karena tidak aktif 1 jam
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 360 }}>
        <div style={{
          background: '#1e293b',
          border: '1px solid rgba(148,163,184,0.12)',
          borderRadius: 14,
          padding: 24,
        }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Email</label>
            <input
              type="email"
              placeholder="email@gmail.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              inputMode="email"
              style={{
                width: '100%', background: '#253348', border: '1px solid rgba(148,163,184,0.2)',
                borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14,
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 0 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  width: '100%', background: '#253348', border: '1px solid rgba(148,163,184,0.2)',
                  borderRadius: 8, padding: '10px 44px 10px 12px', color: '#f1f5f9', fontSize: 14,
                  fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4,
              }}>
                {showPass ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              marginTop: 12, padding: '10px 12px',
              background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
              borderRadius: 8, color: '#f43f5e', fontSize: 13, fontWeight: 600,
            }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            marginTop: 20, width: '100%', height: 46, fontSize: 15, fontWeight: 700,
            background: loading ? '#1F4E79' : '#38bdf8', color: '#0f172a',
            border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'inherit',
          }}>
            {loading ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Memuat...
              </>
            ) : 'Masuk'}
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#64748b', fontSize: 12, marginTop: 16 }}>
          Lupa password? Ketik{' '}
          <span style={{ color: '#38bdf8', fontWeight: 700 }}>/lupapassword</span>
          {' '}di Telegram
        </p>
      </form>

      <style>{\`@keyframes spin { to { transform: rotate(360deg); } }\`}</style>
    </div>
  )
}
