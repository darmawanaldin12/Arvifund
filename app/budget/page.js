'use client'
import { useState, useMemo } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { useToast } from '../../hooks/useToast'
import { fmt, KATEGORI_LIST, BULAN_ORDER, filterByPeriod } from '../../lib/utils'
import { upsertBudgetPlan } from '../../lib/data'
import KategoriIcon from '../../components/ui/KategoriIcon'

export default function BudgetPage() {
  const {
    budgetPlans, expenses, loadData, loading, user,
    periods, periodIdx, setPeriodIdx, payPeriodDate, overrides,
  } = useData()
  const { showToast, ToastContainer } = useToast()

  const [editKat, setEditKat]   = useState(null)
  const [editVal, setEditVal]   = useState('')
  const [saving, setSaving]     = useState(false)

  // periodIdx === '' → chip "Semua" (sama seperti halaman Transaksi & Dashboard)
  const isAll     = periodIdx === ''
  const activeIdx = isAll ? null : parseInt(periodIdx)
  const period    = isAll ? null : (periods[activeIdx] || periods[0])

  // Tabel budget_plans menyimpan bulan + tahun, jadi periode dipetakan ke bulan
  // di tanggal AKHIR periode (mis. 24 Sep – 23 Okt → "Oktober"), karena mayoritas
  // harinya jatuh di bulan tersebut.
  const selBulan = period ? BULAN_ORDER[period.end.getMonth()] : null
  const selTahun = period ? period.end.getFullYear() : null

  const budgetMap = useMemo(() => {
    const m = {}
    if (isAll) {
      // Mode "Semua": jumlahkan alokasi seluruh periode per kategori
      budgetPlans.forEach(p => {
        m[p.kategori] = { ...p, alokasi: (m[p.kategori]?.alokasi || 0) + (p.alokasi || 0) }
      })
    } else {
      budgetPlans.filter(p => p.bulan === selBulan && p.tahun === selTahun)
        .forEach(p => { m[p.kategori] = p })
    }
    return m
  }, [budgetPlans, isAll, selBulan, selTahun])

  // Realisasi dihitung berdasarkan rentang tanggal periode (sama seperti halaman lain)
  const realisasiMap = useMemo(() => {
    const m = {}
    const rows = isAll ? expenses : filterByPeriod(expenses, activeIdx, payPeriodDate, overrides)
    rows.forEach(r => { m[r.kategori] = (m[r.kategori] || 0) + (r.nilai || 0) })
    return m
  }, [expenses, isAll, activeIdx, payPeriodDate, overrides])

  const totalAlokasi   = Object.values(budgetMap).reduce((s, p) => s + (p.alokasi || 0), 0)
  const totalRealisasi = Object.values(realisasiMap).reduce((s, v) => s + v, 0)

  async function handleSave(kategori) {
    if (isAll) return
    const alokasi = parseFloat(editVal)
    if (isNaN(alokasi) || alokasi < 0) { showToast('❌ Nilai tidak valid', 'error'); return }
    setSaving(true)
    try {
      await upsertBudgetPlan({ kategori, bulan: selBulan, tahun: selTahun, alokasi, user_id: user?.id }, user?.id)
      showToast('✅ Budget disimpan')
      setEditKat(null)
      await loadData()
    } catch (err) {
      showToast('❌ Gagal: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const katList = KATEGORI_LIST.filter(k => k !== 'Pemasukan')

  return (
    <>
      <AppHeader title="Budget Plan" onRefresh={loadData} loading={loading} />
      <div className="page-container">

        {/* ── Period Filter (sama seperti halaman Transaksi) ── */}
        <div className="filter-bar" style={{ marginBottom: 12 }}>
          <div
            className={`filter-chip${isAll ? ' active' : ''}`}
            onClick={() => { setPeriodIdx(''); setEditKat(null) }}
          >
            Semua
          </div>
          {periods.map((p, i) => (
            <div
              key={i}
              className={`filter-chip${periodIdx === String(i) ? ' active' : ''}`}
              onClick={() => { setPeriodIdx(String(i)); setEditKat(null) }}
            >
              {p.label}
            </div>
          ))}
        </div>

        {isAll && (
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
            Menampilkan total semua periode. Pilih satu periode untuk mengatur budget.
          </div>
        )}

        {/* Summary */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Total Alokasi</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>{fmt(totalAlokasi)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Realisasi</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)' }}>{fmt(totalRealisasi)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Sisa</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: totalAlokasi - totalRealisasi >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {fmt(totalAlokasi - totalRealisasi)}
              </div>
            </div>
          </div>
          {totalAlokasi > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="progress-wrap">
                <div
                  className={`progress-bar ${totalRealisasi / totalAlokasi >= 1 ? 'danger' : totalRealisasi / totalAlokasi >= 0.8 ? 'warn' : 'ok'}`}
                  style={{ width: `${Math.min(totalRealisasi / totalAlokasi * 100, 100)}%` }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                {Math.round(totalRealisasi / totalAlokasi * 100)}% terpakai dari {fmt(totalAlokasi)}
              </div>
            </div>
          )}
        </div>

        {/* Tabel per Kategori */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {katList.map(kat => {
            const budget    = budgetMap[kat]
            const alokasi   = budget?.alokasi || 0
            const realisasi = realisasiMap[kat] || 0
            const pct       = alokasi > 0 ? Math.min(Math.round(realisasi / alokasi * 100), 100) : 0
            const sisa      = alokasi - realisasi
            const isEdit    = editKat === kat

            return (
              <div key={kat} className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  {/* Kategori label dengan Lucide icon */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <KategoriIcon kategori={kat} size={18} />
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{kat}</span>
                  </div>
                  {!isAll && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setEditKat(isEdit ? null : kat); setEditVal(alokasi || '') }}
                    >
                      {isEdit ? 'Batal' : alokasi > 0 ? 'Edit' : '+ Set'}
                    </button>
                  )}
                </div>

                {isEdit && !isAll && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      className="form-input"
                      type="number"
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      placeholder="Nominal alokasi"
                      inputMode="numeric"
                      style={{ flex: 1 }}
                      autoFocus
                    />
                    <button className="btn btn-primary" onClick={() => handleSave(kat)} disabled={saving} style={{ flexShrink: 0 }}>
                      {saving ? '...' : 'Simpan'}
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>Realisasi</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>{fmt(realisasi)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>Alokasi</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: alokasi > 0 ? 'var(--text1)' : 'var(--text3)' }}>
                      {alokasi > 0 ? fmt(alokasi) : '— belum diset'}
                    </div>
                  </div>
                </div>

                {alokasi > 0 && (
                  <>
                    <div className="progress-wrap">
                      <div className={`progress-bar ${pct >= 100 ? 'danger' : pct >= 80 ? 'warn' : 'ok'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: pct >= 100 ? 'var(--red)' : 'var(--text3)' }}>
                        {pct}% terpakai{pct >= 100 ? ' ⚠ over' : ''}
                      </span>
                      <span style={{ fontSize: 11, color: sisa >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                        Sisa {fmt(Math.abs(sisa))}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

      </div>
      <ToastContainer />
    </>
  )
}
