'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { useToast } from '../../hooks/useToast'
import { supabase } from '../../lib/supabase'
import { BULAN_ORDER } from '../../lib/utils'
import AppSelect from '../../components/ui/AppSelect'

export default function SettingsPage() {
  const router = useRouter()
  const { user, profile, loadData, overrides: currentOverrides } = useData()
  const { showToast, ToastContainer } = useToast()

  const [savingPeriod, setSavingPeriod]     = useState(false)
  const [savingOverride, setSavingOverride] = useState(false)
  const [showLogout, setShowLogout]         = useState(false)
  const [periodDate, setPeriodDate]         = useState(profile?.pay_period_date || 25)

  // Override state
  const now = new Date()
  const [ovBulan, setOvBulan] = useState(BULAN_ORDER[now.getMonth()])
  const [ovTahun, setOvTahun] = useState(now.getFullYear())
  const [ovTgl, setOvTgl]     = useState('')

  const tahunList = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  // ── Simpan default tanggal gajian ──
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

  // ── Simpan override per bulan ──
  async function handleSaveOverride() {
    const tgl = parseInt(ovTgl)
    if (!tgl || tgl < 1 || tgl > 28) {
      showToast('❌ Tanggal harus 1–28', 'error')
      return
    }
    setSavingOverride(true)
    try {
      const key = `${ovBulan}-${ovTahun}`
      const newOverrides = { ...currentOverrides, [key]: tgl }
      const { error } = await supabase
        .from('profiles')
        .update({ pay_period_overrides: newOverrides })
        .eq('id', user?.id)
      if (error) throw error
      showToast(`✅ Override ${ovBulan} ${ovTahun} → tgl ${tgl} disimpan`)
      setOvTgl('')
      await loadData()
    } catch (err) {
      showToast('❌ Gagal: ' + err.message, 'error')
    } finally {
      setSavingOverride(false)
    }
  }

  // ── Hapus override ──
  async function handleDeleteOverride(key) {
    try {
      const newOverrides = { ...currentOverrides }
      delete newOverrides[key]
      const { error } = await supabase
        .from('profiles')
        .update({ pay_period_overrides: newOverrides })
        .eq('id', user?.id)
      if (error) throw error
      showToast(`✅ Override ${key} dihapus`)
      await loadData()
    } catch (err) {
      showToast('❌ Gagal: ' + err.message, 'error')
    }
  }

  // ── Reset Password ──
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

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const overrideEntries = Object.entries(currentOverrides || {}).sort()

  // Options untuk tanggal gajian (1-28)
  const periodDateOptions = Array.from({ length: 28 }, (_, i) => ({
    value: String(i + 1),
    label: `Tanggal ${i + 1}`,
  }))

  return (
    <>
      <AppHeader title="Settings" />
      <div className="page-container">

        {/* Profile */}
        <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52,
            background: 'linear-gradient(135deg, #1F4E79, #38bdf8)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: 'white', flexShrink: 0,
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

        {/* Tanggal Gajian Default */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>
            📅 Tanggal Gajian Default
          </div>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
            Periode aktif: tgl <strong style={{ color: 'var(--accent)' }}>{periodDate}</strong> bulan ini — tgl <strong style={{ color: 'var(--accent)' }}>{periodDate - 1}</strong> bulan depan
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <AppSelect
              value={String(periodDate)}
              onChange={e => setPeriodDate(e.target.value)}
              options={periodDateOptions}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={handleSavePeriod} disabled={savingPeriod} style={{ flexShrink: 0 }}>
              {savingPeriod ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>

        {/* Override Per Bulan */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 4 }}>
            ⚡ Override Tanggal Gajian per Bulan
          </div>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.6 }}>
            Gunakan ini kalau tgl {profile?.pay_period_date || 25} jatuh di hari libur/akhir pekan dan gajian dimajukan. Override hanya berlaku untuk bulan yang dipilih.
          </p>

          {/* Form tambah override */}
          <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Tambah / Edit Override
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <AppSelect
                value={ovBulan}
                onChange={e => setOvBulan(e.target.value)}
                options={BULAN_ORDER}
                style={{ flex: 2 }}
              />
              <AppSelect
                value={String(ovTahun)}
                onChange={e => setOvTahun(parseInt(e.target.value))}
                options={tahunList.map(y => ({ value: String(y), label: String(y) }))}
                style={{ flex: 1 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-input"
                type="number"
                min="1" max="28"
                placeholder={`Override tanggal (default: ${profile?.pay_period_date || 25})`}
                value={ovTgl}
                onChange={e => setOvTgl(e.target.value)}
                inputMode="numeric"
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={handleSaveOverride} disabled={savingOverride || !ovTgl} style={{ flexShrink: 0 }}>
                {savingOverride ? '...' : 'Simpan'}
              </button>
            </div>
            {ovBulan && ovTahun && currentOverrides?.[`${ovBulan}-${ovTahun}`] && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--yellow)' }}>
                ★ Override aktif untuk {ovBulan} {ovTahun}: tgl {currentOverrides[`${ovBulan}-${ovTahun}`]}
              </div>
            )}
          </div>

          {/* Daftar override aktif */}
          {overrideEntries.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>
              Belum ada override — semua periode pakai tanggal default (tgl {profile?.pay_period_date || 25}).
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
                Override Aktif ({overrideEntries.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {overrideEntries.map(([key, tgl]) => (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                  }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{key.replace('-', ' ')}</span>
                      <span style={{ margin: '0 6px', color: 'var(--text3)' }}>→</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Tgl {tgl}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>(default: tgl {profile?.pay_period_date || 25})</span>
                    </div>
                    <button
                      onClick={() => handleDeleteOverride(key)}
                      className="btn btn-danger btn-sm"
                    >
                      ✕ Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reset Password */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>🔐 Keamanan</div>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
            Link reset password akan dikirim ke {user?.email}
          </p>
          <button className="btn btn-ghost btn-full" onClick={handleResetPassword}>
            Kirim Link Reset Password
          </button>
        </div>

        {/* Tentang */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>ℹ️ Tentang Arvifund</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text3)' }}>
            {[['Versi', '2.0.0'], ['Platform', 'Next.js + Supabase'], ['Database', 'PostgreSQL'], ['Input', 'Telegram Bot + n8n']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{k}</span>
                <span style={{ color: 'var(--text1)', fontWeight: 600 }}>{v}</span>
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

        {/* Logout Confirm */}
        {showLogout && (
          <div className="modal-overlay" onClick={() => setShowLogout(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <span className="modal-title">Konfirmasi Logout</span>
              </div>
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
