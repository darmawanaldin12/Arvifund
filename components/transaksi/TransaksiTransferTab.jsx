'use client'
import Link from 'next/link'
import { ArrowLeftRight, ArrowUpRight } from 'lucide-react'
import { fmt, fmtTanggalShort } from '../../lib/utils'

export default function TransaksiTransferTab({ rows, getUserName }) {
  if (rows.length === 0) {
    return (
      <div>
        <div className="card"><div className="empty-state"><div className="emoji">🔁</div><p>Belum ada transfer antar rekening</p></div></div>
        <Link href="/wallet" className="trx-cta no-underline">
          Kelola transfer &amp; rekening di Wallet <ArrowUpRight size={13} />
        </Link>
      </div>
    )
  }
  return (
    <div>
      {rows.map(r => (
        <div key={r.id} className="trx-row">
          <div className="trx-row-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}><ArrowLeftRight size={17} /></div>
          <div className="trx-row-info">
            <div className="trx-row-label">{getUserName(r.from_user)} → {getUserName(r.to_user)}</div>
            <div className="trx-row-sub">
              <span>{fmtTanggalShort(r.tanggal)}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{r.from_bank || '-'} → {r.to_bank || '-'}</span>
              {r.catatan && <><span style={{ opacity: 0.4 }}>·</span><span>{r.catatan}</span></>}
            </div>
          </div>
          <div className="trx-row-amount" style={{ color: 'var(--accent)' }}>{fmt(r.jumlah)}</div>
        </div>
      ))}
      <Link href="/wallet" className="trx-cta no-underline">
        Kelola transfer &amp; rekening di Wallet <ArrowUpRight size={13} />
      </Link>
    </div>
  )
}
