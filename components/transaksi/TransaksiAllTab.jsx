'use client'
import { fmt, fmtTanggalShort } from '../../lib/utils'
import { TIPE_CONFIG } from '../../lib/transaksiHelpers'

export default function TransaksiAllTab({ rows, onRowClick }) {
  if (rows.length === 0) {
    return <div className="card"><div className="empty-state"><div className="emoji">🔍</div><p>Tidak ada transaksi ditemukan</p></div></div>
  }
  return (
    <div>
      {rows.map(row => {
        const cfg = TIPE_CONFIG[row.tipe]
        const Ic  = cfg.Icon
        const tappable = row.tipe !== 'transfer'
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
              </div>
            </div>
            <div className="trx-row-amount" style={{ color: cfg.color }}>
              {row.tipe === 'income' ? '+' : row.tipe === 'expense' ? '−' : ''}{fmt(row.amount)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
