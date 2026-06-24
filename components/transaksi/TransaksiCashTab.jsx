'use client'
import Link from 'next/link'
import { Landmark, Trash2, Loader2, ArrowUpRight } from 'lucide-react'
import { fmt, fmtTanggalShort } from '../../lib/utils'

export default function TransaksiCashTab({ rows, onEdit, onDelete, deletingId, getUserName }) {
  if (rows.length === 0) {
    return (
      <div>
        <div className="card"><div className="empty-state"><div className="emoji">🏧</div><p>Belum ada catatan tarik tunai</p></div></div>
        <Link href="/cashrecord" className="trx-cta no-underline">
          Kelola lengkap tarik tunai &amp; saldo cash <ArrowUpRight size={13} />
        </Link>
      </div>
    )
  }
  return (
    <div>
      {rows.map(r => (
        <div key={r.id} className="trx-row is-tappable" onClick={() => onEdit(r)} role="button" tabIndex={0}>
          <div className="trx-row-icon" style={{ background: 'var(--yellow-bg)', color: 'var(--yellow)' }}><Landmark size={17} /></div>
          <div className="trx-row-info">
            <div className="trx-row-label">{r.transaksi || 'Tarik Tunai'}</div>
            <div className="trx-row-sub">
              <span>{fmtTanggalShort(r.tanggal)}</span>
              {r.bank && <><span style={{ opacity: 0.4 }}>·</span><span>{r.bank}</span></>}
              {r.alamat && <><span style={{ opacity: 0.4 }}>·</span><span>{r.alamat}</span></>}
              <span className={`user-chip ${getUserName(r.user_id)?.toLowerCase()}`}>{getUserName(r.user_id)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="trx-row-amount" style={{ color: 'var(--yellow)' }}>{fmt(r.nilai)}</div>
            <button
              className="edit-btn"
              onClick={e => { e.stopPropagation(); onDelete(r.id) }}
              disabled={deletingId === r.id}
              aria-label="Hapus catatan tarik tunai"
              title="Hapus"
              style={{ color: 'var(--red)', opacity: deletingId === r.id ? 0.5 : 1 }}
            >
              {deletingId === r.id ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Trash2 size={13} />}
            </button>
          </div>
        </div>
      ))}
      <Link href="/cashrecord" className="trx-cta no-underline">
        Kelola lengkap tarik tunai &amp; saldo cash <ArrowUpRight size={13} />
      </Link>
    </div>
  )
}
