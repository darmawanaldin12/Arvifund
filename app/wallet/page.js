'use client'
import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { fmt, BULAN_ORDER } from '../../lib/utils'

export default function WalletPage() {
  const {
    filteredExpenses, filteredIncome, filteredCashRecords,
    expenses, income, cashRecords,
    summaryPeriode, summaryAll,
    periodIdx, setPeriodIdx, periods,
    loadData, loading, getUserName, profiles,
  } = useData()
  const router = useRouter()

  const s = summaryPeriode

  // Saldo Cash per User — tarik tunai dikurangi expenses cash
  const cashSaldoEntries = Object.entries(s.saldoCashByUser || {})

  // Transfer → Riwayat summary (total transfer keluar periode ini)
  const totalTransfer = useMemo(() => {
    return filteredExpenses
      .filter(r => r.transaksi === 'Transfer')
      .reduce((sum, r) => sum + (r.nilai || 0), 0)
  }, [filteredExpenses])

  const totalRiwayat = useMemo(() => {
    return filteredCashRecords.reduce((sum, r) => sum + (r.nilai || 0), 0)
  }, [filteredCashRecords])

  // Period label for display
  const activePeriod = periodIdx !== '' ? periods[parseInt(periodIdx)] : null
  const periodLabel = activePeriod
    ? `${activePeriod.startDate} – ${activePeriod.endDate}`
    : 'Semua Periode'

  // Cash vs QRIS vs Transfer breakdown per bulan (last 3 months)
  const metodeByBulan = useMemo(() => {
    const now = new Date()
    const months = []
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(BULAN_ORDER[d.getMonth()])
    }
    return months.map(bulan => {
      const exp = expenses.filter(r => r.bulan === bulan)
      return {
        bulan,
        cash:     exp.filter(r => r.transaksi === 'Cash').reduce((s, r) => s + (r.nilai || 0), 0),
        qris:     exp.filter(r => r.transaksi === 'QRIS').reduce((s, r) => s + (r.nilai || 0), 0),
        transfer: exp.filter(r => r.transaksi === 'Transfer').reduce((s, r) => s + (r.nilai || 0), 0),
      }
    })
  }, [expenses])

  return (
    <>
      <AppHeader title="Wallet" onRefresh={loadData} loading={loading} />
      <div className="page-container">

        {/* Period Filter */}
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

        {/* Transfer → Riwayat Hero Card */}
        <div className="card" style={{ marginBottom: 16, background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', letterSpacing: 1, textTransform: 'uppercase' }}>Transfer</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--yellow)', letterSpacing: 1, textTransform: 'uppercase' }}>Riwayat</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--yellow)', margin: '4px 0 6px' }}>
            {fmt(totalTransfer + totalRiwayat)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{periodLabel}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Transfer</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{fmt(totalTransfer)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>Tarik Tunai</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--yellow)' }}>{fmt(totalRiwayat)}</div>
            </div>
          </div>
        </div>

        {/* Saldo Cash per User */}
        {cashSaldoEntries.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div className="section-title" style={{ margin: 0 }}>Saldo Cash per User</div>
              <span
                className="badge badge-blue"
                style={{ cursor: 'pointer', fontSize: 11 }}
                onClick={() => router.push('/cashrecord')}
              >TARIK TUNAI – PENGELUARAN</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cashSaldoEntries.map(([uid, saldo]) => {
                const tarik   = s.tarikTunaiByUser?.[uid] || 0
                const terpakai = s.expensesCashByUser?.[uid] || 0
                const pct     = tarik > 0 ? Math.max(0, Math.min(100, Math.round((saldo / tarik) * 100))) : 0
                const name    = getUserName(uid)
                const initial = name?.charAt(0)?.toUpperCase() || '?'
                const isNeg   = saldo < 0

                const USER_COLORS = {
                  s: { bg: '#3b82f6', text: '#fff' },
                  a: { bg: '#8b5cf6', text: '#fff' },
                  default: { bg: 'var(--accent)', text: '#fff' },
                }
                const colorKey = initial.toLowerCase()
                const userColor = USER_COLORS[colorKey] || USER_COLORS.default

                return (
                  <div key={uid} style={{
                    background: 'var(--surface2)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px 16px',
                    border: '1px solid var(--border)',
                  }}>
                    {/* Header row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 10,
                          background: userColor.bg, color: userColor.text,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, fontWeight: 800,
                        }}>{initial}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                            {activePeriod ? activePeriod.label : 'Semua Periode'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push('/cashrecord')}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 12, color: 'var(--accent)', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        ▶ riwayat
                      </button>
                    </div>

                    {/* Rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
                          <span style={{ fontSize: 16 }}>🏧</span> Tarik Tunai
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent)' }}>{fmt(tarik)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
                          <span style={{ fontSize: 16 }}>💸</span> Terpakai
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--red)' }}>{fmt(terpakai)}</span>
                      </div>
                      <div style={{ height: 1, background: 'var(--border)' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
                          <span style={{ fontSize: 16 }}>✅</span> Sisa Cash
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 15, color: isNeg ? 'var(--red)' : 'var(--green)' }}>{fmt(saldo)}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>Sisa cash</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isNeg ? 'var(--red)' : 'var(--green)' }}>
                        {isNeg ? '-' : ''}{Math.abs(pct)}% tersisa
                      </span>
                    </div>
                    <div className="progress-wrap">
                      <div
                        className="progress-bar"
                        style={{
                          width: `${Math.abs(pct)}%`,
                          background: isNeg ? 'var(--red)' : `linear-gradient(90deg, var(--accent), var(--green))`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Cash vs QRIS vs Transfer per Bulan */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="section-title" style={{ margin: 0 }}>Cash vs QRIS vs Transfer</div>
            <span className="badge badge-blue" style={{ fontSize: 11 }}>PER BULAN</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {metodeByBulan.map(({ bulan, cash, qris, transfer }) => {
              const total = cash + qris + transfer
              if (total === 0) return null
              return (
                <div key={bulan}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{bulan}</div>
                  {[
                    { label: 'Cash',     val: cash,     color: 'var(--yellow)' },
                    { label: 'QRIS',     val: qris,     color: 'var(--green)' },
                    { label: 'Transfer', val: transfer,  color: 'var(--accent)' },
                  ].map(({ label, val, color }) => {
                    const pct = total > 0 ? Math.round(val / total * 100) : 0
                    return (
                      <div key={label} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>
                            {fmt(val)} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({pct}%)</span>
                          </span>
                        </div>
                        <div className="progress-wrap">
                          <div className="progress-bar" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
            {metodeByBulan.every(m => m.cash + m.qris + m.transfer === 0) && (
              <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 16 }}>Belum ada data</div>
            )}
          </div>
        </div>

      </div>
    </>
  )
}
