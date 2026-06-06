'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '../../lib/utils-cn'
import { useData } from '../DataContext'
import { insertTransfer } from '../../lib/data'
import {
  ArrowLeftRight, ChevronRight, X, FileInput,
} from 'lucide-react'

const BANK_BY_USER = {
  '9f5a9e66-a47e-4cf1-bfe6-107da0574a2e': ['BCA', 'Mandiri', 'BRI', 'Cash'],
  '42b635cc-a32d-4b15-95d6-d9afb504a850': ['BCA', 'Mandiri', 'Cash'],
}
const DEFAULT_BANKS = ['BCA', 'Mandiri', 'Cash']

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: '/expenses',
    label: 'Keluar',
    activeColor: 'text-red-400',
    activeBg: 'bg-red-500/10',
    activeDot: 'bg-red-400',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12l7 7 7-7"/>
      </svg>
    ),
  },
  null, // FAB slot
  {
    href: '/wallet',
    label: 'Wallet',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 10h2"/><path d="M2 10h20"/>
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  },
]

// ── Transfer Modal ─────────────────────────────────────────────────────────
function TransferModal({ onClose }) {
  const { profiles, user, loadData } = useData()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const [form, setForm] = useState({
    tanggal: today, from_user: user?.id || '', to_user: '',
    from_bank: user?.id ? (BANK_BY_USER[user.id]?.[0] || '') : '',
    to_bank: '', jumlah: '', catatan: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const fromBanks = form.from_user ? (BANK_BY_USER[form.from_user] || DEFAULT_BANKS) : DEFAULT_BANKS
  const toBanks   = form.to_user   ? (BANK_BY_USER[form.to_user]   || DEFAULT_BANKS) : DEFAULT_BANKS
  const handleFromUser = uid => { const b = BANK_BY_USER[uid] || DEFAULT_BANKS; setForm(f => ({ ...f, from_user: uid, from_bank: b[0] || '' })) }
  const handleToUser   = uid => { const b = BANK_BY_USER[uid] || DEFAULT_BANKS; setForm(f => ({ ...f, to_user:   uid, to_bank:   b[0] || '' })) }
  const isInternal = form.from_user === form.to_user && form.from_user !== ''
  const fromName   = profiles?.find(p => p.id === form.from_user)?.username || ''
  const toName     = profiles?.find(p => p.id === form.to_user)?.username   || ''

  async function handleSave() {
    setError('')
    if (!form.from_user) return setError('Pilih pengirim')
    if (!form.to_user)   return setError('Pilih penerima')
    if (!form.from_bank) return setError('Pilih rekening asal')
    if (!form.to_bank)   return setError('Pilih rekening tujuan')
    if (isInternal && form.from_bank === form.to_bank) return setError('Rekening asal dan tujuan tidak boleh sama')
    if (!form.jumlah || isNaN(parseFloat(form.jumlah)) || parseFloat(form.jumlah) <= 0) return setError('Jumlah harus lebih dari 0')
    setSaving(true)
    try {
      await insertTransfer({ tanggal: form.tanggal, from_user: form.from_user, to_user: form.to_user, from_bank: form.from_bank, to_bank: form.to_bank, jumlah: parseFloat(form.jumlah), catatan: form.catatan || null }, user?.id)
      await loadData()
      onClose()
    } catch (err) { setError('Gagal simpan: ' + err.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 560, maxHeight: '92dvh', overflowY: 'auto', padding: '20px 20px', paddingBottom: 'calc(max(env(safe-area-inset-bottom), 16px) + 8px)', animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowLeftRight size={20} color="var(--accent)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>Catat Transfer</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{isInternal ? 'Pindah rekening sendiri' : 'Transfer antar pengguna'}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><X size={20} /></button>
        </div>

        <div className="form-group">
          <label className="form-label">Tanggal</label>
          <input className="form-input" type="date" value={form.tanggal} onChange={e => setF('tanggal', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end', marginBottom: 14 }}>
          <div>
            <label className="form-label">Dari</label>
            <select className="form-select" value={form.from_user} onChange={e => handleFromUser(e.target.value)}>
              <option value="">Pilih pengirim</option>
              {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
            </select>
          </div>
          <div style={{ paddingBottom: 10, color: 'var(--text3)' }}><ArrowLeftRight size={16} /></div>
          <div>
            <label className="form-label">Ke</label>
            <select className="form-select" value={form.to_user} onChange={e => handleToUser(e.target.value)}>
              <option value="">Pilih penerima</option>
              {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end', marginBottom: 14 }}>
          <div>
            <label className="form-label">Rekening asal</label>
            <select className="form-select" value={form.from_bank} onChange={e => setF('from_bank', e.target.value)} disabled={!form.from_user}>
              {!form.from_user && <option value="">Pilih pengirim dulu</option>}
              {fromBanks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div style={{ paddingBottom: 10, color: 'var(--text3)' }}><ChevronRight size={16} /></div>
          <div>
            <label className="form-label">Rekening tujuan</label>
            <select className="form-select" value={form.to_bank} onChange={e => setF('to_bank', e.target.value)} disabled={!form.to_user}>
              {!form.to_user && <option value="">Pilih penerima dulu</option>}
              {toBanks.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {form.from_user && form.to_user && form.from_bank && form.to_bank && (
          <div style={{ padding: '8px 12px', marginBottom: 14, background: isInternal ? 'rgba(245,158,11,0.08)' : 'rgba(56,189,248,0.08)', border: `1px solid ${isInternal ? 'rgba(245,158,11,0.3)' : 'rgba(56,189,248,0.3)'}`, borderRadius: 8, fontSize: 12, color: 'var(--text2)' }}>
            {isInternal ? `Pindah rekening ${fromName}: ${form.from_bank} → ${form.to_bank}` : `${fromName} (${form.from_bank}) → ${toName} (${form.to_bank})`}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Jumlah</label>
          <input className="form-input" type="number" inputMode="numeric" placeholder="0" value={form.jumlah} onChange={e => setF('jumlah', e.target.value)} min="0" />
        </div>
        <div className="form-group">
          <label className="form-label">Catatan (opsional)</label>
          <input className="form-input" type="text" placeholder="Contoh: buat belanja bulan ini" value={form.catatan} onChange={e => setF('catatan', e.target.value)} />
        </div>

        {error && <div style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--red-bg)', borderRadius: 8, color: 'var(--red)', fontSize: 13, fontWeight: 600 }}>{error}</div>}

        <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-full"
          style={{ height: 48, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <ArrowLeftRight size={18} />
          {saving ? 'Menyimpan...' : 'Simpan Transfer'}
        </button>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  )
}

// ── Action Sheet ───────────────────────────────────────────────────────────
function ActionSheet({ onClose, onTransfer }) {
  const router = useRouter()
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 560, padding: '16px 16px', paddingBottom: 'calc(max(env(safe-area-inset-bottom), 16px) + 8px)', animation: 'slideUp 0.25s cubic-bezier(0.32,0.72,0,1)' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 16px' }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingLeft: 4 }}>Pilih aksi</div>
        <button onClick={() => { onClose(); router.push('/input') }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10, WebkitTapHighlightColor: 'transparent' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileInput size={20} color="var(--accent)" />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>Input Transaksi</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>Catat pengeluaran, pemasukan, atau tarik tunai</div>
          </div>
          <ChevronRight size={16} color="var(--text3)" />
        </button>
        <button onClick={() => { onClose(); onTransfer() }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: 'rgba(56,189,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeftRight size={20} color="var(--accent)" />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>Catat Transfer</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>Transfer antar rekening atau antar pengguna</div>
          </div>
          <ChevronRight size={16} color="var(--text3)" />
        </button>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  )
}

// ── Main BottomNav ─────────────────────────────────────────────────────────
export default function BottomNav() {
  const pathname = usePathname()
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [showTransfer, setShowTransfer]       = useState(false)

  return (
    <>
      {showActionSheet && (
        <ActionSheet onClose={() => setShowActionSheet(false)}
          onTransfer={() => { setShowActionSheet(false); setShowTransfer(true) }} />
      )}
      {showTransfer && <TransferModal onClose={() => setShowTransfer(false)} />}

      <nav className={cn('fixed bottom-0 left-0 right-0 z-50 md:hidden', 'bg-[var(--surface)] border-t border-[var(--border)]', 'backdrop-blur-xl', 'pb-[env(safe-area-inset-bottom)]')}>
        <div className="flex items-stretch justify-around h-[60px] px-2">
          {NAV_ITEMS.map((item, idx) => {
            if (item === null) {
              return (
                <div key="fab" className="flex-1 flex items-center justify-center">
                  <button onClick={() => setShowActionSheet(true)} aria-label="Tambah"
                    className={cn('w-[50px] h-[50px] rounded-2xl mb-2.5', 'flex items-center justify-center', 'transition-all duration-150 active:scale-90', 'bg-[var(--accent)] shadow-[0_4px_16px_color-mix(in_srgb,var(--accent)_45%,transparent)]', 'border-0 cursor-pointer')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transition: 'transform 0.25s', transform: showActionSheet ? 'rotate(45deg)' : 'rotate(0deg)' }}>
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                </div>
              )
            }

            // /wallet aktif juga saat di /record (redirect)
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href) || (item.href === '/wallet' && pathname.startsWith('/record'))

            const activeColor = item.activeColor || 'text-[var(--accent)]'
            const activeBg    = item.activeBg    || 'bg-[var(--accent)]/10'
            const activeDot   = item.activeDot   || 'bg-[var(--accent)]'

            return (
              <Link key={item.href} href={item.href}
                className={cn('flex-1 flex flex-col items-center justify-center gap-[3px]', 'relative px-1 py-1.5 rounded-xl', 'transition-colors duration-150', 'no-underline', isActive ? activeColor : 'text-[var(--text3)] hover:text-[var(--text1)]')}>
                <span className={cn('absolute top-1 left-1/2 -translate-x-1/2', 'w-1 h-1 rounded-full transition-opacity duration-150', activeDot, isActive ? 'opacity-100' : 'opacity-0')} />
                <span className={cn('flex items-center justify-center w-10 h-7 rounded-lg', 'transition-all duration-150 active:scale-90', isActive && activeBg)}>
                  {item.icon}
                </span>
                <span className="text-[10px] font-medium leading-none tracking-[0.01em] whitespace-nowrap">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
