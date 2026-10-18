'use client'
import {
  Eye, EyeOff, Wallet, ChevronRight, ChevronDown, Settings2, Banknote,
  ArrowUp, ArrowDown, ArrowLeftRight, Landmark,
} from 'lucide-react'
import BottomSheet from '../input/BottomSheet'
import { fmtFull, fmtTanggalShort } from '../../lib/utils'

export const MASK = 'Rp ••••••'
export const money = (v, hide) => (hide ? MASK : fmtFull(v))

// Logo resmi (file di /public/icons/banks)
const LOGO = { bca: '/icons/banks/bca.svg', mandiri: '/icons/banks/mandiri.svg' }

/* Logo rekening: logo resmi di pelat putih (terbaca di mode gelap), Cash & BRI berupa tile berwarna */
export function BankLogo({ name, size = 52 }) {
  const n = (name || '').toLowerCase()
  const base = {
    width: size, height: size, borderRadius: 14, flexShrink: 0, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
  }
  if (LOGO[n]) {
    return (
      <div style={{ ...base, background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
        <img src={LOGO[n]} alt={name} draggable={false} style={{ width: '78%', maxHeight: '60%', objectFit: 'contain', display: 'block' }} />
      </div>
    )
  }
  if (n === 'cash') {
    return <div style={{ ...base, background: '#16a34a' }}><Banknote size={Math.round(size * 0.5)} color="#fff" /></div>
  }
  if (n === 'bri') {
    return (
      <div style={{ ...base, background: '#0b5fb0', gap: 3 }}>
        <span style={{ color: '#fff', fontWeight: 900, fontSize: Math.round(size * 0.3), letterSpacing: '-0.02em' }}>BRI</span>
        <span style={{ width: Math.round(size * 0.5), height: 3, borderRadius: 2, background: '#f97316' }} />
      </div>
    )
  }
  return <div style={{ ...base, background: 'var(--accent)', color: '#fff', fontWeight: 800, fontSize: Math.round(size * 0.34) }}>{(name || '?')[0].toUpperCase()}</div>
}

/* Kartu pemilik dompet (pilih user) */
export function UserSwitcher({ users, activeId, onChange, accountCount }) {
  const active = users.find(u => u.id === activeId)
  if (!active) return null
  const isAldin = active.username?.toLowerCase().includes('ald')
  const color   = isAldin ? 'var(--accent)' : '#db2777'
  const multi   = users.length > 1
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', minHeight: 64, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, background: `color-mix(in srgb, ${color} 16%, transparent)`, border: `2px solid ${color}`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800 }}>
        {active.username[0].toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{active.username}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{accountCount} rekening aktif</div>
      </div>
      {multi && <ChevronDown size={18} color="var(--text3)" aria-hidden="true" />}
      {multi && (
        <select
          aria-label="Pilih pemilik dompet" value={activeId} onChange={e => onChange(e.target.value)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', fontSize: 16 }}
        >
          {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
        </select>
      )}
    </div>
  )
}

/* Kartu total saldo */
export function BalanceHero({ total, hasBalance, allTotal, hide, onToggle }) {
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 22, padding: '20px 20px 18px', color: '#fff',
      background: 'linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 55%, #000) 100%)',
      boxShadow: '0 12px 28px rgba(10,60,160,0.28)',
    }}>
      <svg viewBox="0 0 300 120" aria-hidden="true" style={{ position: 'absolute', right: 0, bottom: 0, width: '72%', opacity: 0.2, pointerEvents: 'none' }}>
        <path d="M0 100 C60 90 90 40 150 50 C210 60 240 20 300 8 L300 120 L0 120 Z" fill="#fff" />
      </svg>
      <div aria-hidden="true" style={{ position: 'absolute', right: 18, top: 18, width: 58, height: 58, borderRadius: '50%', background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Wallet size={26} color="#fff" />
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, opacity: 0.92 }}>
          Total Saldo
          <button
            type="button" onClick={onToggle}
            aria-label={hide ? 'Tampilkan saldo' : 'Sembunyikan saldo'} aria-pressed={hide}
            style={{ width: 36, height: 36, margin: '-6px 0', borderRadius: 10, border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {hide ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        <div style={{ fontSize: 'clamp(26px, 8vw, 34px)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
          {hasBalance ? money(total, hide) : '—'}
        </div>
        <div style={{ fontSize: 12, marginTop: 10, opacity: 0.88 }}>
          Aset semua anggota <strong>{money(allTotal, hide)}</strong>
        </div>
      </div>
    </div>
  )
}

/* Tombol aksi cepat */
export function QuickActions({ actions }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${actions.length}, 1fr)`, gap: 10 }}>
      {actions.map(a => {
        const I = a.Icon
        return (
          <button
            key={a.label} type="button" onClick={a.onClick} className="tappable"
            style={{ minHeight: 84, borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', color: 'var(--text1)', fontSize: 12, fontWeight: 700 }}
          >
            <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <I size={19} />
            </span>
            {a.label}
          </button>
        )
      })}
    </div>
  )
}

/* Daftar rekening milik satu user */
export function AccountListCard({ items, hide, onOpen, onSetSaldo }) {
  if (items.length === 0) {
    return <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text3)', border: '1px dashed var(--border)', borderRadius: 16 }}>Belum ada rekening untuk user ini</div>
  }
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 18, background: 'var(--surface)', overflow: 'hidden' }}>
      {items.map((acc, i) => {
        const sub = acc.name === 'Cash' ? 'Tunai'
          : acc.needsSetup ? 'Belum ada baseline'
          : `Baseline ${new Date(acc.balance_set_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
        return (
          <div
            key={acc.id} role="button" tabIndex={0} className="tappable"
            onClick={() => onOpen(acc)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(acc) } }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px 12px 14px', minHeight: 76, cursor: 'pointer', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}
          >
            <BankLogo name={acc.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>{acc.name}</div>
              <div style={{ fontSize: 12, color: acc.needsSetup ? 'var(--yellow)' : 'var(--text3)', marginTop: 2 }}>{sub}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, textAlign: 'right', color: acc.needsSetup ? 'var(--yellow)' : acc.saldo < 0 ? 'var(--red)' : 'var(--text1)', fontVariantNumeric: 'tabular-nums' }}>
              {acc.needsSetup ? 'Atur saldo' : money(acc.saldo, hide)}
            </div>
            <button
              type="button" aria-label={`Ubah saldo ${acc.name}`}
              onClick={e => { e.stopPropagation(); onSetSaldo(acc) }}
              style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Settings2 size={17} />
            </button>
            <ChevronRight size={18} color="var(--text3)" aria-hidden="true" style={{ flexShrink: 0, marginLeft: -6 }} />
          </div>
        )
      })}
    </div>
  )
}

const KIND = {
  income:   { color: '#10b981', Icon: ArrowUp },
  expense:  { color: '#f43f5e', Icon: ArrowDown },
  transfer: { color: '#6366f1', Icon: ArrowLeftRight },
  cash:     { color: '#f59e0b', Icon: Landmark },
}

/* Transaksi terakhir (gabungan pengeluaran, pemasukan, tarik tunai, transfer) */
export function RecentCard({ rows, hide }) {
  if (rows.length === 0) {
    return <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text3)', border: '1px dashed var(--border)', borderRadius: 16 }}>Belum ada transaksi</div>
  }
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 18, background: 'var(--surface)', overflow: 'hidden' }}>
      {rows.map((r, i) => {
        const K = KIND[r.kind]
        const I = K.Icon
        const sign  = r.sign || ''
        const color = r.sign === '+' ? 'var(--green)' : r.sign === '−' ? 'var(--red)' : r.kind === 'cash' ? 'var(--yellow)' : 'var(--text1)'
        return (
          <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', minHeight: 64, borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: K.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <I size={18} color="#fff" />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fmtTanggalShort(r.tanggal)}{r.sub ? ` · ${r.sub}` : ''}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color, flexShrink: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {sign}{sign ? ' ' : ''}{money(r.nilai, hide)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* Pilih rekening yang saldonya mau diatur */
export function AccountPickerSheet({ items, hide, onPick, onClose }) {
  return (
    <BottomSheet onBackdropClick={onClose}>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text1)' }}>Atur Saldo</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', margin: '4px 0 14px' }}>Pilih rekening yang saldonya ingin diatur</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(acc => (
          <button
            key={acc.id} type="button" onClick={() => onPick(acc)} className="tappable"
            style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 64, padding: '10px 12px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
          >
            <BankLogo name={acc.name} size={42} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>{acc.name}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: acc.needsSetup ? 'var(--yellow)' : 'var(--text2)' }}>{acc.needsSetup ? 'Belum diatur' : money(acc.saldo, hide)}</span>
            <ChevronRight size={16} color="var(--text3)" />
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}
