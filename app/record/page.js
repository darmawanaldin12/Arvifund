'use client'
import { useState, useMemo } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { fmt, fmtTanggalShort, filterByPeriod, buildPeriods } from '../../lib/utils'

import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Progress } from '../../components/ui/progress'
import { Separator } from '../../components/ui/separator'

// ── Icon helpers ──────────────────────────────────────────────
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
function IconWallet() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5"/>
      <path d="M16 12h6v4h-6a2 2 0 010-4z"/>
    </svg>
  )
}
function IconChevronDown({ open }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', display: 'block' }}>
      <path d="M6 9l6 6 6-6"/>
    </svg>
  )
}

const METODE_COLOR = {
  'Cash': 'var(--yellow)', 'Transfer': 'var(--accent)',
  'QRIS': 'var(--green)', 'Card': '#a855f7', 'Cardless': 'var(--orange)',
}

// ── Wallet per user ───────────────────────────────────────────
function UserWallet({ userId, userName, expenses, income, cashRecords, payPeriodDate, overrides }) {
  const periods = buildPeriods(payPeriodDate, overrides)

  // Default ke periode terbaru (index terakhir = periode paling baru)
  const [periodIdx, setPeriodIdx] = useState(String(periods.length - 1))
  const [activeMetode, setActiveMetode] = useState(null)

  // ── Filter data berdasarkan user + periode ──
  const myExpenses = useMemo(() => {
    const byUser = expenses.filter(r => r.user_id === userId)
    return periodIdx !== '' ? filterByPeriod(byUser, periodIdx, payPeriodDate, overrides) : byUser
  }, [expenses, userId, periodIdx, payPeriodDate, overrides])

  const myIncome = useMemo(() => {
    const byUser = income.filter(r => r.user_id === userId)
    const mapped = byUser.map(r => ({ ...r, nilai: r.jumlah }))
    const filtered = periodIdx !== '' ? filterByPeriod(mapped, periodIdx, payPeriodDate, overrides) : mapped
    return filtered.map(({ nilai: _nilai, ...r }) => r)
  }, [income, userId, periodIdx, payPeriodDate, overrides])

  const myCashRecords = useMemo(() => {
    const byUser = cashRecords.filter(r => r.user_id === userId)
    return periodIdx !== '' ? filterByPeriod(byUser, periodIdx, payPeriodDate, overrides) : byUser
  }, [cashRecords, userId, periodIdx, payPeriodDate, overrides])

  // ── Kalkulasi ──
  const totalMasuk   = myIncome.reduce((s, r) => s + (r.jumlah || 0), 0)
  const totalKeluar  = myExpenses.reduce((s, r) => s + (r.nilai || 0), 0)
  const totalTarik   = myCashRecords.reduce((s, r) => s + (r.nilai || 0), 0)
  const totalPakaiCash = myExpenses
    .filter(r => r.transaksi === 'Cash')
    .reduce((s, r) => s + (r.nilai || 0), 0)
  const sisaCash     = totalTarik - totalPakaiCash
  const pctCash      = totalTarik > 0 ? Math.min(Math.round(totalPakaiCash / totalTarik * 100), 100) : 0
  const saldoNet     = totalMasuk - totalKeluar

  // ── Rekap metode ──
  const byMetode = useMemo(() => {
    const m = {}
    myExpenses.forEach(r => {
      const key = r.transaksi || 'Lainnya'
      if (!m[key]) m[key] = { total: 0, count: 0, rows: [] }
      m[key].total += r.nilai || 0
      m[key].count++
      m[key].rows.push(r)
    })
    Object.values(m).forEach(v => v.rows.sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '')))
    return m
  }, [myExpenses])

  // ── Riwayat cash (tarik + pakai cash gabungan, sort by tanggal) ──
  const cashTimeline = useMemo(() => {
    const tarik = myCashRecords.map(r => ({
      id: r.id, tanggal: r.tanggal, label: r.transaksi || 'Tarik Tunai',
      sub: r.alamat || '', nilai: r.nilai, type: 'in',
    }))
    const pakai = myExpenses
      .filter(r => r.transaksi === 'Cash')
      .map(r => ({
        id: r.id, tanggal: r.tanggal, label: r.toko || '—',
        sub: r.uraian || '', nilai: r.nilai, type: 'out',
      }))
    return [...tarik, ...pakai].sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''))
  }, [myCashRecords, myExpenses])

  const userColor = userName?.toLowerCase().includes('aldin') ? 'var(--accent)' : '#db2777'
  const userBg    = userName?.toLowerCase().includes('aldin') ? 'var(--accent-light)' : 'rgba(236,72,153,0.1)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Filter Periode ── */}
      <div className="filter-bar">
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

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

        {/* Masuk */}
        <Card style={{ background: 'var(--green-bg)', border: '1px solid color-mix(in srgb, var(--green) 20%, transparent)', borderRadius: 14 }}>
          <CardContent style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Masuk</span>
              <span style={{ width: 24, height: 24, borderRadius: 7, background: 'color-mix(in srgb, var(--green) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}>
                <IconArrowUp />
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)', letterSpacing: '-0.02em', marginBottom: 3 }}>{fmt(totalMasuk)}</div>
            <Badge style={{ fontSize: 10, padding: '1px 6px', background: 'color-mix(in srgb, var(--green) 12%, transparent)', color: 'var(--green)', border: 'none', borderRadius: 6 }}>
              {myIncome.length} transaksi
            </Badge>
          </CardContent>
        </Card>

        {/* Keluar */}
        <Card style={{ background: 'var(--red-bg)', border: '1px solid color-mix(in srgb, var(--red) 20%, transparent)', borderRadius: 14 }}>
          <CardContent style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Keluar</span>
              <span style={{ width: 24, height: 24, borderRadius: 7, background: 'color-mix(in srgb, var(--red) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)' }}>
                <IconArrowDown />
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)', letterSpacing: '-0.02em', marginBottom: 3 }}>{fmt(totalKeluar)}</div>
            <Badge style={{ fontSize: 10, padding: '1px 6px', background: 'color-mix(in srgb, var(--red) 12%, transparent)', color: 'var(--red)', border: 'none', borderRadius: 6 }}>
              {myExpenses.length} transaksi
            </Badge>
          </CardContent>
        </Card>

        {/* Saldo Net — full width */}
        <Card style={{ gridColumn: 'span 2', border: `1px solid color-mix(in srgb, ${userColor} 20%, transparent)`, background: `color-mix(in srgb, ${userColor} 6%, var(--surface))`, borderRadius: 14 }}>
          <CardContent style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: `color-mix(in srgb, ${userColor} 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: userColor, flexShrink: 0 }}>
              <IconWallet />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: userColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Saldo Bersih</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: saldoNet >= 0 ? userColor : 'var(--red)', letterSpacing: '-0.02em' }}>{fmt(saldoNet)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>masuk − keluar</div>
              <Badge style={{ fontSize: 10, padding: '2px 8px', background: `color-mix(in srgb, ${userColor} 12%, transparent)`, color: userColor, border: 'none', borderRadius: 6 }}>
                {saldoNet >= 0 ? '▲ Surplus' : '▼ Defisit'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Dompet Cash ── */}
      <Card style={{ border: '1px solid color-mix(in srgb, var(--yellow) 25%, transparent)', background: 'var(--yellow-bg)', borderRadius: 14 }}>
        <CardHeader style={{ padding: '12px 14px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <CardTitle style={{ fontSize: 13, fontWeight: 700, color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconBanknote /> Dompet Cash
            </CardTitle>
            <Badge style={{ fontSize: 12, padding: '3px 10px', background: sisaCash >= 0 ? 'color-mix(in srgb, var(--yellow) 20%, transparent)' : 'var(--red-bg)', color: sisaCash >= 0 ? 'var(--yellow)' : 'var(--red)', border: 'none', borderRadius: 8, fontWeight: 800 }}>
              {fmt(sisaCash)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent style={{ padding: '0 14px 12px' }}>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: 'color-mix(in srgb, var(--yellow) 10%, var(--surface))' }}>
              <div style={{ fontSize: 10, color: 'var(--yellow)', fontWeight: 700, marginBottom: 2 }}>Tarik Tunai</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--yellow)' }}>{fmt(totalTarik)}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{myCashRecords.length}×</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: 'color-mix(in srgb, var(--red) 8%, var(--surface))' }}>
              <div style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700, marginBottom: 2 }}>Dipakai Cash</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--red)' }}>{fmt(totalPakaiCash)}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{myExpenses.filter(r => r.transaksi === 'Cash').length}×</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 8, background: sisaCash >= 0 ? 'color-mix(in srgb, var(--green) 8%, var(--surface))' : 'color-mix(in srgb, var(--red) 8%, var(--surface))' }}>
              <div style={{ fontSize: 10, color: sisaCash >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700, marginBottom: 2 }}>Sisa Cash</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: sisaCash >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(sisaCash)}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{pctCash}% terpakai</div>
            </div>
          </div>

          {/* Progress bar cash */}
          {totalTarik > 0 && (
            <div style={{ marginBottom: 10 }}>
              <Progress value={pctCash} style={{
                height: 6,
                '--progress-color': pctCash >= 100 ? 'var(--red)' : pctCash >= 80 ? 'var(--yellow)' : 'var(--green)'
              }} />
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{pctCash}% cash terpakai dari {fmt(totalTarik)} yang ditarik</div>
            </div>
          )}

          {/* Timeline cash */}
          {cashTimeline.length > 0 && (
            <>
              <Separator style={{ marginBottom: 8, background: 'color-mix(in srgb, var(--yellow) 20%, transparent)' }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
                Riwayat Cash
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {cashTimeline.map((r, i) => (
                  <div key={r.id + '-' + i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8,
                    background: i % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--yellow) 4%, transparent)',
                  }}>
                    {/* Tipe indikator */}
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: r.type === 'in' ? 'var(--yellow)' : 'var(--red)',
                      marginTop: 1,
                    }} />
                    {/* Tanggal */}
                    <div style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0, minWidth: 46, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtTanggalShort(r.tanggal)}
                    </div>
                    {/* Label */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.label}
                      </div>
                      {r.sub && (
                        <div style={{ fontSize: 10, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.sub}
                        </div>
                      )}
                    </div>
                    {/* Nilai */}
                    <div style={{ fontSize: 12, fontWeight: 700, color: r.type === 'in' ? 'var(--yellow)' : 'var(--red)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {r.type === 'in' ? '+' : '-'}{fmt(r.nilai)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {cashTimeline.length === 0 && (
            <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text3)', fontSize: 12 }}>
              Belum ada aktivitas cash periode ini
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Rekap per Metode Bayar ── */}
      <Card style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 14 }}>
        <CardHeader style={{ padding: '12px 14px 8px' }}>
          <CardTitle style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>Rekap per Metode Bayar</CardTitle>
        </CardHeader>
        <CardContent style={{ padding: '0 10px 10px' }}>
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
                      <div
                        onClick={() => setActiveMetode(isOpen ? null : metode)}
                        style={{
                          padding: '9px 10px', borderRadius: 10, cursor: 'pointer',
                          background: isOpen ? `color-mix(in srgb, ${color} 10%, transparent)` : 'transparent',
                          border: `1px solid ${isOpen ? color : 'transparent'}`,
                          transition: 'background 0.15s, border-color 0.15s', marginBottom: 2,
                        }}
                        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'var(--surface2)' }}
                        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: isOpen ? color : 'var(--text1)' }}>{metode}</span>
                            <Badge style={{ fontSize: 10, padding: '1px 5px', background: `color-mix(in srgb, ${color} 12%, transparent)`, color, border: 'none', borderRadius: 6 }}>
                              {data.count}×
                            </Badge>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>{fmt(data.total)}</span>
                            <span style={{ fontSize: 10, color: 'var(--text3)' }}>{pct}%</span>
                            <span style={{ color: isOpen ? color : 'var(--text3)' }}><IconChevronDown open={isOpen} /></span>
                          </div>
                        </div>
                        <Progress value={pct} style={{ '--progress-color': color }} />
                      </div>

                      {/* Accordion detail */}
                      {isOpen && (
                        <Card style={{
                          marginBottom: 6, marginTop: 2,
                          border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
                          background: 'var(--surface)', borderRadius: 10, overflow: 'hidden',
                          animation: 'fadeIn 0.2s ease',
                        }}>
                          <div style={{ padding: '7px 12px', display: 'flex', justifyContent: 'space-between', background: `color-mix(in srgb, ${color} 8%, transparent)` }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color }}>{metode} · {data.count} transaksi</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color }}>{fmt(data.total)}</span>
                          </div>
                          <Separator style={{ background: `color-mix(in srgb, ${color} 20%, transparent)` }} />
                          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                            {data.rows.map((r, idx) => (
                              <div key={r.id || idx}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px' }}>
                                  <div style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0, minWidth: 48, fontVariantNumeric: 'tabular-nums' }}>
                                    {fmtTanggalShort(r.tanggal)}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {r.toko || '—'}
                                    </div>
                                    {r.uraian && <div style={{ fontSize: 10, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.uraian}</div>}
                                  </div>
                                  <Badge style={{ fontSize: 10, padding: '2px 5px', background: 'var(--surface2)', color: 'var(--text3)', border: 'none', flexShrink: 0 }}>
                                    {r.bank || '—'}
                                  </Badge>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
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

    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function RecordPage() {
  const {
    expenses, income, cashRecords,
    loadData, loading,
    profiles,
    payPeriodDate, overrides,
  } = useData()

  // Tab = user_id dari profiles (bukan nama hardcode)
  const users = profiles.filter(p => p.username) // semua user yg punya username
  const [activeUserId, setActiveUserId] = useState(null)

  // Default ke user pertama saat profiles load
  const resolvedUserId = activeUserId || users[0]?.id || null

  const activeUser = users.find(u => u.id === resolvedUserId)

  // Warna per user
  function userColor(username) {
    return username?.toLowerCase().includes('aldin') ? 'var(--accent)' : '#db2777'
  }
  function userBg(username) {
    return username?.toLowerCase().includes('aldin') ? 'var(--accent-light)' : 'rgba(236,72,153,0.1)'
  }

  return (
    <>
      <AppHeader title="Wallet" onRefresh={loadData} loading={loading} />
      <div className="page-container">

        {/* ── User Tabs ── */}
        <div style={{
          display: 'flex',
          background: 'var(--surface2)',
          borderRadius: 14,
          padding: 4,
          marginBottom: 16,
          gap: 4,
        }}>
          {users.map(u => {
            const isActive = resolvedUserId === u.id
            const color = userColor(u.username)
            const bg = userBg(u.username)
            return (
              <button
                key={u.id}
                onClick={() => setActiveUserId(u.id)}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.18s ease',
                  background: isActive ? 'var(--surface)' : 'transparent',
                  boxShadow: isActive ? '0 1px 6px rgba(0,0,0,0.12)' : 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: isActive ? bg : 'var(--surface3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 6px',
                  fontSize: 14, fontWeight: 800,
                  color: isActive ? color : 'var(--text3)',
                  transition: 'all 0.18s',
                  border: isActive ? `2px solid ${color}` : '2px solid transparent',
                }}>
                  {u.username?.[0]?.toUpperCase()}
                </div>
                <div style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? color : 'var(--text3)', transition: 'color 0.18s' }}>
                  {u.username}
                </div>
                {isActive && (
                  <div style={{ width: 16, height: 3, borderRadius: 2, background: color, margin: '4px auto 0' }} />
                )}
              </button>
            )
          })}
        </div>

        {/* ── Wallet Content ── */}
        {resolvedUserId && (
          <UserWallet
            key={resolvedUserId}
            userId={resolvedUserId}
            userName={activeUser?.username || ''}
            expenses={expenses}
            income={income}
            cashRecords={cashRecords}
            payPeriodDate={payPeriodDate}
            overrides={overrides}
          />
        )}

        {users.length === 0 && (
          <div className="empty-state">
            <div className="emoji">👤</div>
            <p>Tidak ada user ditemukan</p>
          </div>
        )}

      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  )
}
