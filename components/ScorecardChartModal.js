'use client'
import { useEffect, useState, useRef } from 'react'
import { ChartBulanIni, ChartRataHarian, ChartProyeksi, ChartSisaBudget, RED, ACCENT, YELLOW, GREEN } from './ScorecardCharts'

function useMount(open) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (open) { requestAnimationFrame(() => setMounted(true)) }
    else { const t = setTimeout(() => setMounted(false), 300); return () => clearTimeout(t) }
  }, [open])
  return mounted
}

const CONFIGS = {
  bulanIni:   { title: 'Pengeluaran Bulan Ini',   subtitle: 'Per hari — tabel expenses',                icon: 'calendar_today',  color: RED    },
  rataHarian: { title: 'Rata-rata Harian',         subtitle: '12 bulan terakhir — tabel expenses',     icon: 'query_stats',     color: YELLOW },
  proyeksi:   { title: 'Proyeksi Akhir Bulan',     subtitle: '6 bulan: actual vs proyeksi vs budget',   icon: 'insights',        color: ACCENT },
  sisaBudget: { title: 'Sisa Budget per Kategori', subtitle: 'Bulan ini: alokasi vs realisasi',         icon: 'account_balance', color: GREEN  },
}

export default function ScorecardChartModal({ open, onClose, type, filteredExpenses = [], expenses = [], budgetPlans = [] }) {
  const mounted    = useMount(open)
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open && !mounted) return null

  const cfg       = CONFIGS[type] || CONFIGS.bulanIni
  const isVisible = open && mounted

  const renderChart = () => {
    if (type === 'bulanIni')   return <ChartBulanIni   filteredExpenses={filteredExpenses} />
    if (type === 'rataHarian') return <ChartRataHarian expenses={expenses} />
    if (type === 'proyeksi')   return <ChartProyeksi   expenses={expenses} budgetPlans={budgetPlans} />
    if (type === 'sisaBudget') return <ChartSisaBudget filteredExpenses={filteredExpenses} budgetPlans={budgetPlans} />
    return null
  }

  return (
    <div ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(2px)', opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none', transition: 'opacity 0.25s ease' }}>
      <div style={{ width: '100%', maxWidth: 560, margin: '0 auto', background: 'var(--surface)', borderRadius: '20px 20px 0 0', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -4px 32px rgba(0,0,0,0.18)', transform: isVisible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '12px auto 4px', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: cfg.color, fontVariationSettings: "'FILL' 1" }}>{cfg.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>{cfg.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{cfg.subtitle}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--border)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text3)', flexShrink: 0, padding: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {renderChart()}
        </div>
      </div>
    </div>
  )
}
