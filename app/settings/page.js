'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { useToast } from '../../hooks/useToast'
import { supabase } from '../../lib/supabase'
import { BULAN_ORDER } from '../../lib/utils'
import {
  isBiometricSupported,
  isBiometricRegistered,
  registerBiometric,
  removeBiometricCred,
  getBiometricCred,
} from '../../lib/biometric'
import {
  ShieldCheck, Fingerprint, CalendarDays, Zap, KeyRound,
  Info, Smartphone, LogOut, Trash2, CheckCircle2, X,
} from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const { user, profile, loadData, overrides: currentOverrides } = useData()
  const { showToast, ToastContainer } = useToast()

  const [savingPeriod, setSavingPeriod]     = useState(false)
  const [savingOverride, setSavingOverride] = useState(false)
  const [showLogout, setShowLogout]         = useState(false)
  const [periodDate, setPeriodDate]         = useState(profile?.pay_period_date || 25)

  const now = new Date()
  const [ovBulan, setOvBulan] = useState(BULAN_ORDER[now.getMonth()])
  const [ovTahun, setOvTahun] = useState(now.getFullYear())
  const [ovTgl, setOvTgl]     = useState('')
  const tahunList = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  const [bioSupported, setBioSupported]   = useState(false)
  const [bioRegistered, setBioRegistered] = useState(false)
  const [bioLoading, setBioLoading]       = useState(false)
  const [bioCred, setBioCred]             = useState(null)

  useEffect(() => {
    async function checkBio() {
      const supported = await isBiometricSupported()
      setBioSupported(supported)
      if (supported) {
        setBioRegistered(isBiometricRegistered())
        setBioCred(getBiometricCred())
      }
    }
    checkBio()
  }, [])

  async function handleSavePeriod() {
    setSavingPeriod(true)
    try {
      const { error } = await supabase.from('profiles').update({ pay_period_date: parseInt(periodDate) }).eq('id', user?.id)
      if (error) throw error
      showToast('✅ Tanggal gajian disimpan')
      await loadData()
    } catch (err) {
      showToast('❌ Gagal: ' + err.message, 'error')
    } finally {
      setSavingPeriod(false)
    }
  }

  async function handleSaveOverride() {
    const tgl = parseInt(ovTgl)
    if (!tgl || tgl < 1 || tgl > 28) { showToast('❌ Tanggal harus 1–28', 'error'); return }
    setSavingOverride(true)
    try {
      const key = `${ovBulan}-${ovTahun}`
      const newOverrides = { ...currentOverrides, [key]: tgl }
      const { error } = await supabase.from('profiles').update({ pay_period_overrides: newOverrides }).eq('id', user?.id)
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

  async function handleDeleteOverride(key) {
    try {
      const newOverrides = { ...currentOverrides }
      delete newOverrides[key]
      const { error } = await supabase.from('profiles').update({ pay_period_overrides: newOverrides }).eq('id', user?.id)
      if (error) throw error
      showToast(`✅ Override ${key} dihapus`)
      await loadData()
    } catch (err) {
      showToast('❌ Gagal: ' + err.message, 'error')
    }
  }

  async function handleResetPassword() {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user?.email, { redirectTo: `${window.location.origin}/settings` })
      if (error) throw error
      showToast('✅ Link reset dikirim ke email')
    } catch (err) {
      showToast('❌ Gagal: ' + err.message, 'error')
    }
  }

  async function handleRegisterBio() {
    setBioLoading(true)
    try {
      await registerBiometric(user?.id, profile?.username || user?.email?.split('@')[0] || 'User')
      setBioRegistered(true)
      setBioCred(getBiometricCred())
      showToast('✅ Biometrik berhasil diaktifkan')
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        showToast('❌ Dibatalkan oleh pengguna', 'error')
      } else {
        showToast('❌ Gagal: ' + err.message, 'error')
      }
    } finally {
      setBioLoading(false)
    }
  }

  function handleRemoveBio() {
    removeBiometricCred()
    setBioRegistered(false)
    setBioCred(null)
    showToast('✅ Data biometrik dihapus dari device ini')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const overrideEntries = Object.entries(currentOverrides || {}).sort()

  return (
    <>
      <AppHeader title="Settings" />
      <div className="page-container">

        {/* Profile */}
        <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #1F4E79, #38bdf8)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'white', flexShrink: 0 }}>
            {profile?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{profile?.username || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{user?.email}</div>
            {profile?.chat_id && <div style={{ fontSize: 12, color: 'var(--text3)' }}>Telegram ID: {profile.chat_id}</div>}
          </div>
        </div>

        {/* Biometric */}
        {bioSupported && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>
              <Fingerprint size={16} color="var(--accent)" />
              Login Biometrik
            </div>

            {bioRegistered && bioCred ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--green-bg)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.25)', marginBottom: 14 }}>
                  <CheckCircle2 size={22} color="var(--green)" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>Biometrik Aktif</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      Terdaftar: {new Date(bioCred.registeredAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.6 }}>
                  Login berikutnya cukup tap tombol biometrik di halaman login. Data hanya tersimpan di device ini.
                </p>
                <button className="btn btn-danger btn-full" onClick={handleRemoveBio} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Trash2 size={14} /> Hapus Data Biometrik dari Device Ini
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.6 }}>
                  Aktifkan login dengan Face ID, Touch ID, atau sidik jari untuk masuk lebih cepat tanpa ketik password.
                </p>
                <button className="btn btn-primary btn-full" onClick={handleRegisterBio} disabled={bioLoading} style={{ height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <ShieldCheck size={16} />
                  {bioLoading ? 'Memproses...' : 'Aktifkan Login Biometrik'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Tanggal Gajian Default */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>
            <CalendarDays size={16} color="var(--accent)" />
            Tanggal Gajian Default
          </div>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
            Periode aktif: tgl <strong style={{ color: 'var(--accent)' }}>{periodDate}</strong> bulan ini — tgl <strong style={{ color: 'var(--accent)' }}>{periodDate - 1}</strong> bulan depan
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="form-select" value={periodDate} onChange={e => setPeriodDate(e.target.value)} style={{ flex: 1 }}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>Tanggal {d}</option>)}
            </select>
            <button className="btn btn-primary" onClick={handleSavePeriod} disabled={savingPeriod} style={{ flexShrink: 0 }}>
              {savingPeriod ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>

        {/* Override Per Bulan */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 4 }}>
            <Zap size={16} color="var(--yellow)" />
            Override Tanggal Gajian per Bulan
          </div>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.6 }}>
            Gunakan ini kalau tgl {profile?.pay_period_date || 25} jatuh di hari libur/akhir pekan dan gajian dimajukan.
          </p>
          <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Tambah / Edit Override</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <select className="form-select" value={ovBulan} onChange={e => setOvBulan(e.target.value)} style={{ flex: 2 }}>
                {BULAN_ORDER.map(b => <option key={b}>{b}</option>)}
              </select>
              <select className="form-select" value={ovTahun} onChange={e => setOvTahun(parseInt(e.target.value))} style={{ flex: 1 }}>
                {tahunList.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" type="number" min="1" max="28"
                placeholder={`Override tanggal (default: ${profile?.pay_period_date || 25})`}
                value={ovTgl} onChange={e => setOvTgl(e.target.value)} inputMode="numeric" style={{ flex: 1 }} />
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
          {overrideEntries.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>
              Belum ada override — semua periode pakai tanggal default (tgl {profile?.pay_period_date || 25}).
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Override Aktif ({overrideEntries.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {overrideEntries.map(([key, tgl]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{key.replace('-', ' ')}</span>
                      <span style={{ margin: '0 6px', color: 'var(--text3)' }}>→</span>
                      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Tgl {tgl}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>(default: tgl {profile?.pay_period_date || 25})</span>
                    </div>
                    <button onClick={() => handleDeleteOverride(key)} className="btn btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <X size={12} /> Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Keamanan */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>
            <KeyRound size={16} color="var(--accent)" />
            Keamanan
          </div>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>Link reset password akan dikirim ke {user?.email}</p>
          <button className="btn btn-ghost btn-full" onClick={handleResetPassword}>Kirim Link Reset Password</button>
        </div>

        {/* Tentang */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>
            <Info size={16} color="var(--accent)" />
            Tentang Arvifund
          </div>
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
            <Smartphone size={24} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Install ke Homescreen</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                <strong>Android:</strong> Menu (⋮) → Add to Home Screen<br />
                <strong>iPhone:</strong> Share (⬆) → Add to Home Screen
              </div>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          className="btn btn-danger btn-full"
          onClick={() => setShowLogout(true)}
          style={{ height: 48, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <LogOut size={18} /> Keluar
        </button>

        {/* Logout Modal */}
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
                  <button className="btn btn-danger" onClick={handleLogout} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <LogOut size={14} /> Ya, Keluar
                  </button>
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
