'use client'
import { useState, useMemo } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { fmt, fmtTanggalShort, BULAN_ORDER } from '../../lib/utils'

import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Progress } from '../../components/ui/progress'
import { Separator } from '../../components/ui/separator'

const METODE_COLOR = {
  'Cash': 'var(--yellow)', 'Transfer': 'var(--accent)',
  'QRIS': 'var(--green)', 'Card': '#a855f7', 'Cardless': 'var(--orange)',
}

export default function RecordPage() {
  const {
    filteredExpenses, filteredIncome, filteredCashRecords,
    loadData, loading, getUserName,
    periodIdx, setPeriodIdx, periods,
  } = useData()

  // State drawer rincian metode
  const [activeMetode, setActiveMetode] = useState(null) // nama metode yang sedang dibuka

  // ── Rekap per metode ──────────────────────────────────────
  const byMetode = useMemo(() => {
    const m = {}
    filteredExpenses.forEach(r => {
      const key = r.transaksi || 'Lainnya'
      if (!m[key]) m[key] = { total: 0, count: 0, rows: [] }
      m[key].total += r.nilai || 0
      m[key].count++
      m[key].rows.push(r)
    })
    // sort rows per metode by tanggal desc
    Object.values(m).forEach(v => v.rows.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '')))
    return m
  }, [filteredExpenses])

  // ── Rekap per bank ────────────────────────────────────────
  const byBank = useMemo(() => {
    const m = {}
    filteredExpenses.forEach(r => {
      const key = r.bank || 'Lainnya'
      if (!m[key]) m[key] = { keluar: 0, masuk: 0 }
      m[key].keluar += r.nilai || 0
    })
    filteredIncome.forEach(r => {
      const key = r.bank || 'Lainnya'
      if (!m[key]) m[key] = { keluar: 0, masuk: 0 }
      m[key].masuk += r.jumlah || 0
    })
    return m
  }, [filteredExpenses, filteredIncome])

  // ── Rekap per user ────────────────────────────────────────
  const byUser = useMemo(() => {
    const m = {}
    filteredExpenses.forEach(r => {
      const name = getUserName(r.user_id)
      if (!m[name]) m[name] = { keluar: 0, masuk: 0, cash: 0 }
      m[name].keluar += r.nilai || 0
    })
    filteredIncome.forEach(r => {
      const name = getUserName(r.user_id)
      if (!m[name]) m[name] = { keluar: 0, masuk: 0, cash: 0 }
      m[name].masuk += r.jumlah || 0
    })
    filteredCashRecords.forEach(r => {
      const name = getUserName(r.user_id)
      if (!m[name]) m[name] = { keluar: 0, masuk: 0, cash: 0 }
      m[name].cash += r.nilai || 0
    })
    return m
  }, [filteredExpenses, filteredIncome, filteredCashRecords, getUserName])

  const totalKeluar  = filteredExpenses.reduce((s, r) => s + (r.nilai || 0), 0)
  const totalMasuk   = filteredIncome.reduce((s, r) => s + (r.jumlah || 0), 0)
  const totalCashRec = filteredCashRecords.reduce((s, r) => s + (r.nilai || 0), 0)

  const activeData = activeMetode ? byMetode[activeMetode] : null

  return (
    <>
      <AppHeader title="Wallet" onRefresh={loadData} loading={loading} />
      <div className="page-container">

        {/* ── Period Filter (sama seperti halaman lain) ── */}
        <div className="filter-bar" style={{ marginBottom: 16 }}>
          <div
            className={`filter-chip${periodIdx === '' ? ' active' : ''}`}
            onClick={() => setPeriodIdx('')}
          >Semua</div>
          {periods.map((p, i) => (
            <div
              key={i}
              className={`filter-chip${periodIdx === String(i) ? ' active' : ''}`}
              onClick={() => setPeriodIdx(String(i))}
            >{p.label}</div>
          ))}
        </div>

        {/* ── KPI Summary ── */}
        <div className="kpi-grid" style={{ marginBottom: 16 }}>
          <Card className="kpi-card income" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <CardContent style={{ padding: '14px 16px' }}>
              <div className="kpi-label">Total Masuk</div>
              <div className="kpi-value" style={{ color: 'var(--green)' }}>{fmt(totalMasuk)}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{filteredIncome.length} transaksi</div>
            </CardContent>
          </Card>
          <Card className="kpi-card expense" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <CardContent style={{ padding: '14px 16px' }}>
              <div className="kpi-label">Total Keluar</div>
              <div className="kpi-value" style={{ color: 'var(--red)' }}>{fmt(totalKeluar)}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{filteredExpenses.length} transaksi</div>
            </CardContent>
          </Card>
          <Card className="kpi-card cash" style={{ gridColumn: 'span 2', border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <CardContent style={{ padding: '14px 16px' }}>
              <div className="kpi-label">Tarik Tunai</div>
              <div className="kpi-value" style={{ color: 'var(--yellow)' }}>{fmt(totalCashRec)}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{filteredCashRecords.length} transaksi</div>
            </CardContent>
          </Card>
        </div>

        {/* ── Rekap per Metode Bayar ── */}
        <Card style={{ marginBottom: 16, border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <CardHeader style={{ padding: '14px 16px 8px' }}>
            <CardTitle style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>Rekap per Metode Bayar</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: '0 16px 14px' }}>
            {Object.keys(byMetode).length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 16 }}>Belum ada data</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(byMetode)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([metode, data]) => {
                    const pct   = totalKeluar > 0 ? Math.round(data.total / totalKeluar * 100) : 0
                    const color = METODE_COLOR[metode] || 'var(--text2)'
                    const isOpen = activeMetode === metode
                    return (
                      <div key={metode}>
                        {/* Row clickable */}
                        <div
                          onClick={() => setActiveMetode(isOpen ? null : metode)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: isOpen ? `${color}15` : 'transparent',
                            border: `1px solid ${isOpen ? color : 'transparent'}`,
                            transition: 'background 0.15s, border-color 0.15s',
                            marginBottom: 2,
                          }}
                          onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'var(--surface2)' }}
                          onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                              <span style={{ fontSize: 13, fontWeight: 700, color: isOpen ? color : 'var(--text1)' }}>{metode}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 700 }}>
                                {fmt(data.total)} <span style={{ color: 'var(--text3)', fontSize: 11 }}>({pct}%)</span>
                              </span>
                              <span style={{ fontSize: 12, color: isOpen ? color : 'var(--text3)', transition: 'transform 0.2s', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                            </div>
                          </div>
                          <Progress
                            value={pct}
                            className="h-1.5"
                            style={{ '--progress-color': color }}
                          />
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{data.count} transaksi · tap untuk rincian</div>
                        </div>

                        {/* Rincian inline (accordion) */}
                        {isOpen && (
                          <Card style={{
                            marginBottom: 8,
                            border: `1px solid ${color}33`,
                            background: 'var(--surface)',
                            overflow: 'hidden',
                            animation: 'fadeIn 0.2s ease',
                          }}>
                            {/* Header rincian */}
                            <div style={{
                              padding: '10px 14px',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              background: `${color}0d`,
                            }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color }}>
                                {metode} · {data.count} transaksi
                              </span>
                              <span style={{ fontSize: 12, fontWeight: 700, color }}>
                                Total: {fmt(data.total)}
                              </span>
                            </div>
                            <Separator style={{ background: `${color}22` }} />

                            {/* List transaksi */}
                            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                              {data.rows.map((r, idx) => (
                                <div key={r.id || idx}>
                                  <div style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '10px 14px',
                                  }}>
                                    {/* Tanggal */}
                                    <div style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0, minWidth: 52, fontVariantNumeric: 'tabular-nums' }}>
                                      {fmtTanggalShort(r.tanggal)}
                                    </div>
                                    {/* Deskripsi */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {r.toko || '—'}
                                      </div>
                                      {r.uraian && (
                                        <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {r.uraian}
                                        </div>
                                      )}
                                    </div>
                                    {/* Bank */}
                                    <Badge variant="secondary" style={{ fontSize: 10, padding: '2px 6px', background: 'var(--surface2)', color: 'var(--text3)', border: 'none', flexShrink: 0 }}>
                                      {r.bank || '—'}
                                    </Badge>
                                    {/* Nilai */}
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                                      {fmt(r.nilai)}
                                    </div>
                                  </div>
                                  {idx < data.rows.length - 1 && <Separator />}
                                </div>
                              ))}
                            </div>
                          </Card>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Rekap per Bank / Dompet ── */}
        <Card style={{ marginBottom: 16, border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <CardHeader style={{ padding: '14px 16px 8px' }}>
            <CardTitle style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>Rekap per Bank / Dompet</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: '0 16px 14px' }}>
            {Object.keys(byBank).length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 16 }}>Belum ada data</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Bank</th>
                      <th style={{ textAlign: 'right', color: 'var(--green)' }}>Masuk</th>
                      <th style={{ textAlign: 'right', color: 'var(--red)' }}>Keluar</th>
                      <th style={{ textAlign: 'right' }}>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(byBank)
                      .sort((a, b) => b[1].keluar - a[1].keluar)
                      .map(([bank, data]) => {
                        const net = (data.masuk || 0) - (data.keluar || 0)
                        return (
                          <tr key={bank}>
                            <td>
                              <Badge variant="outline" className="badge badge-blue" style={{ fontSize: 11 }}>
                                {bank}
                              </Badge>
                            </td>
                            <td className="amount" style={{ color: 'var(--green)' }}>{fmt(data.masuk || 0)}</td>
                            <td className="amount" style={{ color: 'var(--red)' }}>{fmt(data.keluar || 0)}</td>
                            <td className="amount" style={{ color: net >= 0 ? 'var(--accent)' : 'var(--red)' }}>{fmt(net)}</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Rekap per User ── */}
        <Card style={{ marginBottom: 16, border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <CardHeader style={{ padding: '14px 16px 8px' }}>
            <CardTitle style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>Rekap per User</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: '0 16px 14px' }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th style={{ textAlign: 'right', color: 'var(--green)' }}>Masuk</th>
                    <th style={{ textAlign: 'right', color: 'var(--red)' }}>Keluar</th>
                    <th style={{ textAlign: 'right', color: 'var(--yellow)' }}>Tarik</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(byUser).map(([name, data]) => (
                    <tr key={name}>
                      <td><span className={`user-chip ${name.toLowerCase()}`}>{name}</span></td>
                      <td className="amount" style={{ color: 'var(--green)' }}>{fmt(data.masuk || 0)}</td>
                      <td className="amount" style={{ color: 'var(--red)' }}>{fmt(data.keluar || 0)}</td>
                      <td className="amount" style={{ color: 'var(--yellow)' }}>{fmt(data.cash || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  )
}
