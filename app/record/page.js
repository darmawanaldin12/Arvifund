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

// Icon komponen kecil (inline SVG, zero dependency)
function IconArrowUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7"/>
    </svg>
  )
}
function IconArrowDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M19 12l-7 7-7-7"/>
    </svg>
  )
}
function IconBanknote() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <circle cx="12" cy="12" r="2"/>
      <path d="M6 12h.01M18 12h.01"/>
    </svg>
  )
}
function IconChevronDown({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', display: 'block' }}>
      <path d="M6 9l6 6 6-6"/>
    </svg>
  )
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>

          {/* Masuk */}
          <Card style={{ background: 'var(--green-bg)', border: '1px solid color-mix(in srgb, var(--green) 20%, transparent)', borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
            <CardContent style={{ padding: '14px 14px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Masuk</span>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: 'color-mix(in srgb, var(--green) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}>
                  <IconArrowUp />
                </span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--green)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 4 }}>
                {fmt(totalMasuk)}
              </div>
              <Badge style={{ fontSize: 10, padding: '1px 6px', background: 'color-mix(in srgb, var(--green) 12%, transparent)', color: 'var(--green)', border: 'none', borderRadius: 6 }}>
                {filteredIncome.length} transaksi
              </Badge>
            </CardContent>
          </Card>

          {/* Keluar */}
          <Card style={{ background: 'var(--red-bg)', border: '1px solid color-mix(in srgb, var(--red) 20%, transparent)', borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
            <CardContent style={{ padding: '14px 14px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Keluar</span>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: 'color-mix(in srgb, var(--red) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)' }}>
                  <IconArrowDown />
                </span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--red)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 4 }}>
                {fmt(totalKeluar)}
              </div>
              <Badge style={{ fontSize: 10, padding: '1px 6px', background: 'color-mix(in srgb, var(--red) 12%, transparent)', color: 'var(--red)', border: 'none', borderRadius: 6 }}>
                {filteredExpenses.length} transaksi
              </Badge>
            </CardContent>
          </Card>

          {/* Tarik Tunai — full width */}
          <Card style={{ gridColumn: 'span 2', background: 'var(--yellow-bg)', border: '1px solid color-mix(in srgb, var(--yellow) 20%, transparent)', borderRadius: 14, overflow: 'hidden' }}>
            <CardContent style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: 'color-mix(in srgb, var(--yellow) 18%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--yellow)', flexShrink: 0 }}>
                <IconBanknote />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Tarik Tunai</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--yellow)', letterSpacing: '-0.02em' }}>{fmt(totalCashRec)}</div>
              </div>
              <Badge style={{ fontSize: 10, padding: '2px 8px', background: 'color-mix(in srgb, var(--yellow) 15%, transparent)', color: 'var(--yellow)', border: 'none', borderRadius: 6, flexShrink: 0 }}>
                {filteredCashRecords.length} transaksi
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* ── Rekap per Metode Bayar ── */}
        <Card style={{ marginBottom: 12, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 14 }}>
          <CardHeader style={{ padding: '14px 16px 10px' }}>
            <CardTitle style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>Rekap per Metode Bayar</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: '0 12px 12px' }}>
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
                            borderRadius: 10,
                            cursor: 'pointer',
                            background: isOpen ? `color-mix(in srgb, ${color} 10%, transparent)` : 'transparent',
                            border: `1px solid ${isOpen ? color : 'transparent'}`,
                            transition: 'background 0.15s, border-color 0.15s',
                            marginBottom: 2,
                          }}
                          onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'var(--surface2)' }}
                          onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                              <span style={{ fontSize: 13, fontWeight: 700, color: isOpen ? color : 'var(--text1)' }}>{metode}</span>
                              <Badge style={{
                                fontSize: 10, padding: '1px 6px',
                                background: `color-mix(in srgb, ${color} 12%, transparent)`,
                                color, border: 'none', borderRadius: 6,
                              }}>
                                {data.count}×
                              </Badge>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>
                                {fmt(data.total)}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{pct}%</span>
                              <span style={{ color: isOpen ? color : 'var(--text3)' }}>
                                <IconChevronDown open={isOpen} />
                              </span>
                            </div>
                          </div>
                          <Progress
                            value={pct}
                            className="h-1.5"
                            style={{ '--progress-color': color }}
                          />
                        </div>

                        {/* Rincian inline (accordion) */}
                        {isOpen && (
                          <Card style={{
                            marginBottom: 6, marginTop: 2,
                            border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
                            background: 'var(--surface)',
                            borderRadius: 10,
                            overflow: 'hidden',
                            animation: 'fadeIn 0.2s ease',
                          }}>
                            {/* Header rincian */}
                            <div style={{
                              padding: '8px 14px',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              background: `color-mix(in srgb, ${color} 8%, transparent)`,
                            }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color }}>
                                {metode} · {data.count} transaksi
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 700, color }}>
                                {fmt(data.total)}
                              </span>
                            </div>
                            <Separator style={{ background: `color-mix(in srgb, ${color} 20%, transparent)` }} />

                            {/* List transaksi */}
                            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                              {data.rows.map((r, idx) => (
                                <div key={r.id || idx}>
                                  <div style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '9px 14px',
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
        <Card style={{ marginBottom: 12, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 14 }}>
          <CardHeader style={{ padding: '14px 16px 10px' }}>
            <CardTitle style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>Rekap per Bank / Dompet</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: '0 12px 12px' }}>
            {Object.keys(byBank).length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 16 }}>Belum ada data</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(byBank)
                  .sort((a, b) => b[1].keluar - a[1].keluar)
                  .map(([bank, data]) => {
                    const net = (data.masuk || 0) - (data.keluar || 0)
                    return (
                      <div key={bank} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: 'var(--surface2)',
                        border: '1px solid var(--border2)',
                      }}>
                        {/* Bank name */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Badge variant="outline" style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, color: 'var(--accent)', borderColor: 'var(--accent-dim)', background: 'var(--accent-light)' }}>
                            {bank}
                          </Badge>
                        </div>
                        {/* Masuk */}
                        <div style={{ textAlign: 'right', minWidth: 0 }}>
                          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 1 }}>Masuk</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>{fmt(data.masuk || 0)}</div>
                        </div>
                        <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
                        {/* Keluar */}
                        <div style={{ textAlign: 'right', minWidth: 0 }}>
                          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 1 }}>Keluar</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>{fmt(data.keluar || 0)}</div>
                        </div>
                        <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
                        {/* Net */}
                        <div style={{ textAlign: 'right', minWidth: 0 }}>
                          <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 1 }}>Net</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: net >= 0 ? 'var(--accent)' : 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>{fmt(net)}</div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Rekap per User ── */}
        <Card style={{ marginBottom: 16, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 14 }}>
          <CardHeader style={{ padding: '14px 16px 10px' }}>
            <CardTitle style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>Rekap per User</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: '0 12px 12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(byUser).map(([name, data]) => (
                <div key={name} style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'var(--surface2)',
                  border: '1px solid var(--border2)',
                }}>
                  {/* User name row */}
                  <div style={{ marginBottom: 8 }}>
                    <span className={`user-chip ${name.toLowerCase()}`}>{name}</span>
                  </div>
                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 8, background: 'var(--green-bg)' }}>
                      <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600, marginBottom: 2 }}>Masuk</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>{fmt(data.masuk || 0)}</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 8, background: 'var(--red-bg)' }}>
                      <div style={{ fontSize: 10, color: 'var(--red)', fontWeight: 600, marginBottom: 2 }}>Keluar</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>{fmt(data.keluar || 0)}</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 8, background: 'var(--yellow-bg)' }}>
                      <div style={{ fontSize: 10, color: 'var(--yellow)', fontWeight: 600, marginBottom: 2 }}>Tarik</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--yellow)', fontVariantNumeric: 'tabular-nums' }}>{fmt(data.cash || 0)}</div>
                    </div>
                  </div>
                </div>
              ))}
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
