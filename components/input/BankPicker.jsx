'use client'
import { Check, Banknote } from 'lucide-react'

// Logo resmi per bank (file di /public/icons/banks). Dompet tanpa logo (Cash) memakai ikon.
const LOGO = {
  BCA:     '/icons/banks/bca.svg',
  Mandiri: '/icons/banks/mandiri.svg',
}

/* Pelat logo: latar putih supaya logo berwarna tetap terbaca di mode gelap */
export function BankMark({ name, width = '100%', height = 40 }) {
  const base = {
    width, height, borderRadius: 10, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
  if (LOGO[name]) {
    return (
      <div style={{ ...base, background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
        <img src={LOGO[name]} alt={name} draggable={false}
          style={{ maxWidth: '76%', maxHeight: '58%', objectFit: 'contain', display: 'block' }} />
      </div>
    )
  }
  if (name === 'Cash') {
    return <div style={{ ...base, background: '#16a34a' }}><Banknote size={20} color="#fff" aria-hidden="true" /></div>
  }
  return <div style={{ ...base, background: 'var(--accent)', color: '#fff', fontWeight: 800, fontSize: 15 }}>{(name || '?')[0].toUpperCase()}</div>
}

/* Pilihan bank / dompet berupa kartu berlogo (menggantikan dropdown biasa) */
export default function BankPicker({ options, value, onChange, labelledBy }) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy}
      style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(options.length, 3)}, 1fr)`, gap: 10 }}>
      {options.map(name => {
        const selected = value === name
        return (
          <button
            key={name} type="button" role="radio" aria-checked={selected}
            onClick={() => onChange(name)} className="tappable"
            style={{
              position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8,
              padding: 10, minHeight: 84, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
              border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
              background: selected ? 'var(--accent-light)' : 'var(--surface2)',
              color: 'var(--text1)', touchAction: 'manipulation',
              // kompensasi lebar border supaya ukuran kartu tidak bergeser saat dipilih
              margin: selected ? 0 : 1,
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <BankMark name={name} />
            <span style={{ fontSize: 12, fontWeight: selected ? 800 : 600, textAlign: 'center', color: selected ? 'var(--accent)' : 'var(--text2)' }}>{name}</span>
            {selected && (
              <span aria-hidden="true" style={{ position: 'absolute', top: -7, right: -7, width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg)' }}>
                <Check size={11} color="#fff" strokeWidth={3.5} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
