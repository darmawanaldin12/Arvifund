'use client'
import { useEffect } from 'react'
import { setTvOverride } from '../../lib/tv'

// Kalau halaman /tv error, tampilkan pesannya di layar (bukan layar hitam)
// dan sediakan jalan keluar ke tampilan HP yang bisa dipilih dengan remote.
export default function TvError({ error, reset }) {
  useEffect(() => { console.error('TV error:', error) }, [error])

  const msg = String((error && error.message) || error || 'Terjadi kesalahan')
  const btn = {
    padding: '14px 28px', borderRadius: 999, border: '3px solid transparent',
    background: '#3b82f6', color: '#fff', fontSize: 22, fontWeight: 800,
    fontFamily: 'inherit', cursor: 'pointer',
  }
  const focusOn = e => { e.currentTarget.style.borderColor = '#fff' }
  const focusOff = e => { e.currentTarget.style.borderColor = 'transparent' }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 40, background: '#0a1020', color: '#f8fafc',
      fontFamily: 'system-ui, sans-serif', textAlign: 'center',
    }}>
      <h1 style={{ fontSize: 36, margin: '0 0 16px' }}>Tampilan TV gagal dimuat</h1>
      <p style={{ fontSize: 22, color: '#cbd5e1', margin: '0 0 8px', maxWidth: 900, wordBreak: 'break-word' }}>{msg}</p>
      {error && error.digest && <p style={{ fontSize: 16, color: '#8fa0bd', margin: '0 0 24px' }}>kode: {error.digest}</p>}
      <div style={{ display: 'flex', marginTop: 24 }}>
        <button autoFocus style={{ ...btn, marginRight: 16 }} onFocus={focusOn} onBlur={focusOff} onClick={() => reset()}>Coba lagi</button>
        <button
          style={{ ...btn, background: '#24304d' }} onFocus={focusOn} onBlur={focusOff}
          onClick={() => { setTvOverride(false); window.location.href = '/dashboard?tv=0' }}
        >Pakai tampilan HP</button>
      </div>
    </div>
  )
}
