'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { useToast } from '../../hooks/useToast'
import { supabase } from '../../lib/supabase'

export default function SettingsPage() {
  const router = useRouter()
  const { user, profile, loadData } = useData()
  const { showToast, ToastContainer } = useToast()

  const [showLogout, setShowLogout]     = useState(false)
  const [savingPeriod, setSavingPeriod] = useState(false)
  const [periodDate, setPeriodDate]       = useState(25)
  const [periodStartMonth, setPeriodStartMonth] = useState('')
  const [periodStartYear, setPeriodStartYear]   = useState('')

  // Sync dari profile setelah load
  useEffect(() => {
    if (profile?.pay_period_date) setPeriodDate(profile.pay_period_date)
    if (profile?.pay_period_start) {
      const d = new Date(profile.pay_period_start)
      setPeriodStartMonth(String(d.getMonth() + 1))
      setPeriodStartYear(String(d.getFullYear()))
    }
  }, [profile?.pay_period_date, profile?.pay_period_start])
  const [theme, setTheme]               = useState('auto')

  // Load theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('arvifund-theme') || 'auto'
    setTheme(saved)
    applyTheme(saved)
  }, [])

  function applyTheme(val) {
    let actual
    if (val === 'auto') {
      actual = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } else {
      actual = val
    }
    document.documentElement.setAttribute('data-theme', actual)
  }

  function cycleTheme() {
    const order = ['auto', 'dark', 'light']
    const next = order[(order.indexOf(theme) + 1) % order.length]
    setTheme(next)
    localStorage.setItem('arvifund-theme', next)
    applyTheme(next)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  async function handleSavePeriod() {
    setSavingPeriod(true)
    try {
      const tgl = parseInt(periodDate)
      let pay_period_start = null
      if (periodStartMonth && periodStartYear) {
        const mm = String(periodStartMonth).padStart(2, '0')
        const dd = String(tgl).padStart(2, '0')
        pay_period_start = `${periodStartYear}-${mm}-${dd}`
      }
      const { error } = await supabase
        .from('profiles')
        .update({ pay_period_date: tgl, pay_period_start })
        .eq('id', user?.id)
      if (error) throw error
      showToast('✅ Periode gajian disimpan')
      await loadData()
    } catch (err) {
      showToast('❌ Gagal: ' + err.message, 'error')
    } finally {
      setSavingPeriod(false)
    }
  }

  async function handleResetPassword() {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user?.email, {
        redirectTo: `${window.location.origin}/settings`,
      })
      if (error) throw error
      showToast('✅ Link reset dikirim ke email')
    } catch (err) {
      showToast('❌ Gagal: ' + err.message, 'error')
    }
  }

  const isAuto  = theme === 'auto'
  const isLight = theme === 'light'
  const themeLabel = isAuto ? '🌗 Ikut Sistem' : isLight ? '☀️ Mode Terang' : '🌙 Mode Gelap'
  const themeDesc  = isAuto ? 'Otomatis menyesuaikan pengaturan ponsel' : isLight ? 'Tampilan terang cocok untuk siang hari' : 'Tampilan gelap cocok untuk malam hari'

  return (
    <>
      <AppHeader title="Settings" />
      <div className="page-container">

        {/* Profile Card */}
        <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52,
            background: 'linear-gradient(135deg, #1F4E79, #38bdf8)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0,
          }}>
            {profile?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{profile?.username || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{user?.email}</div>
            {profile?.chat_id && (
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Telegram ID: {profile.chat_id}</div>
            )}
          </div>
        </div>

        {/* Tampilan / Theme Toggle */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>Tampilan</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{themeLabel}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{themeDesc}</div>
            </div>
            {/* 3-state button: auto → dark → light */}
            <button
              onClick={cycleTheme}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                background: isAuto ? 'rgba(56,189,248,0.12)' : isLight ? 'rgba(245,158,11,0.12)' : 'rgba(148,163,184,0.1)',
                border: `1px solid ${isAuto ? 'var(--accent)' : isLight ? 'var(--yellow)' : 'var(--border2)'}`,
                color: isAuto ? 'var(--accent)' : isLight ? 'var(--yellow)' : 'var(--text2)',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              {isAuto ? '🌗 Auto' : isLight ? '☀️ Terang' : '🌙 Gelap'}
            </button>
          </div>
        </div>

        {/* Tanggal Gajian */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>Periode Gajian</div>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
            Set tanggal mulai gajian pertama kali. Periode akan digenerate otomatis dari situ sampai sekarang.
          </p>
          {/* Baris 1: Tanggal + Bulan + Tahun */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <select className="form-select" value={periodDate} onChange={e => setPeriodDate(e.target.value)} style={{ flex: 1 }}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>Tgl {d}</option>
              ))}
            </select>
            <select className="form-select" value={periodStartMonth} onChange={e => setPeriodStartMonth(e.target.value)} style={{ flex: 1.5 }}>
              <option value="">-- Bulan --</option>
              {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((b, i) => (
                <option key={i+1} value={i+1}>{b}</option>
              ))}
            </select>
            <select className="form-select" value={periodStartYear} onChange={e => setPeriodStartYear(e.target.value)} style={{ flex: 1 }}>
              <option value="">-- Tahun --</option>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 4 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {periodDate && periodStartMonth && periodStartYear && (
            <p style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 8 }}>
              📅 Periode mulai: {periodDate} {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][periodStartMonth-1]} {periodStartYear}
            </p>
          )}
          <button
            className="btn btn-primary btn-full"
            onClick={handleSavePeriod}
            disabled={savingPeriod}
          >
            {savingPeriod ? 'Menyimpan...' : 'Simpan Periode'}
          </button>
        </div>

        {/* Reset Password */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>Keamanan</div>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
            Link reset password akan dikirim ke {user?.email}
          </p>
          <button className="btn btn-ghost btn-full" onClick={handleResetPassword}>
            🔐 Kirim Link Reset Password
          </button>
        </div>

        {/* Tentang */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>Tentang Arvifund</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text3)' }}>
            {[
              ['Versi', '2.0.0'],
              ['Platform', 'Next.js + Supabase'],
              ['Database', 'PostgreSQL'],
              ['Input', 'Telegram Bot + n8n'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{k}</span>
                <span style={{ color: 'var(--text1)', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Install PWA hint */}
        <div className="card" style={{ marginBottom: 16, background: 'rgba(56,189,248,0.06)', borderColor: 'rgba(56,189,248,0.2)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 24 }}>📱</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Install ke Homescreen</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                <strong>Android:</strong> Menu (⋮) → Add to Home Screen<br/>
                <strong>iPhone:</strong> Share (⬆) → Add to Home Screen
              </div>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          className="btn btn-danger btn-full"
          onClick={() => setShowLogout(true)}
          style={{ height: 48, fontSize: 15 }}
        >
          🚪 Keluar
        </button>

        {/* Logout Confirm Modal */}
        {showLogout && (
          <div className="modal-overlay" onClick={() => setShowLogout(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <span className="modal-title">Konfirmasi Logout</span>
              </div>
              <div className="modal-body">
                <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20 }}>
                  Yakin mau keluar dari Arvifund?
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-ghost" onClick={() => setShowLogout(false)} style={{ flex: 1 }}>Batal</button>
                  <button className="btn btn-danger" onClick={handleLogout} style={{ flex: 1 }}>Ya, Keluar</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      <ToastContainer />
    </>
  )
}
