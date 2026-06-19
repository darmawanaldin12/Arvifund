'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { AlertTriangle, CalendarDays, BarChart2, Lightbulb, Landmark, ChevronDown,
  TrendingDown, TrendingUp, ArrowLeftRight, X, Clock } from 'lucide-react'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import KategoriIcon from '../ui/KategoriIcon'
import EmptyState from '../ui/EmptyState'
import { fmt, fmtFull, fmtTanggalShort, KATEGORI_COLOR, getLocalDateStr, parseTanggal } from '../../lib/utils'
import { cn } from '../../lib/utils-cn'
import { AnimatedAmount } from '../../hooks/useCountUp'

/* ── ScorecardCard ─────────────────────────────────────── */
export function ScorecardCard({ items, onItemClick }) {
  return (
    <div className="bento-4">
      <div className="dash-card">
        <div className="dash-card-header">Pengeluaran Bulan Ini</div>
        <div className="scorecard-grid">
          {items.map((item, i) => (
            <button key={i} onClick={() => onItemClick(item.modalType)}
              className={cn('scorecard-item', 'scorecard-item-btn')}
              aria-label={`${item.label}: ${item.value}, tap untuk grafik`}>
              <div className="scorecard-item-icon"><item.Icon size={18} /></div>
              <div className="scorecard-label">{item.label}</div>
              <div className={`scorecard-value ${item.cls}`}>
                {item.rawValue !== undefined
                  ? <AnimatedAmount value={item.rawValue} formatter={fmt} duration={600} />
                  : item.value}
              </div>
              <div className="scorecard-hint">tap untuk grafik</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── WeeklySummaryCard ─────────────────────────────────── */
export function WeeklySummaryCard({ weekStart, weekEnd, weeklyTotal, filteredExpenses, now }) {
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
  const dayTotals = [0,1,2,3,4,5,6].map(d => {
    const day = new Date(weekStart); day.setDate(weekStart.getDate() + d)
    const key = getLocalDateStr(day)
    return { key, day, val: filteredExpenses.filter(r => r.tanggal?.startsWith(key)).reduce((s,r) => s+r.nilai, 0) }
  })
  const maxDay = Math.max(...dayTotals.map(d => d.val), 1)
  return (
    <div className="bento-4">
      <Link href="/expenses" className="no-underline block h-full">
        <div className="dash-card dash-card-link">
          <div className="dash-card-header-row">
            <span className="dash-card-header">Ringkasan Mingguan</span>
            <span className="dash-badge-live">LIVE</span>
          </div>
          <div className="weekly-amount">
            <AnimatedAmount value={weeklyTotal} formatter={fmt} duration={600} />
          </div>
          <div className="weekly-range">
            {weekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – {weekEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          </div>
          <div className="weekly-bars">
            {dayTotals.map((d, i) => {
              const pct = (d.val / maxDay) * 100
              const isToday = getLocalDateStr(d.day) === getLocalDateStr(now)
              return (
                <div key={i} className="weekly-bar-col">
                  <div className="weekly-bar-fill" style={{
                    height: `${Math.max(pct, 6)}%`,
                    background: isToday ? 'var(--accent)' : pct > 70 ? 'var(--red)' : 'var(--surface3)',
                  }} />
                  <div className={cn('weekly-bar-label', isToday && 'today')}>{days[i]}</div>
                </div>
              )
            })}
          </div>
        </div>
      </Link>
    </div>
  )
}

/* ── UserSpendingCard ──────────────────────────────────── */
export function UserSpendingCard({ userSplit }) {
  return (
    <div className="bento-4">
      <div className="dash-card">
        <div className="dash-card-header">Pengeluaran per Anggota</div>
        {userSplit.length === 0
          ? <EmptyState variant="dashboard-transfer" size="sm" />
          : (
            <div className="progress-list">
              {userSplit.map(u => (
                <div key={u.name} className="progress-row">
                  <div className="progress-row-top">
                    <span className="progress-label">{u.name}</span>
                    <span className="progress-pct">{u.pct}%</span>
                  </div>
                  <Progress value={u.pct} className="h-2 bg-[var(--surface2)]"
                    indicatorClassName={u.name === 'Aldin' ? 'bg-[var(--accent)]' : 'bg-[#db2777]'} />
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}

/* ── Top5KategoriCard ──────────────────────────────────── */
export function Top5KategoriCard({ top5, totalExpenses }) {
  return (
    <div className="bento-4">
      <Link href="/expenses" className="no-underline block">
        <div className="dash-card dash-card-link">
          <div className="dash-card-header">Top 5 Kategori</div>
          {top5.length === 0
            ? <EmptyState variant="dashboard-kategori" size="sm" />
            : (
              <div className="progress-list">
                {top5.map(([kat, val]) => {
                  const pct   = totalExpenses > 0 ? Math.round(val / totalExpenses * 100) : 0
                  const color = KATEGORI_COLOR[kat] || 'var(--accent)'
                  return (
                    <div key={kat} className="progress-row">
                      <div className="progress-row-top">
                        <span className="progress-row-kat">
                          <KategoriIcon kategori={kat} size={16} />
                          <span className="progress-label">{kat}</span>
                        </span>
                        <span className="progress-pct">
                          {fmt(val)}<span className="progress-pct-sub"> ({pct}%)</span>
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5 bg-[var(--surface2)]" style={{ '--progress-color': color }} />
                    </div>
                  )
                })}
              </div>
            )}
        </div>
      </Link>
    </div>
  )
}

/* ── BudgetCard ────────────────────────────────────────── */
export function BudgetCard({ budgetVsReal }) {
  const items = (budgetVsReal || []).filter(b => b.alokasi > 0).slice(0, 5)
  return (
    <div className="bento-4">
      <Link href="/budget" className="no-underline block">
        <div className="dash-card dash-card-link">
          <div className="dash-card-header">Budget vs Realisasi</div>
          {items.length === 0
            ? <EmptyState variant="dashboard-budget" size="sm" />
            : (
              <div className="progress-list">
                {items.map(b => (
                  <div key={b.kategori} className="progress-row">
                    <div className="progress-row-top">
                      <span className="progress-label">{b.kategori}</span>
                      <span className={cn('progress-pct', b.pct >= 100 ? 'danger' : b.pct >= 80 ? 'warn' : 'ok')}>{b.pct}%</span>
                    </div>
                    <Progress value={Math.min(b.pct, 100)} className="h-2 bg-[var(--surface2)]"
                      indicatorClassName={b.pct >= 100 ? 'bg-[var(--red)]' : b.pct >= 80 ? 'bg-[var(--yellow)]' : 'bg-[var(--green)]'} />
                  </div>
                ))}
              </div>
            )}
        </div>
      </Link>
    </div>
  )
}

/* ── AnomaliCard ───────────────────────────────────────── */
export function AnomaliCard({ anomali }) {
  const [open, setOpen] = useState(false)
  const hasItems = anomali.length > 0
  return (
    <div className="bento-4">
      <div
        className={cn('dash-card', hasItems && 'dash-card-link')}
        onClick={() => hasItems && setOpen(o => !o)}
        role={hasItems ? 'button' : undefined}
        tabIndex={hasItems ? 0 : undefined}
        aria-expanded={hasItems ? open : undefined}
      >
        <div className="dash-card-header-row">
          <span className="dash-card-header dash-card-header-danger mb-0">
            <AlertTriangle size={15} /> Transaksi Anomali
          </span>
          {hasItems && (
            <ChevronDown size={16} className={cn('anomali-chevron', open && 'open')} />
          )}
        </div>

        {!hasItems ? (
          <div style={{ padding: '8px 0' }}>
            <EmptyState
              variant="dashboard-transfer"
              title="Semua transaksi normal"
              desc="Tidak ada transaksi yang nilainya jauh di atas rata-rata."
              cta="Lihat semua transaksi"
              href="/expenses"
              size="sm"
            />
          </div>
        ) : (
          <>
            <p className="anomali-summary">
              {anomali.length} transaksi nilainya jauh di atas rata-rata
            </p>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="anomali-list">
                    {anomali.map(r => (
                      <div key={r.id} className="anomali-item">
                        <AlertTriangle size={18} className="anomali-icon" />
                        <div className="anomali-info">
                          <div className="anomali-toko">{r.toko || '-'}</div>
                          <div className="anomali-uraian">{r.uraian || fmtTanggalShort(r.tanggal)}</div>
                        </div>
                        <span className="anomali-nilai">{fmt(r.nilai)}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}

/* ── tipe config ───────────────────────────────────────── */
const TIPE_CONFIG = {
  expense:  { label: 'Pengeluaran', color: 'var(--red)',    bg: 'rgba(248,113,113,0.12)', Icon: TrendingDown },
  income:   { label: 'Pemasukan',   color: 'var(--green)',  bg: 'rgba(52,211,153,0.12)',  Icon: TrendingUp   },
  transfer: { label: 'Transfer',    color: 'var(--accent)', bg: 'rgba(59,130,246,0.12)',  Icon: ArrowLeftRight },
  cash:     { label: 'Tarik Tunai', color: 'var(--yellow)', bg: 'rgba(234,179,8,0.12)',   Icon: Landmark     },
}

/* ── RecentTransactionsModal ───────────────────────────── */
function RecentTransactionsModal({ rows, onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 1200,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 32, stiffness: 350 }}
          style={{
            background: 'var(--surface)', borderRadius: '20px 20px 0 0',
            width: '100%', maxWidth: 560, maxHeight: '88dvh',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px 20px 12px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color="var(--accent)" />
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)' }}>10 Transaksi Terakhir</span>
            </div>
            <button onClick={onClose} style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, cursor: 'pointer', color: 'var(--text2)',
              padding: '4px 6px', display: 'flex', alignItems: 'center',
            }}><X size={16} /></button>
          </div>

          {/* Legend */}
          <div style={{ padding: '10px 16px 8px', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
            {Object.entries(TIPE_CONFIG).map(([key, cfg]) => (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 20,
                background: cfg.bg, fontSize: 11, fontWeight: 700, color: cfg.color,
              }}>
                <cfg.Icon size={11} /> {cfg.label}
              </div>
            ))}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px 16px 32px' }}>
            {rows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>Belum ada transaksi</div>
            ) : rows.map((r, i) => {
              const cfg = TIPE_CONFIG[r.tipe] || TIPE_CONFIG.expense
              const Ic  = cfg.Icon
              return (
                <div key={r.id + i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0', borderBottom: '1px solid var(--border)',
                }}>
                  {/* Icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ic size={16} color={cfg.color} />
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span>{fmtTanggalShort(r.tanggal)}</span>
                      {r.sub && <><span>·</span><span>{r.sub}</span></>}
                      <span style={{
                        padding: '1px 6px', borderRadius: 10,
                        background: cfg.bg, color: cfg.color,
                        fontSize: 10, fontWeight: 700,
                      }}>{cfg.label}</span>
                    </div>
                  </div>
                  {/* Amount */}
                  <div style={{ fontSize: 14, fontWeight: 800, color: cfg.color, flexShrink: 0 }}>
                    {r.tipe === 'income' || (r.tipe === 'cash' && r.sign === '+') ? '+' : '-'}{fmtFull(r.amount)}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ── RecentTransactionsCard ────────────────────────────── */
export function RecentTransactionsCard({ expenses, income, cashRecords, transfers, getUserName }) {
  const [open, setOpen] = useState(false)

  const rows = useMemo(() => {
    const all = []

    ;(expenses || []).forEach(r => all.push({
      id: 'exp_' + r.id, tipe: 'expense', tanggal: r.tanggal,
      label: r.toko || 'Pengeluaran',
      sub: r.uraian || r.kategori || '',
      amount: r.nilai, user: getUserName(r.user_id),
    }))

    ;(income || []).forEach(r => all.push({
      id: 'inc_' + r.id, tipe: 'income', tanggal: r.tanggal,
      label: r.sumber || 'Pemasukan',
      sub: r.items || r.kategori || '',
      amount: r.jumlah, user: getUserName(r.user_id),
    }))

    ;(cashRecords || []).forEach(r => all.push({
      id: 'csh_' + r.id, tipe: 'cash', tanggal: r.tanggal,
      label: r.transaksi || 'Tarik Tunai',
      sub: `dari ${r.bank}`,
      amount: r.nilai, user: getUserName(r.user_id),
    }))

    ;(transfers || []).forEach(r => all.push({
      id: 'trx_' + r.id, tipe: 'transfer', tanggal: r.tanggal,
      label: `${getUserName(r.from_user)} → ${getUserName(r.to_user)}`,
      sub: r.catatan || `${r.from_bank} → ${r.to_bank}`,
      amount: r.jumlah, user: getUserName(r.from_user),
    }))

    return all
      .sort((a, b) => (parseTanggal(b.tanggal)?.getTime() || 0) - (parseTanggal(a.tanggal)?.getTime() || 0))
      .slice(0, 10)
  }, [expenses, income, cashRecords, transfers, getUserName])

  // Preview: 3 transaksi terakhir untuk card
  const preview = rows.slice(0, 3)

  return (
    <>
      {open && <RecentTransactionsModal rows={rows} onClose={() => setOpen(false)} />}
      <div className="bento-12">
        <div
          className="dash-card dash-card-link"
          onClick={() => setOpen(true)}
          role="button" tabIndex={0}
          aria-label="Lihat 10 transaksi terakhir"
        >
          <div className="dash-card-header-row">
            <span className="dash-card-header mb-0" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} color="var(--accent)" /> 10 Transaksi Terakhir
            </span>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>Tap untuk detail ↗</span>
          </div>

          {/* Preview 3 transaksi */}
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {preview.map((r, i) => {
              const cfg = TIPE_CONFIG[r.tipe] || TIPE_CONFIG.expense
              const Ic  = cfg.Icon
              return (
                <div key={r.id + i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 8px', borderRadius: 8, background: 'var(--surface2)',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ic size={13} color={cfg.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{fmtTanggalShort(r.tanggal)}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: cfg.color, flexShrink: 0 }}>
                    {fmtFull(r.amount)}
                  </div>
                </div>
              )
            })}
            {rows.length > 3 && (
              <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', paddingTop: 2 }}>
                +{rows.length - 3} transaksi lainnya
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
