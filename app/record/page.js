'use client'
import { useState, useMemo } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { fmt, BULAN_ORDER } from '../../lib/utils'

export default function RecordPage() {
  const { expenses, income, cashRecords, loadData, loading, getUserName } = useData()

  const now = new Date()
  const [selBulan, setSelBulan] = useState(BULAN_ORDER[now.getMonth()])
  const [selTahun, setSelTahun] = useState(now.getFullYear())

  const tahunList = [now.getFullYear() - 1, now.getFullYear()]

  const filtExp  = useMemo(() => expenses.filter(r => r.bulan === selBulan && new Date(r.tanggal).getFullYear() === selTahun), [expenses, selBulan, selTahun])
  const filtInc  = useMemo(() => income.filter(r => r.bulan === selBulan && new Date(r.tanggal).getFullYear() === selTahun), [income, selBulan, selTahun])
  const filtCash = useMemo(() => cashRecords.filter(r => r.bulan === selBulan && new Date(r.tanggal).getFullYear() === selTahun), [cashRecords, selBulan, selTahun])

  // Rekap per metode transaksi
  const byMetode = useMemo(() => {
    const m = {}
    filtExp.forEach(r => {
      const key = r.transaksi || 'Lainnya'
      if (!m[key]) m[key] = { total: 0, count: 0 }
      m[key].total += r.nilai || 0
      m[key].count++
    })
    return m
  }, [filtExp])

  // Rekap per bank
  const byBank = useMemo(() => {
    const m = {}
    filtExp.forEach(r => {
      const key = r.bank || 'Lainnya'
      if (!m[key]) m[key] = { keluar: 0 }
      m[key].keluar += r.nilai || 0
    })
    filtInc.forEach(r => {
      const key = r.bank || 'Lainnya'
      if (!m[key]) m[key] = { keluar: 0 }
      m[key].masuk = (m[key].masuk || 0) + (r.jumlah || 0)
    })
    return m
  }, [filtExp, filtInc])

  // Rekap per user
  const byUser = useMemo(() => {
    const m = {}
    filtExp.forEach(r => {
      const name = getUserName(r.user_id)
      if (!m[name]) m[name] = { keluar: 0, masuk: 0, cash: 0, count: 0 }
      m[name].keluar += r.nilai || 0
      m[name].count++
    })
    filtInc.forEach(r => {
      const name = getUserName(r.user_id)
      if (!m[name]) m[name] = { keluar: 0, masuk: 0, cash: 0, count: 0 }
      m[name].masuk += r.jumlah || 0
    })
    filtCash.forEach(r => {
      const name = getUserName(r.user_id)
      if (!m[name]) m[name] = { keluar: 0, masuk: 0, cash: 0, count: 0 }
      m[name].cash += r.nilai || 0
    })
    return m
  }, [filtExp, filtInc, filtCash, getUserName])

  const totalKeluar  = filtExp.reduce((s, r) => s + (r.nilai || 0), 0)
  const totalMasuk   = filtInc.reduce((s, r) => s + (r.jumlah || 0), 0)
  const totalCashRec = filtCash.reduce((s, r) => s + (r.nilai || 0), 0)

  const METODE_COLOR = {
    'Cash': 'var(--yellow)', 'Transfer': 'var(--accent)',
    'QRIS': 'var(--green)', 'Card': 'var(--purple)', 'Cardless': 'var(--orange)',
  }

  return (
    <>
      <AppHeader title="Wallet" onRefresh={loadData} loading={loading} />
      <div className="page-container">

        {/* Selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <select className="form-select" value={selBulan} onChange={e => setSelBulan(e.target.value)} style={{ flex: 2 }}>
            {BULAN_ORDER.map(b => <option key={b}>{b}</option>)}
          </select>
          <select className="form-select" value={selTahun} onChange={e => setSelTahun(parseInt(e.target.value))} style={{ flex: 1 }}>
            {tahunList.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>

        {/* Summary KPI */}
        <div className="kpi-grid" style={{ marginBottom: 16 }}>
          <div className="kpi-card income">
            <div className="kpi-label">Total Masuk</div>
            <div className="kpi-value" style={{ color: 'var(--green)' }}>{fmt(totalMasuk)}</div>
            <div className="kpi-sub">{filtInc.length} transaksi</div>
          </div>
          <div className="kpi-card expense">
            <div className="kpi-label">Total Keluar</div>
            <div className="kpi-value" style={{ color: 'var(--red)' }}>{fmt(totalKeluar)}</div>
            <div className="kpi-sub">{filtExp.length} transaksi</div>
          </div>
          <div className="kpi-card cash" style={{ gridColumn: 'span 2' }}>
            <div className="kpi-label">Tarik Tunai</div>
            <div className="kpi-value" style={{ color: 'var(--yellow)' }}>{fmt(totalCashRec)}</div>
            <div className="kpi-sub">{filtCash.length} transaksi</div>
          </div>
        </div>

        {/* Rekap per Metode */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title">Rekap per Metode Bayar</div>
          {Object.keys(byMetode).length === 0 ? (
            <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 16 }}>Belum ada data</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(byMetode)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([metode, data]) => {
                  const pct = totalKeluar > 0 ? Math.round(data.total / totalKeluar * 100) : 0
                  const color = METODE_COLOR[metode] || 'var(--text2)'
                  return (
                    <div key={metode}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{metode}</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>
                          {fmt(data.total)} <span style={{ color: 'var(--text3)', fontSize: 11 }}>({pct}%)</span>
                        </span>
                      </div>
                      <div className="progress-wrap">
                        <div className="progress-bar" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{data.count} transaksi</div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Rekap per Bank */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title">Rekap per Bank / Dompet</div>
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
                          <td><span className="badge badge-blue">{bank}</span></td>
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
        </div>

        {/* Rekap per User */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title">Rekap per User</div>
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
                    <td>
                      <span className={`user-chip ${name.toLowerCase()}`}>{name}</span>
                    </td>
                    <td className="amount" style={{ color: 'var(--green)' }}>{fmt(data.masuk || 0)}</td>
                    <td className="amount" style={{ color: 'var(--red)' }}>{fmt(data.keluar || 0)}</td>
                    <td className="amount" style={{ color: 'var(--yellow)' }}>{fmt(data.cash || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  )
}
