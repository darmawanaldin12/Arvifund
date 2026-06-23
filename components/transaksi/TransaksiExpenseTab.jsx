'use client'
import { Pencil, Trash2, AlertTriangle, Clock, ShieldCheck } from 'lucide-react'
import { fmt, fmtTanggalShort } from '../../lib/utils'
import KategoriIcon from '../ui/KategoriIcon'

export default function TransaksiExpenseTab({ rows, sortKey, sortDir, onSort, onEdit, onDelete, deletingId, getUserName }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th onClick={() => onSort('tanggal')} style={{ cursor: 'pointer' }}>Tanggal {sortKey === 'tanggal' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
              <th>Toko / Uraian</th>
              <th>Kategori</th>
              <th>Metode</th>
              <th>Bank</th>
              <th>User</th>
              <th onClick={() => onSort('nilai')} style={{ cursor: 'pointer', textAlign: 'right' }}>Nilai {sortKey === 'nilai' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8}><div className="empty-state"><div className="emoji">🔍</div><p>Tidak ada data</p></div></td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className={r._isAnom ? 'trx-row-anomali' : ''}>
                <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  <div className={`trx-late-chip${r._telat ? ' is-late' : ''}`}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: r._telat ? 'var(--yellow)' : 'var(--text2)' }}>{fmtTanggalShort(r.tanggal)}</div>
                    {r._telat ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--yellow)', opacity: 0.85 }}>
                        <Clock size={9} /> dicatat {r._jam} WIB
                      </div>
                    ) : r._jam ? (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{r._jam} WIB</div>
                    ) : null}
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {r.toko || '—'}
                    {r._isAnom && <AlertTriangle size={12} style={{ color: 'var(--orange)', flexShrink: 0 }} />}
                    {r.edited_at && <Pencil size={10} style={{ color: 'var(--yellow)', flexShrink: 0 }} />}
                  </div>
                  {r.uraian && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{r.uraian}</div>}
                </td>
                <td>
                  <span className="badge" style={{ background: `${r._color}22`, color: r._color, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <KategoriIcon kategori={r.kategori} size={12} color={r._color} />{r.kategori}
                  </span>
                </td>
                <td><span className="badge badge-gray">{r.transaksi || '—'}</span></td>
                <td><span className="badge badge-blue">{r.bank || '—'}</span></td>
                <td><span className={`user-chip ${getUserName(r.user_id)?.toLowerCase()}`}>{getUserName(r.user_id)}</span></td>
                <td className="amount" style={{ color: r._isAnom ? 'var(--orange)' : 'var(--red)' }}>{fmt(r.nilai)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button className="edit-btn" onClick={() => onEdit(r)} aria-label="Edit transaksi" title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button
                      className="edit-btn"
                      onClick={() => onDelete(r.id)}
                      disabled={deletingId === r.id}
                      aria-label="Hapus transaksi (perlu biometrik)"
                      title="Hapus (perlu biometrik)"
                      style={{ color: deletingId === r.id ? 'var(--text3)' : 'var(--red)', opacity: deletingId === r.id ? 0.5 : 1 }}
                    >
                      {deletingId === r.id ? <ShieldCheck size={13} style={{ animation: 'pulse 0.8s ease-in-out infinite' }} /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
