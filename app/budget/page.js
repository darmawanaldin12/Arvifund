'use client'
import { useState, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { useToast } from '../../hooks/useToast'
import { fmt, fmtFull, fmtTanggalShort, BULAN_ORDER, filterByPeriod } from '../../lib/utils'
import { normalizeKategori, KATEGORI_EXPENSE } from '../../lib/kategori'
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
  const [openKat, setOpenKat]   = useState(null) // kategori yang rincian pengeluarannya sedang dibuka

  // periodIdx === '' → chip "Semua" (sama seperti halaman Transaksi & Dashboard)
  const isAll     = periodIdx === ''
  const activeIdx = isAll ? null : parseInt(periodIdx)
  const period    = isAll ? null : (periods[activeIdx] || periods[0])

  // Tabel budget_plans menyimpan bulan + tahun, jadi periode dipetakan ke bulan
  // di tanggal AKHIR periode (mis. 24 Sep – 23 Okt → "Oktober"), karena mayoritas
  // harinya jatuh di bulan tersebut.
  const selBulan = period ? BULAN_ORDER[period.end.getMonth()] : null
  const selTahun = period ? period.end.getFullYear() : null

  // Kategori budget = patokan. Nama kategori yang tidak dikenal digabung ke "Lainnya"
  // supaya total di atas selalu sama dengan jumlah semua kartu kategori.
  const budgetMap = useMemo(() => {
    const m = {}
    const rows = isAll ? budgetPlans : budgetPlans.filter(p => p.bulan === selBulan && p.tahun === selTahun)
    rows.forEach(p => {
      const k = normalizeKategori(p.kategori)
      m[k] = { ...p, kategori: k, alokasi: (m[k]?.alokasi || 0) + (p.alokasi || 0) }
    })
    return m
  }, [budgetPlans, isAll, selBulan, selTahun])

  // Pengeluaran pada periode terpilih, dikelompokkan per kategori (terbaru di atas)
  const rowsByKategori = useMemo(() => {
    const rows = isAll ? expenses : filterByPeriod(expenses, activeIdx, payPeriodDate, overrides)
    const g = {}
    rows.forEach(r => { const k = normalizeKategori(r.kategori); (g[k] = g[k] || []).push(r) })
    Object.values(g).forEach(list => list.sort((a, b) => {
      const dc = (b.tanggal || '').localeCompare(a.tanggal || '')
      return dc !== 0 ? dc : (b.created_at || '').localeCompare(a.created_at || '')
    }))
    return g
  }, [expenses, isAll, activeIdx, payPeriodDate, overrides])

  // Realisasi per kategori = jumlah dari rincian di atas
  const realisasiMap = useMemo(() => {
    const m = {}
    Object.entries(rowsByKategori).forEach(([kat, list]) => {
      m[kat] = list.reduce((s, r) => s + (r.nilai || 0), 0)
    })
    return m
  }, [rowsByKategori])

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

  const katList = KATEGORI_EXPENSE

  return (
    <>
      <AppHeader title="Budget Plan" onRefresh={loadData} loading={loading} />
      <div className="page-container">

        {/* ── Period Filter (sama seperti halaman Transaksi) ── */}
        <div className="filter-bar" style={{ marginBottom: 12 }}>
          <div
            className={`filter-chip${isAll ? ' active' : ''}`}
            onClick={() => { setPeriodIdx(''); setEditKat(null); setOpenKat(null) }}
          >
            Semua
          </div>
          {periods.map((p, i) => (
            <div
              key={i}
              className={`filter-chip${periodIdx === String(i) ? ' active' : ''}`}
              onClick={() => { setPeriodIdx(String(i)); setEditKat(null); setOpenKat(null) }}
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
            const isOpen    = openKat === kat
            const rincian   = rowsByKategori[kat] || []

            return (
              <div key={kat} className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  {/* Ketuk nama kategori untuk melihat rincian pengeluaran */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onClick={() => setOpenKat(isOpen ? null : kat)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenKat(isOpen ? null : kat) } }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1, minWidth: 0 }}
                  >
                    <KategoriIcon kategori={kat} size={18} />
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{kat}</span>
                    <ChevronDown
                      size={16}
                      aria-hidden="true"
                      style={{ color: 'var(--text3)', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}
                    />
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

                {/* Rincian pengeluaran kategori ini pada periode terpilih */}
                {isOpen && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border, rgba(255,255,255,0.08))' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
                      {rincian.length} transaksi
                    </div>
                    {rincian.length === 0 ? (
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>Belum ada pengeluaran di periode ini</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
                        {rincian.map(r => (
                          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700 }}>{r.toko || 'Pengeluaran'}</div>
                              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                                {fmtTanggalShort(r.tanggal)}
                                {r.uraian ? ` · ${r.uraian}` : ''}
                                {r.transaksi ? ` · ${r.transaksi}` : ''}
                              </div>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', flexShrink: 0 }}>
                              {fmtFull(r.nilai)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
