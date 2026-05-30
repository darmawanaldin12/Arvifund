'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)
  const [showPass, setShowPass]   = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [checking, setChecking]   = useState(true)

  useEffect(() => {
    // Supabase auto-handle token dari URL hash
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true)
      }
      setChecking(false)
    })

    // Cek session aktif
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true)
      setChecking(false)
    })
  }, [])

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password minimal 6 karakter'); return }
    if (password !== confirm) { setError('Password tidak cocok'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => router.replace('/dashboard'), 3000)
    } catch (err) {
      setError('Gagal reset password: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (checking) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', color: 'var(--text3)' }}>Memuat...</div>
    </div>
  )

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', background: 'var(--bg)',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 80, height: 80, background: 'white', borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', boxShadow: '0 4px 16px rgba(0,61,155,0.15)', padding: 8,
        }}>
          <img src="/logo.png" alt="Arvifund" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Password Berhasil Diubah!</div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>Mengalihkan ke dashboard...</div>
            </div>
          ) : !validSession ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Link Tidak Valid</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
                Link reset sudah kadaluarsa atau tidak valid. Minta link baru.
              </div>
              <button onClick={() => router.replace('/login')} style={{
                width: '100%', height: 44, background: 'var(--accent)', color: 'white',
                border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Kembali ke Login</button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>🔐 Buat Password Baru</div>
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>Minimal 6 karakter</div>
              </div>

              <form onSubmit={handleReset}>
                <div className="form-group">
                  <label className="form-label">Password Baru</label>
                  <div style={{ position: 'relative' }}>
                    <input className="form-input"
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••" value={password}
                      onChange={e => setPassword(e.target.value)}
                      required style={{ paddingRight: 44 }} />
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

                <div className="form-group">
                  <label className="form-label">Konfirmasi Password</label>
                  <input className="form-input" type="password" placeholder="••••••••"
                    value={confirm} onChange={e => setConfirm(e.target.value)} required />
                </div>

                {error && (
                  <div style={{
                    marginBottom: 12, padding: '10px 12px',
                    background: 'var(--red-bg)', borderRadius: 8,
                    color: 'var(--red)', fontSize: 13, fontWeight: 600,
                  }}>{error}</div>
                )}

                <button type="submit" disabled={loading} style={{
                  width: '100%', height: 46, fontSize: 15, fontWeight: 700,
                  background: 'var(--accent)', color: 'white', border: 'none',
                  borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', opacity: loading ? 0.8 : 1,
                }}>
                  {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
