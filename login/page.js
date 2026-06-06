'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'
import {
  isBiometricSupported,
  isBiometricRegistered,
  authenticateWithBiometric,
  registerBiometric,
  removeBiometricCred,
} from '../../lib/biometric'
import {
  Fingerprint,
  ScanFace,
  Lock,
  Eye,
  EyeOff,
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  KeyRound,
  Send,
} from 'lucide-react'

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
  const [showRegisterBio, setShowRegisterBio] = useState(false)
  const [pendingEmail, setPendingEmail]       = useState('')
  const [pendingPassword, setPendingPassword] = useState('')

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const isTimeout = searchParams?.get('reason') === 'timeout'

  useEffect(() => {
    async function checkBio() {
      const supported = await isBiometricSupported()
      setBioSupported(supported)
      if (supported) setBioRegistered(isBiometricRegistered())
    }
    checkBio()
  }, [])

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
        router.push('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Email atau password salah')
    } finally {
      setLoading(false)
    }
  }

  async function handleBiometricLogin() {
    setBioLoading(true)
    setError('')
    try {
      await authenticateWithBiometric(supabase)
      try { localStorage.setItem('arvifund_last_active', Date.now().toString()) } catch (_) {}
      router.push('/dashboard')
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('')
      } else if (err.message === 'NEEDS_REREGISTER' || err.message.includes('NEEDS_REREGISTER')) {
        removeBiometricCred()
        setBioRegistered(false)
        setError('Data biometrik perlu didaftarkan ulang. Silakan login dengan email & password.')
      } else if (err.message.startsWith('LOGIN_FAILED')) {
        removeBiometricCred()
        setBioRegistered(false)
        setError('Login biometrik gagal. Password mungkin sudah berubah. Silakan login ulang.')
      } else {
        setError('Biometrik gagal: ' + err.message)
      }
    } finally {
      setBioLoading(false)
    }
  }

  async function handleRegisterBio() {
    if (!pendingEmail || !pendingPassword) { router.push('/dashboard'); return }
    setBioLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const username = user?.email?.split('@')[0] || 'User'
      await registerBiometric(user?.id || '', username, pendingEmail, pendingPassword)
      setBioRegistered(true)
      router.push('/dashboard')
    } catch (err) {
      router.push('/dashboard')
    } finally {
      setBioLoading(false)
      setPendingEmail('')
      setPendingPassword('')
    }
  }

  function handleSkipBio() {
    setPendingEmail('')
    setPendingPassword('')
    router.push('/dashboard')
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

  const isIos = typeof navigator !== 'undefined' && /iPhone|iPad|Mac/.test(navigator.userAgent)
  const BioIcon = isIos ? ScanFace : Fingerprint
  const bioLabel = isIos ? 'Face ID / Touch ID' : 'Sidik Jari / Biometrik'

  // ── Register biometrik screen ─────────────────────────────
  if (showRegisterBio) {
    return (
      <div style={S.page}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={S.card}>
            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
              <div style={S.bioIconCircle}>
                <BioIcon size={34} strokeWidth={1.5} color="var(--accent)" />
              </div>
              <div style={S.cardTitle}>Aktifkan {bioLabel}?</div>
              <div style={S.cardDesc}>
                Login lebih cepat lain kali — tanpa ketik password — bahkan setelah sesi habis.
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
              <button onClick={handleRegisterBio} disabled={bioLoading}
                style={{ ...S.btnPrimary, ...(bioLoading ? S.btnDisabled : {}) }}>
                {bioLoading
                  ? <><Loader2 size={16} style={S.spinIcon} /> Memproses...</>
                  : <><ShieldCheck size={16} /> Ya, Aktifkan</>}
              </button>
              <button onClick={handleSkipBio} style={S.btnSecondary}>Nanti Saja</button>
            </div>
          </div>
        </div>
        <style>{CSS}</style>
      </div>
    )
  }

  return (
    <div style={S.page}>

      {/* Logo — tetap /logo.png */}
      <div style={S.logoWrap}>
        <div style={S.logoBox}>
          <img src="/logo.png" alt="Arvifund" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={S.appName}>Arvifund</div>
        <div style={S.appSub}>Personal Finance Tracker</div>
      </div>

      {/* Timeout banner */}
      {isTimeout && (
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={S.timeoutBanner}>
            <Clock size={15} style={{ flexShrink: 0 }} />
            Sesi berakhir karena tidak aktif 1 jam
          </div>
        </div>
      )}

      {/* Biometric button */}
      {bioSupported && bioRegistered && !showForgot && (
        <div style={{ width: '100%', maxWidth: 380 }}>
          <button onClick={handleBiometricLogin} disabled={bioLoading}
            style={{ ...S.biometricBtn, ...(bioLoading ? S.btnDisabled : {}) }}>
            {bioLoading
              ? <><Loader2 size={18} style={S.spinIcon} /> Verifikasi...</>
              : <><BioIcon size={20} strokeWidth={1.75} /> Masuk dengan {bioLabel}</>}
          </button>
          <div style={S.divider}>
            <div style={S.dividerLine} />
            <span style={S.dividerText}>atau gunakan password</span>
            <div style={S.dividerLine} />
          </div>
        </div>
      )}

      {!showForgot ? (
        /* ── Login form ── */
        <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 380 }}>
          <div style={S.card}>
            <div style={S.fieldGroup}>
              <label style={S.label}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={S.inputIcon} />
                <input style={{ ...S.input, paddingLeft: 36 }}
                  type="email" placeholder="email@gmail.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email" inputMode="email"
                  className="lp-input" />
              </div>
            </div>
            <div style={{ ...S.fieldGroup, marginBottom: 0 }}>
              <label style={S.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={15} style={S.inputIcon} />
                <input
                  style={{ ...S.input, paddingLeft: 36, paddingRight: 44 }}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password"
                  className="lp-input" />
                <button type="button" onClick={() => setShowPass(!showPass)} style={S.eyeBtn}>
                  {showPass
                    ? <EyeOff size={16} />
                    : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={S.errorBox}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ ...S.btnPrimary, marginTop: 20, ...(loading ? S.btnDisabled : {}) }}>
              {loading
                ? <><Loader2 size={16} style={S.spinIcon} /> Memuat...</>
                : 'Masuk'}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button type="button"
              onClick={() => { setShowForgot(true); setForgotEmail(email) }}
              style={S.textBtn}>
              Lupa Password?
            </button>
          </div>
        </form>

      ) : (
        /* ── Forgot password ── */
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={S.card}>
            <div style={{ marginBottom: 20 }}>
              <div style={S.cardTitle}>Reset Password</div>
              <div style={S.cardDesc}>Masukkan email yang terdaftar. Kami akan kirim link reset password.</div>
            </div>

            {forgotMsg ? (
              <div style={S.successBox}>
                <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                {forgotMsg}
              </div>
            ) : (
              <form onSubmit={handleForgot}>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} style={S.inputIcon} />
                    <input style={{ ...S.input, paddingLeft: 36 }}
                      type="email" placeholder="email@gmail.com"
                      value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                      required autoComplete="email" inputMode="email"
                      className="lp-input" />
                  </div>
                </div>
                {forgotError && (
                  <div style={{ ...S.errorBox, marginBottom: 12 }}>
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    {forgotError}
                  </div>
                )}
                <button type="submit" disabled={forgotLoading}
                  style={{ ...S.btnPrimary, ...(forgotLoading ? S.btnDisabled : {}) }}>
                  {forgotLoading
                    ? <><Loader2 size={16} style={S.spinIcon} /> Mengirim...</>
                    : <><Send size={15} /> Kirim Link Reset</>}
                </button>
              </form>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button type="button"
              onClick={() => { setShowForgot(false); setForgotMsg(''); setForgotError('') }}
              style={{ ...S.textBtn, color: 'var(--text3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ArrowLeft size={13} /> Kembali ke Login
            </button>
          </div>
        </div>
      )}

      <style>{CSS}</style>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 20px',
    background: 'var(--bg)',
    gap: 20,
  },
  logoWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  logoBox: {
    width: 64,
    height: 64,
    background: 'var(--surface)',
    borderRadius: 18,
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 6px 20px rgba(0,0,0,0.06)',
    padding: 10,
    marginBottom: 4,
  },
  appName: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: '-0.4px',
    color: 'var(--text1)',
  },
  appSub: {
    fontSize: 12,
    color: 'var(--text3)',
    fontWeight: 500,
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05), 0 20px 40px rgba(0,0,0,0.03)',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text2)',
    marginBottom: 6,
    letterSpacing: '0.2px',
  },
  input: {
    width: '100%',
    height: 40,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '0 12px',
    color: 'var(--text1)',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  inputIcon: {
    position: 'absolute',
    left: 11,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text3)',
    pointerEvents: 'none',
    flexShrink: 0,
  },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text3)',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    lineHeight: 1,
  },
  btnPrimary: {
    width: '100%',
    height: 42,
    background: 'var(--accent)',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0 1px 2px rgba(0,0,0,0.12), 0 4px 8px rgba(0,61,155,0.2)',
    touchAction: 'manipulation',
    transition: 'all 0.15s',
  },
  btnSecondary: {
    width: '100%',
    height: 40,
    background: 'var(--surface2)',
    color: 'var(--text2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    touchAction: 'manipulation',
  },
  btnDisabled: {
    opacity: 0.65,
    cursor: 'not-allowed',
  },
  textBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--accent)',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
  },
  biometricBtn: {
    width: '100%',
    height: 54,
    background: 'var(--accent)',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1), 0 6px 16px rgba(0,61,155,0.25)',
    touchAction: 'manipulation',
    transition: 'all 0.15s',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'var(--border)',
  },
  dividerText: {
    fontSize: 11,
    color: 'var(--text3)',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    letterSpacing: '0.3px',
  },
  errorBox: {
    marginTop: 12,
    padding: '10px 12px',
    background: 'var(--red-bg)',
    border: '1px solid rgba(244,63,94,0.2)',
    borderRadius: 8,
    color: 'var(--red)',
    fontSize: 13,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    lineHeight: 1.5,
  },
  successBox: {
    padding: '12px 14px',
    background: 'var(--green-bg)',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: 8,
    color: 'var(--green)',
    fontSize: 13,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    lineHeight: 1.5,
    marginBottom: 16,
  },
  timeoutBanner: {
    background: 'var(--yellow-bg)',
    border: '1px solid rgba(245,158,11,0.25)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--yellow)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  bioIconCircle: {
    width: 72,
    height: 72,
    background: 'var(--accent-light)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    border: '1px solid var(--accent-dim)',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 800,
    color: 'var(--text1)',
    marginBottom: 8,
    letterSpacing: '-0.2px',
  },
  cardDesc: {
    fontSize: 13,
    color: 'var(--text3)',
    lineHeight: 1.65,
  },
  spinIcon: {
    animation: 'spin 0.8s linear infinite',
    flexShrink: 0,
  },
}

const CSS = `
  @keyframes spin { to { transform: rotate(360deg); } }
  .lp-input:focus {
    border-color: var(--accent) !important;
    box-shadow: 0 0 0 3px var(--accent-light) !important;
    background: var(--surface) !important;
    outline: none;
  }
`
