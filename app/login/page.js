'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showPass, setShowPass] = useState(false)

  // Lupa password state
  const [showForgot, setShowForgot]     = useState(false)
  const [forgotEmail, setForgotEmail]   = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMsg, setForgotMsg]       = useState('')
  const [forgotError, setForgotError]   = useState('')

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

  async function handleForgot(e) {
    e.preventDefault()
    setForgotError('')
    setForgotMsg('')
    if (!forgotEmail) { setForgotError('Masukkan email kamu'); return }
    setForgotLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setForgotMsg(`Link reset dikirim ke ${forgotEmail} — cek inbox atau folder spam!`)
    } catch (err) {
      setForgotError('Gagal kirim email: ' + err.message)
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', background: 'var(--bg)',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 100, height: 100, background: 'white', borderRadius: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px', boxShadow: '0 8px 32px rgba(0,61,155,0.15)', padding: 10,
        }}>
          <img src="/logo.png" alt="Arvifund" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>Personal Finance Tracker</p>
      </div>

      {/* Timeout banner */}
      {isTimeout && (
        <div style={{
          width: '100%', maxWidth: 360, padding: '12px 16px', marginBottom: 16,
          background: 'var(--yellow-bg)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 8, color: 'var(--yellow)', fontSize: 13, fontWeight: 600, textAlign: 'center',
        }}>⏱ Sesi berakhir karena tidak aktif 1 jam</div>
      )}

      {/* ── LOGIN FORM ── */}
      {!showForgot ? (
        <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 360 }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="email@gmail.com"
                value={email} onChange={e => setEmail(e.target.value)}
                required autoComplete="email" inputMode="email" />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input"
                  type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password" style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {showPass ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                marginTop: 12, padding: '10px 12px',
                background: 'var(--red-bg)', border: '1px solid rgba(244,63,94,0.2)',
                borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600,
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              marginTop: 20, width: '100%', height: 46, fontSize: 15, fontWeight: 700,
              background: 'var(--accent)', color: 'white', border: 'none',
              borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'inherit', opacity: loading ? 0.8 : 1,
            }}>
              {loading ? (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, animation: 'spin 0.8s linear infinite' }}>refresh</span>
                  Memuat...
                </>
              ) : 'Masuk'}
            </button>
          </div>

          {/* Lupa password link */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(email) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
              Lupa Password?
            </button>
          </div>
        </form>

      ) : (
        /* ── FORGOT PASSWORD FORM ── */
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text1)', marginBottom: 6 }}>
                🔐 Reset Password
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
                Masukkan email yang terdaftar. Kami akan kirim link reset password ke inbox kamu.
              </div>
            </div>

            {forgotMsg ? (
              <div style={{
                padding: '14px 16px', background: 'var(--green-bg)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 8, color: 'var(--green)', fontSize: 13, fontWeight: 600,
                lineHeight: 1.6, marginBottom: 16,
              }}>
                ✅ {forgotMsg}
              </div>
            ) : (
              <form onSubmit={handleForgot}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" placeholder="email@gmail.com"
                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    required autoComplete="email" inputMode="email" />
                </div>

                {forgotError && (
                  <div style={{
                    marginBottom: 12, padding: '10px 12px',
                    background: 'var(--red-bg)', border: '1px solid rgba(244,63,94,0.2)',
                    borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600,
                  }}>{forgotError}</div>
                )}

                <button type="submit" disabled={forgotLoading} style={{
                  width: '100%', height: 44, fontSize: 14, fontWeight: 700,
                  background: 'var(--accent)', color: 'white', border: 'none',
                  borderRadius: 8, cursor: forgotLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontFamily: 'inherit', opacity: forgotLoading ? 0.8 : 1,
                }}>
                  {forgotLoading ? 'Mengirim...' : '📧 Kirim Link Reset'}
                </button>
              </form>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button type="button" onClick={() => { setShowForgot(false); setForgotMsg(''); setForgotError('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 13, fontFamily: 'inherit' }}>
              ← Kembali ke Login
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
