'use client'
import { Pencil } from 'lucide-react'
import { fmt, fmtTanggalShort } from '../../lib/utils'

export default function TransaksiIncomeTab({ rows, sortKey, sortDir, onSort, onEdit, getUserName }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th onClick={() => onSort('tanggal')} style={{ cursor: 'pointer' }}>Tgl {sortKey === 'tanggal' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
              <th>Sumber / Ket.</th>
              <th>Metode</th>
              <th>Bank</th>
              <th>User</th>
              <th onClick={() => onSort('jumlah')} style={{ cursor: 'pointer', textAlign: 'right' }}>Jumlah {sortKey === 'jumlah' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><div className="emoji">💰</div><p>Belum ada data</p></div></td></tr>
            ) : rows.map(r => (
              <tr key={r.id}>
                <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text3)' }}>{fmtTanggalShort(r.tanggal)}</td>
                <td>
                  <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {r.sumber || '—'}
                    {r.edited_at && <Pencil size={10} style={{ color: 'var(--yellow)' }} />}
                  </div>
                  {r.items && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.items}</div>}
                </td>
                <td><span className="badge badge-gray">{r.metode || '—'}</span></td>
                <td><span className="badge badge-blue">{r.bank || '—'}</span></td>
                <td><span className={`user-chip ${getUserName(r.user_id)?.toLowerCase()}`}>{getUserName(r.user_id)}</span></td>
                <td className="amount" style={{ color: 'var(--green)' }}>{fmt(r.jumlah)}</td>
                <td>
                  <button className="edit-btn" onClick={() => onEdit(r)} aria-label="Edit pemasukan" title="Edit">
                    <Pencil size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
