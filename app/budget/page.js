'use client'
import { useState, useMemo } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { useToast } from '../../hooks/useToast'
import { fmt, fmtFull, KATEGORI_LIST, BULAN_ORDER } from '../../lib/utils'
import { upsertBudgetPlan } from '../../lib/data'
import AppSelect from '../../components/ui/AppSelect'

export default function BudgetPage() {
  const { budgetPlans, expenses, loadData, loading, user } = useData()
  const { showToast, ToastContainer } = useToast()

  const now = new Date()
  const [selBulan, setSelBulan] = useState(BULAN_ORDER[now.getMonth()])
  const [selTahun, setSelTahun] = useState(now.getFullYear())
  const [editKat, setEditKat]   = useState(null)
  const [editVal, setEditVal]   = useState('')
  const [saving, setSaving]     = useState(false)

  const tahunList = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  // Ambil budget bulan ini
  const budgetMap = useMemo(() => {
    const m = {}
    budgetPlans.filter(p => p.bulan === selBulan && p.tahun === selTahun)
      .forEach(p => { m[p.kategori] = p })
    return m
  }, [budgetPlans, selBulan, selTahun])

  // Realisasi bulan ini
  const realisasiMap = useMemo(() => {
    const m = {}
    expenses.filter(r => r.bulan === selBulan && new Date(r.tanggal).getFullYear() === selTahun)
      .forEach(r => { m[r.kategori] = (m[r.kategori] || 0) + (r.nilai || 0) })
    return m
  }, [expenses, selBulan, selTahun])

  const totalAlokasi = Object.values(budgetMap).reduce((s, p) => s + (p.alokasi || 0), 0)
  const totalRealisasi = Object.values(realisasiMap).reduce((s, v) => s + v, 0)

  async function handleSave(kategori) {
    const alokasi = parseFloat(editVal)
    if (isNaN(alokasi) || alokasi < 0) { showToast('❌ Nilai tidak valid', 'error'); return }
    setSaving(true)
    try {
      await upsertBudgetPlan({
        kategori, bulan: selBulan, tahun: selTahun, alokasi,
        user_id: user?.id,
      }, user?.id)
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

        {/* Selector Bulan & Tahun */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <AppSelect
            value={selBulan}
            onChange={e => setSelBulan(e.target.value)}
            options={BULAN_ORDER}
            style={{ flex: 2 }}
          />
          <AppSelect
            value={String(selTahun)}
            onChange={e => setSelTahun(parseInt(e.target.value))}
            options={tahunList.map(y => ({ value: String(y), label: String(y) }))}
            style={{ flex: 1 }}
          />
        </div>

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
            const budget   = budgetMap[kat]
            const alokasi  = budget?.alokasi || 0
            const realisasi = realisasiMap[kat] || 0
            const pct      = alokasi > 0 ? Math.min(Math.round(realisasi / alokasi * 100), 100) : 0
            const sisa     = alokasi - realisasi
            const isEdit   = editKat === kat

            return (
              <div key={kat} className="card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{kat}</div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setEditKat(isEdit ? null : kat); setEditVal(alokasi || '') }}
                  >
                    {isEdit ? 'Batal' : alokasi > 0 ? 'Edit' : '+ Set'}
                  </button>
                </div>

                {isEdit ? (
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
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSave(kat)}
                      disabled={saving}
                      style={{ flexShrink: 0 }}
                    >
                      {saving ? '...' : 'Simpan'}
                    </button>
                  </div>
                ) : null}

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
                      <div className={`progress-bar ${pct >= 100 ? 'danger' : pct >= 80 ? 'warn' : 'ok'}`}
                        style={{ width: `${pct}%` }} />
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
