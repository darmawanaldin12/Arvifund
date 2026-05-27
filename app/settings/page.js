'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { useToast } from '../../hooks/useToast'
import { supabase } from '../../lib/supabase'

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

// Generate daftar bulan dari pay_period_start sampai bulan ini
function getMonthRange(startStr) {
  const result = []
  const today = new Date()
  let cursor
  if (startStr) {
    const s = new Date(startStr)
    cursor = new Date(s.getFullYear(), s.getMonth(), 1)
  } else {
    // Default 6 bulan ke belakang
    cursor = new Date(today.getFullYear(), today.getMonth() - 5, 1)
  }
  const end = new Date(today.getFullYear(), today.getMonth(), 1)
  while (cursor <= end) {
    result.push({ key: `${BULAN[cursor.getMonth()]}-${cursor.getFullYear()}`, bulan: BULAN[cursor.getMonth()], tahun: cursor.getFullYear() })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }
  return result
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, profile, loadData } = useData()
  const { showToast, ToastContainer } = useToast()

  const [showLogout, setShowLogout] = useState(false)
  const [savingPeriod, setSavingPeriod] = useState(false)
  const [defaultDate, setDefaultDate] = useState(25)
  const [overrides, setOverrides] = useState({})
  const [periodStart, setPeriodStart] = useState('')
  const [theme, setTheme] = useState('auto')

  // Sync dari profile
  useEffect(() => {
    if (!profile) return
    setDefaultDate(profile.pay_period_date || 25)
    setOverrides(profile.pay_period_overrides || {})
    setPeriodStart(profile.pay_period_start || '')
  }, [profile])

  // Load theme
  useEffect(() => {
    const saved = localStorage.getItem('arvifund-theme') || 'auto'
    setTheme(saved)
    applyTheme(saved)
  }, [])

  function applyTheme(val) {
    const actual = val === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : val
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

  function setOverrideDate(key, val) {
    setOverrides(prev => ({ ...prev, [key]: val === '' ? undefined : parseInt(val) }))
  }

  async function handleSavePeriod() {
    setSavingPeriod(true)
    try {
      // Bersihkan override yang undefined
      const cleanOverrides = {}
      Object.entries(overrides).forEach(([k, v]) => {
        if (v !== undefined && v !== null) cleanOverrides[k] = v
      })
      const { error } = await supabase
        .from('profiles')
        .update({
          pay_period_date: parseInt(defaultDate),
          pay_period_overrides: cleanOverrides,
          pay_period_start: periodStart || null,
        })
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

  const monthRange = getMonthRange(periodStart)

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
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
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

        {/* Tampilan */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>Tampilan</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{themeLabel}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{themeDesc}</div>
            </div>
            <button onClick={cycleTheme} style={{
              padding: '6px 14px', borderRadius: 20,
              background: isAuto ? 'rgba(56,189,248,0.12)' : isLight ? 'rgba(245,158,11,0.12)' : 'rgba(148,163,184,0.1)',
              border: `1px solid ${isAuto ? 'var(--accent)' : isLight ? 'var(--yellow)' : 'var(--border2)'}`,
              color: isAuto ? 'var(--accent)' : isLight ? 'var(--yellow)' : 'var(--text2)',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
            }}>
              {isAuto ? '🌗 Auto' : isLight ? '☀️ Terang' : '🌙 Gelap'}
            </button>
          </div>
        </div>

        {/* Periode Gajian */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 4 }}>Periode Gajian</div>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
            Set tanggal gajian tiap bulan. Beda bulan bisa beda tanggal.
          </p>

          {/* Default tanggal + mulai dari */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Default Tgl Gajian</div>
              <select className="form-select" value={defaultDate} onChange={e => setDefaultDate(e.target.value)}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>Tgl {d}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1.4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>Mulai Dari</div>
              <input
                type="month"
                className="form-input"
                value={periodStart ? periodStart.substring(0, 7) : ''}
                onChange={e => {
                  const val = e.target.value // format: YYYY-MM
                  if (val) setPeriodStart(`${val}-01`)
                  else setPeriodStart('')
                }}
              />
            </div>
          </div>

          {/* Tabel per bulan */}
          {monthRange.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase' }}>Tanggal Gajian Per Bulan</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {monthRange.map(({ key, bulan, tahun }) => {
                  const val = overrides[key] !== undefined ? overrides[key] : defaultDate
                  const isOverridden = overrides[key] !== undefined
                  return (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: isOverridden ? 'rgba(56,189,248,0.06)' : 'var(--surface2)',
                      borderRadius: 8,
                      border: `1px solid ${isOverridden ? 'rgba(56,189,248,0.2)' : 'var(--border)'}`,
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isOverridden ? 'var(--accent)' : 'var(--text2)' }}>
                        {bulan} {tahun}
                        {isOverridden && <span style={{ fontSize: 10, marginLeft: 6, color: 'var(--accent)' }}>✏️</span>}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <select
                          value={val}
                          onChange={e => setOverrideDate(key, e.target.value)}
                          style={{
                            background: 'var(--surface3)', border: '1px solid var(--border2)',
                            borderRadius: 6, padding: '4px 8px', color: 'var(--text1)',
                            fontSize: 13, fontWeight: 700, outline: 'none',
                          }}
                        >
                          {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>Tgl {d}</option>
                          ))}
                        </select>
                        {isOverridden && (
                          <button
                            onClick={() => setOverrides(prev => { const n = {...prev}; delete n[key]; return n })}
                            style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}
                            title="Reset ke default"
                          >✕</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <button className="btn btn-primary btn-full" onClick={handleSavePeriod} disabled={savingPeriod}>
            {savingPeriod ? 'Menyimpan...' : '💾 Simpan Semua Periode'}
          </button>
        </div>

        {/* Keamanan */}
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
            {[['Versi','2.0.0'],['Platform','Next.js + Supabase'],['Database','PostgreSQL'],['Input','Telegram Bot + n8n']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{k}</span><span style={{ color: 'var(--text1)', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Install PWA */}
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
        <button className="btn btn-danger btn-full" onClick={() => setShowLogout(true)} style={{ height: 48, fontSize: 15 }}>
          🚪 Keluar
        </button>

        {/* Logout Modal */}
        {showLogout && (
          <div className="modal-overlay" onClick={() => setShowLogout(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header"><span className="modal-title">Konfirmasi Logout</span></div>
              <div className="modal-body">
                <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20 }}>Yakin mau keluar dari Arvifund?</p>
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
