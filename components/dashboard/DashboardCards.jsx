'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { AlertTriangle, CalendarDays, BarChart2, Lightbulb, Landmark, ChevronDown } from 'lucide-react'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import KategoriIcon from '../ui/KategoriIcon'
import { fmt, fmtFull, fmtTanggalShort, KATEGORI_COLOR, getLocalDateStr } from '../../lib/utils'
import { cn } from '../../lib/utils-cn'

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
              <div className={`scorecard-value ${item.cls}`}>{item.value}</div>
              <div className="scorecard-hint">tap untuk grafik</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

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
          <div className="weekly-amount">{fmt(weeklyTotal)}</div>
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

export function UserSpendingCard({ userSplit }) {
  return (
    <div className="bento-4">
      <div className="dash-card">
        <div className="dash-card-header">Pengeluaran per Anggota</div>
        {userSplit.length === 0 ? <p className="dash-empty">Belum ada data</p> : (
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

export function Top5KategoriCard({ top5, totalExpenses }) {
  return (
    <div className="bento-4">
      <Link href="/expenses" className="no-underline block">
        <div className="dash-card dash-card-link">
          <div className="dash-card-header">Top 5 Kategori</div>
          <div className="progress-list">
            {top5.length === 0 ? <p className="dash-empty">Belum ada data</p> : top5.map(([kat, val]) => {
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
        </div>
      </Link>
    </div>
  )
}

export function BudgetCard({ budgetVsReal }) {
  const items = (budgetVsReal || []).filter(b => b.alokasi > 0).slice(0, 5)
  return (
    <div className="bento-4">
      <Link href="/budget" className="no-underline block">
        <div className="dash-card dash-card-link">
          <div className="dash-card-header">Budget vs Realisasi</div>
          {items.length === 0 ? <p className="dash-empty">Belum ada budget plan</p> : (
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
          <div className="dash-empty-center">
            <div className="dash-empty-icon">✅</div>
            <p>Tidak ada anomali</p>
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

export function RecentTransactionsCard({ recent, getUserName }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bento-12">
      <div className="dash-card dash-card-flush">
        <div
          className="dash-table-header"
          onClick={() => setOpen(o => !o)}
          role="button"
          tabIndex={0}
          aria-expanded={open}
        >
          <span className="dash-card-header mb-0">10 Transaksi Terakhir</span>
          <div className="dash-table-header-actions">
            <Link href="/expenses" className="dash-see-all" onClick={(e) => e.stopPropagation()}>Lihat semua ↗</Link>
            <ChevronDown size={16} className={cn('anomali-chevron', open && 'open')} />
          </div>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tanggal</th><th>Deskripsi</th><th>Kategori</th><th>User</th>
                      <th style={{ textAlign: 'right' }}>Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-[var(--text3)]">Belum ada transaksi</td></tr>
                    ) : recent.map(r => (
                      <tr key={r.id}>
                        <td className="whitespace-nowrap text-[var(--text3)] text-[12px] tabular-nums">{fmtTanggalShort(r.tanggal)}</td>
                        <td>
                          <div className="font-semibold text-[13px]">{r.toko || '—'}</div>
                          {r.uraian && <div className="text-[11px] text-[var(--text3)]">{r.uraian}</div>}
                        </td>
                        <td>
                          <Badge variant="secondary" className="text-[11px] bg-[var(--surface2)] text-[var(--text2)] border-0 gap-1.5">
                            <KategoriIcon kategori={r.kategori} size={12} />{r.kategori}
                          </Badge>
                        </td>
                        <td>
                          <span className={`user-chip ${getUserName(r.user_id)?.toLowerCase()}`}>{getUserName(r.user_id)}</span>
                        </td>
                        <td className="amount text-[var(--red)]">{fmt(r.nilai)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
