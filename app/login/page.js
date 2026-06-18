'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'
import {
  isBiometricSupported,
  isBiometricRegistered,
  authenticateWithBiometric,
  registerBiometric,
  removeBiometricCred,
  getBiometricCred,
} from '../../lib/biometric'
import { popReturnTo } from '../../lib/returnTo'
import { Fingerprint, ScanFace, Loader2, Eye, EyeOff, KeyRound, Mail, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showPass, setShowPass] = useState(false)

  const [showForgot, setShowForgot]       = useState(false)
  const [forgotEmail, setForgotEmail]     = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMsg, setForgotMsg]         = useState('')
  const [forgotError, setForgotError]     = useState('')

  const [bioSupported, setBioSupported]       = useState(false)
  const [bioRegistered, setBioRegistered]     = useState(false)
  const [bioLoading, setBioLoading]           = useState(false)
  const [bioAutoTriggered, setBioAutoTriggered] = useState(false)
  const [showRegisterBio, setShowRegisterBio] = useState(false)
  const [pendingEmail, setPendingEmail]       = useState('')
  const [pendingPassword, setPendingPassword] = useState('')

  const autoTriggerRef = useRef(false)

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const isTimeout = searchParams?.get('reason') === 'timeout'

  const isIos = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Mac/.test(navigator.userAgent)
  const BioIcon = isIos ? ScanFace : Fingerprint
  const bioLabel = isIos ? 'Face ID / Touch ID' : 'Sidik Jari / Biometrik'

  useEffect(() => {
    async function initBio() {
      const supported = await isBiometricSupported()
      setBioSupported(supported)
      const registered = isBiometricRegistered()
      setBioRegistered(registered)
      if (supported && registered && !autoTriggerRef.current) {
        autoTriggerRef.current = true
        setBioAutoTriggered(true)
        setTimeout(() => triggerBiometric(), 400)
      }
    }
    initBio()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function triggerBiometric() {
    setBioLoading(true)
    setError('')
    try {
      await authenticateWithBiometric(supabase)
      try { localStorage.setItem('arvifund_last_active', Date.now().toString()) } catch (_) {}
      // Kembali ke halaman asal sebelum timeout, atau fallback ke /input jika dari share
      const returnTo = popReturnTo('/dashboard')
      router.push(returnTo)
    } catch (err) {
      setBioAutoTriggered(false)
      if (err.name === 'NotAllowedError') {
        setError('')
      } else if (err.message === 'NEEDS_REREGISTER' || err.message.includes('NEEDS_REREGISTER')) {
        removeBiometricCred()
        setBioRegistered(false)
        setError('Data biometrik perlu didaftarkan ulang. Silakan login dengan email & password.')
      } else if (err.message.startsWith('LOGIN_FAILED')) {
        removeBiometricCred()
        setBioRegistered(false)
        setError('Login biometrik gagal. Password mungkin sudah berubah. Silakan login ulang dengan email & password.')
      } else {
        setError('Biometrik gagal: ' + err.message)
      }
    } finally {
      setBioLoading(false)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      if (bioSupported && !isBiometricRegistered()) {
        setPendingEmail(email)
        setPendingPassword(password)
        setShowRegisterBio(true)
      } else {
        const returnTo = popReturnTo('/dashboard')
        router.push(returnTo)
      }
    } catch (err) {
      setError(err.message || 'Email atau password salah')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegisterBio() {
    if (!pendingEmail || !pendingPassword) { router.push(popReturnTo('/dashboard')); return }
    setBioLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const username = user?.email?.split('@')[0] || 'User'
      await registerBiometric(user?.id || '', username, pendingEmail, pendingPassword)
      setBioRegistered(true)
      router.push(popReturnTo('/dashboard'))
    } catch (err) {
      router.push(popReturnTo('/dashboard'))
    } finally {
      setBioLoading(false)
      setPendingEmail('')
      setPendingPassword('')
    }
  }

  function handleSkipBio() {
    setPendingEmail('')
    setPendingPassword('')
    router.push(popReturnTo('/dashboard'))
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

  // ── Layar daftar biometrik ──
  if (showRegisterBio) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg)' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, boxShadow: '0 4px 12px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <BioIcon size={36} color="var(--accent)" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'var(--text1)' }}>Aktifkan {bioLabel}?</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24, lineHeight: 1.6 }}>
              Login lebih cepat lain kali — bahkan setelah sesi habis — tanpa perlu ketik password lagi.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={handleRegisterBio} disabled={bioLoading}
                style={{ width: '100%', height: 48, fontSize: 15, fontWeight: 700, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 10, cursor: bioLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: bioLoading ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, touchAction: 'manipulation' }}>
                {bioLoading ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Memproses...</> : <><BioIcon size={18} /> Ya, Aktifkan</>}
              </button>
              <button onClick={handleSkipBio}
                style={{ width: '100%', height: 44, fontSize: 14, fontWeight: 600, background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', touchAction: 'manipulation' }}>
                Nanti Saja
              </button>
            </div>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Layar loading auto-trigger biometric ──
  if (bioAutoTriggered && bioLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 96, height: 96, borderRadius: 28, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <BioIcon size={52} color="var(--accent)" />
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text1)', marginBottom: 8 }}>Verifikasi Identitas</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 28 }}>Gunakan {bioLabel} untuk masuk</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
            {[0, 0.2, 0.4].map((d, i) => (
              <span key={i} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: `dotPulse 1.4s ease-in-out ${d}s infinite` }} />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setBioAutoTriggered(false); setBioLoading(false) }}
          style={{ position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)', background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', padding: '12px 24px' }}
        >
          Gunakan Password
        </button>
        <style>{`
          @keyframes dotPulse { 0%,80%,100% { transform:scale(0.6);opacity:0.4 } 40% { transform:scale(1.2);opacity:1 } }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 100, height: 100, background: 'white', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 8px 32px rgba(0,61,155,0.15)', padding: 10 }}>
          <img src="/logo.png" alt="Arvifund" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>Personal Finance Tracker</p>
      </div>

      {isTimeout && (
        <div style={{ width: '100%', maxWidth: 360, padding: '12px 16px', marginBottom: 16, background: 'var(--yellow-bg)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, color: 'var(--yellow)', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
          ⏱ Sesi berakhir karena tidak aktif 1 jam
        </div>
      )}

      {/* Tombol biometrik */}
      {bioSupported && bioRegistered && !showForgot && (
        <div style={{ width: '100%', maxWidth: 360, marginBottom: 16 }}>
          <button onClick={triggerBiometric} disabled={bioLoading}
            style={{ width: '100%', height: 58, fontSize: 16, fontWeight: 700, background: 'linear-gradient(135deg, #1e3a5f, var(--accent))', color: 'white', border: 'none', borderRadius: 14, cursor: bioLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: bioLoading ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 4px 16px rgba(0,61,155,0.3)', touchAction: 'manipulation' }}>
            {bioLoading
              ? <><Loader2 size={22} style={{ animation: 'spin 0.8s linear infinite' }} /> Verifikasi...</>
              : <><BioIcon size={24} /> Masuk dengan {bioLabel}</>}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>atau gunakan password</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
        </div>
      )}

      {!showForgot ? (
        <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
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
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, display: 'flex', alignItems: 'center' }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--red-bg)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              style={{ marginTop: 20, width: '100%', height: 46, fontSize: 15, fontWeight: 700, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', opacity: loading ? 0.8 : 1, touchAction: 'manipulation' }}>
              {loading ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Memuat...</> : 'Masuk'}
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(email) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
              Lupa Password?
            </button>
          </div>
        </form>
      ) : (
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 800, color: 'var(--text1)', marginBottom: 6 }}>
                <KeyRound size={20} color="var(--accent)" /> Reset Password
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>Masukkan email yang terdaftar. Kami akan kirim link reset password.</div>
            </div>
            {forgotMsg ? (
              <div style={{ padding: '14px 16px', background: 'var(--green-bg)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, color: 'var(--green)', fontSize: 13, fontWeight: 600, lineHeight: 1.6, marginBottom: 16 }}>
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
                  <div style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--red-bg)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>
                    {forgotError}
                  </div>
                )}
                <button type="submit" disabled={forgotLoading}
                  style={{ width: '100%', height: 44, fontSize: 14, fontWeight: 700, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, cursor: forgotLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', opacity: forgotLoading ? 0.8 : 1 }}>
                  {forgotLoading ? 'Mengirim...' : <><Mail size={15} /> Kirim Link Reset</>}
                </button>
              </form>
            )}
          </div>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button type="button" onClick={() => { setShowForgot(false); setForgotMsg(''); setForgotError('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 13, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ArrowLeft size={14} /> Kembali ke Login
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
