'use client'
import { useState } from 'react'
import { fmt, fmtFull, fmtTanggalShort, BULAN_ORDER, KATEGORI_ICON, KATEGORI_COLOR, buildPeriods, filterByPeriod, buildSummary } from '../lib/utils'
import { useData } from './DataContext'

export default function ExportPDF() {
  const { expenses, income, cashRecords, budgetPlans, profiles, payPeriodDate, overrides, getUserName } = useData()
  const [showModal, setShowModal] = useState(false)
  const [selPeriod, setSelPeriod] = useState('')
  const [generating, setGenerating] = useState(false)

  const periods = buildPeriods(payPeriodDate, overrides)
  const now = new Date()

  function getFilteredData() {
    if (selPeriod === '') {
      return { exp: expenses, inc: income, cash: cashRecords }
    }
    const idx = parseInt(selPeriod)
    const exp  = filterByPeriod(expenses,    idx, payPeriodDate, overrides)
    const inc  = filterByPeriod(income.map(r => ({ ...r, nilai: r.jumlah })), idx, payPeriodDate, overrides)
    const cash = filterByPeriod(cashRecords, idx, payPeriodDate, overrides)
    return { exp, inc: inc.map(r => ({ ...r })), cash }
  }

  function generateAndPrint() {
    setGenerating(true)
    const { exp, inc, cash } = getFilteredData()
    const s = buildSummary(exp, inc, cash, budgetPlans)
    const periodLabel = selPeriod !== '' && periods[parseInt(selPeriod)]
      ? periods[parseInt(selPeriod)].label : 'Semua Data'

    const top5 = Object.entries(s.byKategori)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)

    // Sort expenses by tanggal desc
    const sortedExp = [...exp].sort((a, b) =>
      (b.tanggal || '').localeCompare(a.tanggal || ''))
    const sortedInc = [...inc].sort((a, b) =>
      (b.tanggal || '').localeCompare(a.tanggal || ''))
    const sortedCash = [...cash].sort((a, b) =>
      (b.tanggal || '').localeCompare(a.tanggal || ''))

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width"/>
<title>Laporan Keuangan Arvifund - ${periodLabel}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #041b3c; background: white; }
  
  /* COVER */
  .cover { text-align: center; padding: 60px 40px; page-break-after: always; }
  .cover-logo { font-size: 48px; font-weight: 900; color: #003d9b; letter-spacing: -2px; margin-bottom: 8px; }
  .cover-sub { font-size: 16px; color: #737685; margin-bottom: 40px; }
  .cover-period { display: inline-block; background: #003d9b; color: white; padding: 10px 32px; border-radius: 24px; font-size: 14px; font-weight: 700; margin-bottom: 12px; }
  .cover-date { font-size: 11px; color: #737685; }
  .cover-line { width: 60px; height: 4px; background: #003d9b; margin: 32px auto; border-radius: 2px; }

  /* GENERAL */
  .page { padding: 32px 40px; }
  h1 { font-size: 18px; font-weight: 800; color: #003d9b; margin-bottom: 4px; }
  h2 { font-size: 13px; font-weight: 700; color: #434654; text-transform: uppercase; letter-spacing: 0.5px; margin: 24px 0 12px; border-bottom: 2px solid #003d9b; padding-bottom: 6px; }
  h3 { font-size: 11px; font-weight: 700; color: #434654; text-transform: uppercase; letter-spacing: 0.4px; margin: 16px 0 8px; }
  .report-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #c3c6d6; }
  .report-meta { font-size: 10px; color: #737685; text-align: right; line-height: 1.8; }

  /* KPI GRID */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 8px; }
  .kpi-card { background: #f9f9ff; border: 1px solid #c3c6d6; border-radius: 8px; padding: 14px; position: relative; overflow: hidden; }
  .kpi-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
  .kpi-card.income::before  { background: #1b6b3a; }
  .kpi-card.expense::before { background: #ba1a1a; }
  .kpi-card.saldo::before   { background: #003d9b; }
  .kpi-card.cash::before    { background: #5e3c00; }
  .kpi-label { font-size: 9px; font-weight: 700; color: #737685; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .kpi-value { font-size: 15px; font-weight: 800; }
  .kpi-value.green  { color: #1b6b3a; }
  .kpi-value.red    { color: #ba1a1a; }
  .kpi-value.blue   { color: #003d9b; }
  .kpi-value.yellow { color: #5e3c00; }
  .kpi-sub { font-size: 9px; color: #737685; margin-top: 3px; }

  /* TABLE */
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
  th { background: #003d9b; color: white; padding: 7px 10px; text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
  td { padding: 7px 10px; border-bottom: 1px solid #e8edff; vertical-align: middle; }
  tr:nth-child(even) td { background: #f9f9ff; }
  tr:last-child td { border-bottom: none; }
  .text-right { text-align: right; font-weight: 700; }
  .text-center { text-align: center; }
  .amount-red    { color: #ba1a1a; font-weight: 700; }
  .amount-green  { color: #1b6b3a; font-weight: 700; }
  .amount-yellow { color: #5e3c00; font-weight: 700; }

  /* BADGE */
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 700; }
  .badge-blue   { background: #dae2ff; color: #003d9b; }
  .badge-green  { background: #d6f5e3; color: #1b6b3a; }
  .badge-red    { background: #ffdad6; color: #ba1a1a; }
  .badge-gray   { background: #e8edff; color: #434654; }

  /* PROGRESS */
  .progress-row { margin-bottom: 10px; }
  .progress-label { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px; }
  .progress-bar-wrap { background: #e8edff; border-radius: 3px; height: 7px; }
  .progress-bar-fill { height: 100%; border-radius: 3px; }

  /* SUMMARY BOX */
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .summary-box { background: #f1f3ff; border: 1px solid #c3c6d6; border-radius: 8px; padding: 12px; }
  .summary-box-label { font-size: 9px; color: #737685; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
  .summary-box-value { font-size: 14px; font-weight: 800; color: #003d9b; }

  /* USER SPLIT */
  .user-chip { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 700; }
  .user-aldin      { background: #dae2ff; color: #003d9b; }
  .user-solikhatun { background: #fce7f3; color: #9d174d; }

  /* FOOTER */
  .footer { position: fixed; bottom: 24px; left: 40px; right: 40px; display: flex; justify-content: space-between; font-size: 9px; color: #737685; border-top: 1px solid #c3c6d6; padding-top: 8px; }

  /* PAGE BREAK */
  .page-break { page-break-before: always; }

  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .no-print { display: none; }
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div class="cover-logo">💰 Arvifund</div>
  <div class="cover-sub">Personal Finance Tracker</div>
  <div class="cover-line"></div>
  <div style="margin-bottom: 8px;">
    <div class="cover-period">📅 ${periodLabel}</div>
  </div>
  <div class="cover-date">Dicetak: ${now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
  <div style="margin-top: 60px; font-size: 10px; color: #737685;">
    ${profiles.map(p => p.username).join(' · ')}
  </div>
</div>

<!-- RINGKASAN HALAMAN -->
<div class="page">
  <div class="report-header">
    <div>
      <h1>Laporan Keuangan</h1>
      <div style="font-size: 11px; color: #737685; margin-top: 2px;">${periodLabel}</div>
    </div>
    <div class="report-meta">
      <div>Dicetak: ${now.toLocaleDateString('id-ID')}</div>
      <div>${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</div>
      <div>Arvifund v2.0</div>
    </div>
  </div>

  <h2>Ringkasan Keuangan</h2>
  <div class="kpi-grid">
    <div class="kpi-card income">
      <div class="kpi-label">Total Pemasukan</div>
      <div class="kpi-value green">${fmtFull(s.totalIncome)}</div>
      <div class="kpi-sub">${inc.length} transaksi</div>
    </div>
    <div class="kpi-card expense">
      <div class="kpi-label">Total Pengeluaran</div>
      <div class="kpi-value red">${fmtFull(s.totalExpenses)}</div>
      <div class="kpi-sub">${exp.length} transaksi</div>
    </div>
    <div class="kpi-card saldo">
      <div class="kpi-label">Saldo</div>
      <div class="kpi-value blue">${fmtFull(s.saldo)}</div>
      <div class="kpi-sub">income − pengeluaran</div>
    </div>
    <div class="kpi-card cash">
      <div class="kpi-label">Tarik Tunai</div>
      <div class="kpi-value yellow">${fmtFull(s.totalCash)}</div>
      <div class="kpi-sub">${cash.length} transaksi</div>
    </div>
  </div>

  <h2>Pengeluaran per Kategori</h2>
  ${top5.map(([kat, val]) => {
    const pct = s.totalExpenses > 0 ? Math.round(val / s.totalExpenses * 100) : 0
    const color = KATEGORI_COLOR[kat] || '#003d9b'
    return `<div class="progress-row">
      <div class="progress-label">
        <span>${KATEGORI_ICON[kat] || '📦'} ${kat}</span>
        <span><strong>${fmtFull(val)}</strong> (${pct}%)</span>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" style="width:${pct}%;background:${color};"></div>
      </div>
    </div>`
  }).join('')}

  ${s.budgetVsReal && s.budgetVsReal.filter(b => b.alokasi > 0).length > 0 ? `
  <h2>Budget vs Realisasi</h2>
  <table>
    <thead><tr>
      <th>Kategori</th>
      <th class="text-right">Alokasi</th>
      <th class="text-right">Realisasi</th>
      <th class="text-right">Sisa</th>
      <th class="text-center">%</th>
    </tr></thead>
    <tbody>
    ${s.budgetVsReal.filter(b => b.alokasi > 0).map(b => `
      <tr>
        <td>${KATEGORI_ICON[b.kategori] || ''} ${b.kategori}</td>
        <td class="text-right">${fmtFull(b.alokasi)}</td>
        <td class="text-right ${b.pct >= 100 ? 'amount-red' : ''}">${fmtFull(b.realisasi)}</td>
        <td class="text-right ${b.alokasi - b.realisasi < 0 ? 'amount-red' : 'amount-green'}">${fmtFull(Math.abs(b.alokasi - b.realisasi))}</td>
        <td class="text-center">
          <span class="badge ${b.pct >= 100 ? 'badge-red' : b.pct >= 80 ? 'badge-gray' : 'badge-green'}">${b.pct}%</span>
        </td>
      </tr>
    `).join('')}
    </tbody>
  </table>
  ` : ''}

  <!-- Pengeluaran per User -->
  ${Object.keys(s.byUser).length > 0 ? `
  <h2>Pengeluaran per User</h2>
  <div class="summary-grid">
    ${Object.entries(s.byUser).map(([uid, val]) => {
      const name = getUserName(uid)
      const pct = s.totalExpenses > 0 ? Math.round(val / s.totalExpenses * 100) : 0
      return `<div class="summary-box">
        <div class="summary-box-label">${name}</div>
        <div class="summary-box-value">${fmtFull(val)}</div>
        <div style="font-size:10px;color:#737685;margin-top:3px;">${pct}% dari total</div>
      </div>`
    }).join('')}
  </div>
  ` : ''}
</div>

<!-- HALAMAN DETAIL PENGELUARAN -->
${sortedExp.length > 0 ? `
<div class="page page-break">
  <div class="report-header">
    <div><h1>Detail Pengeluaran</h1><div style="font-size:11px;color:#737685;">${periodLabel} · ${sortedExp.length} transaksi</div></div>
    <div class="report-meta"><div>Total: <strong style="color:#ba1a1a;">${fmtFull(s.totalExpenses)}</strong></div></div>
  </div>
  <table>
    <thead><tr>
      <th>Tanggal</th>
      <th>Toko / Merchant</th>
      <th>Uraian</th>
      <th>Kategori</th>
      <th>Metode</th>
      <th>Bank</th>
      <th>User</th>
      <th class="text-right">Nilai</th>
    </tr></thead>
    <tbody>
    ${sortedExp.map(r => `
      <tr>
        <td style="white-space:nowrap;">${fmtTanggalShort(r.tanggal)}</td>
        <td>${r.toko || '—'}</td>
        <td style="color:#737685;font-size:9px;">${r.uraian || ''}</td>
        <td><span class="badge badge-gray">${KATEGORI_ICON[r.kategori] || ''} ${r.kategori || '—'}</span></td>
        <td>${r.transaksi || '—'}</td>
        <td>${r.bank || '—'}</td>
        <td><span class="user-chip ${getUserName(r.user_id)?.toLowerCase() === 'aldin' ? 'user-aldin' : 'user-solikhatun'}">${getUserName(r.user_id)}</span></td>
        <td class="text-right amount-red">${fmtFull(r.nilai)}</td>
      </tr>
    `).join('')}
    <tr style="background:#dae2ff;">
      <td colspan="7" style="font-weight:800;text-align:right;font-size:11px;">TOTAL</td>
      <td class="text-right amount-red" style="font-size:12px;">${fmtFull(s.totalExpenses)}</td>
    </tr>
    </tbody>
  </table>
</div>
` : ''}

<!-- HALAMAN DETAIL PEMASUKAN -->
${sortedInc.length > 0 ? `
<div class="page page-break">
  <div class="report-header">
    <div><h1>Detail Pemasukan</h1><div style="font-size:11px;color:#737685;">${periodLabel} · ${sortedInc.length} transaksi</div></div>
    <div class="report-meta"><div>Total: <strong style="color:#1b6b3a;">${fmtFull(s.totalIncome)}</strong></div></div>
  </div>
  <table>
    <thead><tr>
      <th>Tanggal</th>
      <th>Sumber</th>
      <th>Keterangan</th>
      <th>Metode</th>
      <th>Bank</th>
      <th>User</th>
      <th class="text-right">Jumlah</th>
    </tr></thead>
    <tbody>
    ${sortedInc.map(r => `
      <tr>
        <td style="white-space:nowrap;">${fmtTanggalShort(r.tanggal)}</td>
        <td>${r.sumber || '—'}</td>
        <td style="color:#737685;font-size:9px;">${r.items || ''}</td>
        <td>${r.metode || '—'}</td>
        <td>${r.bank || '—'}</td>
        <td><span class="user-chip ${getUserName(r.user_id)?.toLowerCase() === 'aldin' ? 'user-aldin' : 'user-solikhatun'}">${getUserName(r.user_id)}</span></td>
        <td class="text-right amount-green">${fmtFull(r.jumlah)}</td>
      </tr>
    `).join('')}
    <tr style="background:#d6f5e3;">
      <td colspan="6" style="font-weight:800;text-align:right;font-size:11px;">TOTAL</td>
      <td class="text-right amount-green" style="font-size:12px;">${fmtFull(s.totalIncome)}</td>
    </tr>
    </tbody>
  </table>
</div>
` : ''}

<!-- HALAMAN TARIK TUNAI -->
${sortedCash.length > 0 ? `
<div class="page page-break">
  <div class="report-header">
    <div><h1>Detail Tarik Tunai</h1><div style="font-size:11px;color:#737685;">${periodLabel} · ${sortedCash.length} transaksi</div></div>
    <div class="report-meta"><div>Total: <strong style="color:#5e3c00;">${fmtFull(s.totalCash)}</strong></div></div>
  </div>
  <table>
    <thead><tr>
      <th>Tanggal</th>
      <th>Keterangan</th>
      <th>Lokasi ATM</th>
      <th>Bank</th>
      <th>User</th>
      <th class="text-right">Nilai</th>
    </tr></thead>
    <tbody>
    ${sortedCash.map(r => `
      <tr>
        <td style="white-space:nowrap;">${fmtTanggalShort(r.tanggal)}</td>
        <td>${r.transaksi || '—'}</td>
        <td style="color:#737685;">${r.alamat || '—'}</td>
        <td>${r.bank || '—'}</td>
        <td><span class="user-chip ${getUserName(r.user_id)?.toLowerCase() === 'aldin' ? 'user-aldin' : 'user-solikhatun'}">${getUserName(r.user_id)}</span></td>
        <td class="text-right amount-yellow">${fmtFull(r.nilai)}</td>
      </tr>
    `).join('')}
    <tr style="background:#ffddb3;">
      <td colspan="5" style="font-weight:800;text-align:right;font-size:11px;">TOTAL</td>
      <td class="text-right amount-yellow" style="font-size:12px;">${fmtFull(s.totalCash)}</td>
    </tr>
    </tbody>
  </table>
</div>
` : ''}

<div class="footer">
  <span>Arvifund - Personal Finance Tracker</span>
  <span>© ${now.getFullYear()} · ${periodLabel}</span>
</div>

<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`

    // Buka di tab baru dan print
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) {
      win.onafterprint = () => {
        URL.revokeObjectURL(url)
      }
    }
    setTimeout(() => setGenerating(false), 1000)
  }

  return (
    <>
      {/* Tombol Export */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--surface)', color: 'var(--text1)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit', transition: 'all 0.15s',
        }}
        onMouseOver={e => e.currentTarget.style.background = 'var(--surface2)'}
        onMouseOut={e => e.currentTarget.style.background = 'var(--surface)'}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>picture_as_pdf</span>
        Export PDF
      </button>

      {/* Modal pilih periode */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">📄 Export PDF</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
                Pilih periode untuk laporan PDF. PDF akan berisi ringkasan, kategori, budget vs realisasi, dan detail semua transaksi.
              </p>

              <div className="form-group">
                <label className="form-label">Periode</label>
                <select className="form-select" value={selPeriod} onChange={e => setSelPeriod(e.target.value)}>
                  <option value="">Semua Data</option>
                  {periods.map((p, i) => (
                    <option key={i} value={String(i)}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Preview info */}
              {(() => {
                const { exp, inc, cash } = getFilteredData()
                const s = buildSummary(exp, inc, cash, budgetPlans)
                return (
                  <div style={{
                    background: 'var(--surface2)', borderRadius: 8, padding: 14,
                    marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
                  }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Pengeluaran</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--red)' }}>{fmt(s.totalExpenses)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{exp.length} transaksi</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Pemasukan</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--green)' }}>{fmt(s.totalIncome)}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{inc.length} transaksi</div>
                    </div>
                  </div>
                )
              })()}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                  Batal
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => { setShowModal(false); generateAndPrint() }}
                  disabled={generating}
                  style={{ flex: 2 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                  {generating ? 'Memproses...' : 'Generate & Print PDF'}
                </button>
              </div>

              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12, textAlign: 'center' }}>
                PDF akan terbuka di tab baru. Pilih "Save as PDF" di dialog print.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
