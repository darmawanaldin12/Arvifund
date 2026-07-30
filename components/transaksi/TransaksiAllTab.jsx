'use client'
import { Trash2, ShieldCheck } from 'lucide-react'
import { fmt, fmtTanggalShort, METODE_COLOR } from '../../lib/utils'
import { TIPE_CONFIG } from '../../lib/transaksiHelpers'

export default function TransaksiAllTab({ rows, onRowClick, onDelete, deletingId }) {
  if (rows.length === 0) {
    return <div className="card"><div className="empty-state"><div className="emoji">🔍</div><p>Tidak ada transaksi ditemukan</p></div></div>
  }
  return (
    <div>
      {rows.map(row => {
        const cfg = TIPE_CONFIG[row.tipe]
        const Ic  = cfg.Icon
        const tappable  = row.tipe !== 'transfer'
        // Transfer dikelola di halaman Wallet — tidak bisa dihapus dari sini
        const deletable = row.tipe === 'expense' || row.tipe === 'income' || row.tipe === 'cash'
        const metodeColor = METODE_COLOR[row.metode] || '#94a3b8'
        return (
          <div
            key={row.id}
            className={`trx-row${tappable ? ' is-tappable' : ''}`}
            onClick={tappable ? () => onRowClick(row) : undefined}
            role={tappable ? 'button' : undefined}
            tabIndex={tappable ? 0 : undefined}
          >
            <div className="trx-row-icon" style={{ background: cfg.bg, color: cfg.color }}>
              <Ic size={17} />
            </div>
            <div className="trx-row-info">
              <div className="trx-row-label">{row.label}</div>
              <div className="trx-row-sub">
                <span>{fmtTanggalShort(row.tanggal)}</span>
                {row.sub && <><span style={{ opacity: 0.4 }}>·</span><span>{row.sub}</span></>}
                <span style={{ padding: '1px 7px', borderRadius: 99, background: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 10 }}>{cfg.label}</span>
                {row.metode && (
                  <span style={{ padding: '1px 7px', borderRadius: 99, background: `${metodeColor}1A`, color: metodeColor, fontWeight: 700, fontSize: 10, border: `1px solid ${metodeColor}40` }}>{row.metode}</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="trx-row-amount" style={{ color: cfg.color }}>
                {row.tipe === 'income' ? '+' : row.tipe === 'expense' ? '−' : ''}{fmt(row.amount)}
              </div>
              {deletable && (
                <button
                  className="edit-btn"
                  onClick={e => { e.stopPropagation(); onDelete(row) }}
                  disabled={deletingId === row.raw.id}
                  aria-label="Hapus transaksi (perlu biometrik)"
                  title="Hapus (perlu biometrik)"
                  style={{ color: deletingId === row.raw.id ? 'var(--text3)' : 'var(--red)', opacity: deletingId === row.raw.id ? 0.5 : 1 }}
                >
                  {deletingId === row.raw.id ? <ShieldCheck size={13} style={{ animation: 'pulse 0.8s ease-in-out infinite' }} /> : <Trash2 size={13} />}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
