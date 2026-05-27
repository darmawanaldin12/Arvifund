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
  const [periodDate, setPeriodDate]     = useState(profile?.pay_period_date || 25)
  const [theme, setTheme]               = useState('dark')

  // Load theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('arvifund-theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('arvifund-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  async function handleSavePeriod() {
    setSavingPeriod(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ pay_period_date: parseInt(periodDate) })
        .eq('id', user?.id)
      if (error) throw error
      showToast('✅ Tanggal gajian disimpan')
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

  const isLight = theme === 'light'

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
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {isLight ? '☀️ Mode Terang' : '🌙 Mode Gelap'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                {isLight ? 'Tampilan terang cocok untuk siang hari' : 'Tampilan gelap cocok untuk malam hari'}
              </div>
            </div>
            {/* Toggle Switch */}
            <div
              onClick={toggleTheme}
              style={{
                width: 52, height: 28,
                borderRadius: 14,
                background: isLight ? 'var(--accent)' : 'var(--surface3)',
                border: '1px solid var(--border2)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.3s',
                flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute',
                top: 3,
                left: isLight ? 26 : 3,
                width: 20, height: 20,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                transition: 'left 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
              }}>
                {isLight ? '☀️' : '🌙'}
              </div>
            </div>
          </div>
        </div>

        {/* Tanggal Gajian */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>Tanggal Gajian</div>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
            Digunakan sebagai batas periode (tgl {periodDate} bulan ini — tgl {periodDate - 1} bulan depan)
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              className="form-select"
              value={periodDate}
              onChange={e => setPeriodDate(e.target.value)}
              style={{ flex: 1 }}
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>Tanggal {d}</option>
              ))}
            </select>
            <button
              className="btn btn-primary"
              onClick={handleSavePeriod}
              disabled={savingPeriod}
              style={{ flexShrink: 0 }}
            >
              {savingPeriod ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
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
