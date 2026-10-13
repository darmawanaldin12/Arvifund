'use client'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { fmt } from '../../lib/utils'

/* ── BudgetAlertCard ── kategori yang sudah ≥ 80% budget pada periode acuan ── */
export function BudgetAlertCard({ items, periodLabel }) {
  if (!items || items.length === 0) return null
  const over = items.filter(b => b.pct >= 100).length
  return (
    <div className="bento-12">
      <Link href="/budget" className="no-underline block">
        <div className="dash-card dash-card-link">
          <div className="dash-card-header-row">
            <span className="dash-card-header dash-card-header-danger mb-0">
              <AlertTriangle size={15} /> Budget perlu perhatian
            </span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{periodLabel}</span>
          </div>
          <p className="anomali-summary">
            {over > 0
              ? `${over} kategori sudah melebihi budget${items.length > over ? `, ${items.length - over} hampir habis` : ''}`
              : `${items.length} kategori hampir habis (≥ 80%)`}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {items.map(b => {
              const isOver = b.pct >= 100
              const sisa   = b.alokasi - b.realisasi
              return (
                <div key={b.kategori} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.kategori}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, color: isOver ? 'var(--red)' : 'var(--yellow)' }}>
                    {b.pct}% · {isOver ? `over ${fmt(Math.abs(sisa))}` : `sisa ${fmt(sisa)}`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </Link>
    </div>
  )
}
