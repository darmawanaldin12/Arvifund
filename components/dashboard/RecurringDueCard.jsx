'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Repeat } from 'lucide-react'
import { useData } from '../DataContext'
import { fmtFull, fmtTanggalShort } from '../../lib/utils'
import { listRecurring, getOccurrence, recordRecurring, isTableMissing } from '../../lib/recurring'

/* ── RecurringDueCard ── pengingat transaksi berulang yang jatuh tempo di periode berjalan.
   Disembunyikan kalau tabel recurring_transactions belum dibuat di Supabase. ── */
export function RecurringDueCard() {
  const { user, payPeriodDate, overrides, loadData } = useData()
  const [rows, setRows]     = useState(null) // null = memuat, false = fitur belum aktif
  const [busyId, setBusyId] = useState(null)
  const [err, setErr]       = useState('')

  const load = useCallback(async () => {
    try { setRows(await listRecurring()) }
    catch (e) { setRows(isTableMissing(e) ? false : []) }
  }, [])
  useEffect(() => { load() }, [load])

  if (rows === null || rows === false) return null

  const mine  = rows.filter(r => r.aktif && (!user?.id || r.user_id === user.id))
  const items = mine
    .map(t => ({ t, occ: getOccurrence(t, payPeriodDate, overrides) }))
    .filter(x => x.occ && (x.occ.status === 'due' || x.occ.status === 'upcoming'))
    .sort((a, b) => a.occ.daysUntil - b.occ.daysUntil)

  async function handleCatat(t, occ) {
    setErr(''); setBusyId(t.id)
    try {
      await recordRecurring(t, occ, user?.id)
      await loadData()
      await load()
    } catch (e) {
      setErr('Gagal mencatat: ' + (e.message || 'coba lagi'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="bento-12">
      <div className="dash-card">
        <div className="dash-card-header-row">
          <span className="dash-card-header mb-0" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Repeat size={15} /> Transaksi Berulang
          </span>
          <Link href="/recurring" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', padding: '12px 4px', margin: '-12px -4px' }}>Kelola</Link>
        </div>

        {items.length === 0 ? (
          <p className="anomali-summary">
            {mine.length === 0
              ? 'Belum ada tagihan rutin. Tambahkan supaya diingatkan tiap periode.'
              : 'Tidak ada yang jatuh tempo dalam 3 hari ke depan.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {items.map(({ t, occ }) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.toko}</div>
                  <div style={{ fontSize: 11, marginTop: 2, color: occ.status === 'due' ? 'var(--red)' : 'var(--text3)' }}>
                    {occ.status === 'due'
                      ? (occ.daysUntil === 0 ? 'Jatuh tempo hari ini' : `Lewat ${Math.abs(occ.daysUntil)} hari (${fmtTanggalShort(occ.dateStr)})`)
                      : `${occ.daysUntil} hari lagi (${fmtTanggalShort(occ.dateStr)})`}
                    {' · '}{fmtFull(t.nilai)}
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm btn-touch"
                  style={{ flexShrink: 0 }}
                  disabled={busyId === t.id}
                  onClick={() => handleCatat(t, occ)}
                >
                  {busyId === t.id ? '...' : 'Catat'}
                </button>
              </div>
            ))}
          </div>
        )}
        {err && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>{err}</div>}
      </div>
    </div>
  )
}
