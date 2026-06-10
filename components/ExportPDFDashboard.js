'use client'
import { useState } from 'react'
import {
  fmt, fmtFull, fmtTanggalShort,
  BULAN_ORDER, KATEGORI_ICON, KATEGORI_COLOR,
  buildPeriods, filterByPeriod, buildSummary,
  getLocalDate,
} from '../lib/utils'
import { useData } from './DataContext'

export default function ExportPDFDashboard() {
  const {
    expenses, income, cashRecords, budgetPlans,
    profiles, payPeriodDate, overrides, getUserName,
  } = useData()

  const [showModal, setShowModal]   = useState(false)
  const [selPeriod, setSelPeriod]   = useState('')
  const [generating, setGenerating] = useState(false)

  const periods = buildPeriods(payPeriodDate, overrides)
  const now     = getLocalDate()

  function getFilteredData(sel) {
    if (sel === '') return { exp: expenses, inc: income, cash: cashRecords }
    const idx  = parseInt(sel)
    const exp  = filterByPeriod(expenses, idx, payPeriodDate, overrides)
    const rawInc = filterByPeriod(
      income.map(r => ({ ...r, nilai: r.jumlah })), idx, payPeriodDate, overrides
    )
    const inc  = rawInc.map(r => { const { nilai: _, ...rest } = r; return rest })
    const cash = filterByPeriod(cashRecords, idx, payPeriodDate, overrides)
    return { exp, inc, cash }
  }

  function buildBarSVG(exp, inc) {
    const byBulan = {}
    BULAN_ORDER.forEach(b => { byBulan[b] = { exp: 0, inc: 0 } })
    exp.forEach(r => { if (r.bulan) byBulan[r.bulan].exp += r.nilai || 0 })
    inc.forEach(r => { if (r.bulan) byBulan[r.bulan].inc += r.jumlah || 0 })
    const bulanAda = BULAN_ORDER.filter(b => byBulan[b].exp > 0 || byBulan[b].inc > 0)
    if (!bulanAda.length) return '<p style="color:#737685;font-size:10px;text-align:center;padding:20px 0;">Tidak ada data</p>'
    const maxVal = Math.max(...bulanAda.flatMap(b => [byBulan[b].exp, byBulan[b].inc]), 1)
    const W = 640, H = 160, padL = 46, padB = 22, chartH = H - padB - 16
    const colW = Math.floor((W - padL - 8) / bulanAda.length)
    const bW   = Math.min(20, Math.floor(colW / 2) - 2)
    let bars = '', ticks = ''
    bulanAda.forEach((b, i) => {
      const x    = padL + i * colW
      const hInc = Math.max(2, Math.round((byBulan[b].inc / maxVal) * chartH))
      const hExp = Math.max(2, Math.round((byBulan[b].exp / maxVal) * chartH))
      bars += `\n        <rect x="${x}" y="${H-padB-hInc}" width="${bW}" height="${hInc}" fill="#1b6b3a" rx="2"/>\n        <rect x="${x+bW+2}" y="${H-padB-hExp}" width="${bW}" height="${hExp}" fill="#ba1a1a" rx="2"/>\n        <text x="${x+bW}" y="${H-5}" text-anchor="middle" font-size="7.5" fill="#737685">${b.substring(0,3)}</text>`
    })
    ;[0, .25, .5, .75, 1].forEach(t => {
      const y   = H - padB - Math.round(t * chartH)
      const val = t * maxVal
      const lbl = val >= 1e6 ? (val/1e6).toFixed(0)+'jt' : val >= 1e3 ? (val/1e3).toFixed(0)+'rb' : '0'
      ticks += `\n        <text x="${padL-3}" y="${y+3}" text-anchor="end" font-size="7" fill="#9ea3b5">${lbl}</text>\n        <line x1="${padL}" y1="${y}" x2="${W}" y2="${y}" stroke="#e8edff" stroke-width="0.5"/>`
    })
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;">\n      ${ticks}${bars}\n      <rect x="${padL}" y="5" width="8" height="8" fill="#1b6b3a" rx="1"/>\n      <text x="${padL+11}" y="13" font-size="8" fill="#434654">Pemasukan</text>\n      <rect x="${padL+78}" y="5" width="8" height="8" fill="#ba1a1a" rx="1"/>\n      <text x="${padL+89}" y="13" font-size="8" fill="#434654">Pengeluaran</text>\n    </svg>`
  }

  function buildPieSVG(byKategori, total) {
    const entries = Object.entries(byKategori).sort((a,b) => b[1]-a[1]).slice(0,8)
    if (!entries.length || !total) return '<p style="color:#737685;font-size:10px;text-align:center;padding:20px 0;">Tidak ada data</p>'
    const cx = 85, cy = 88, r = 70
    let startA = -Math.PI / 2, paths = '', legend = ''
    entries.forEach(([kat, val], i) => {
      const angle = (val / total) * 2 * Math.PI
      const endA  = startA + angle
      const x1 = cx + r * Math.cos(startA), y1 = cy + r * Math.sin(startA)
      const x2 = cx + r * Math.cos(endA),   y2 = cy + r * Math.sin(endA)
      const color = KATEGORI_COLOR[kat] || '#94a3b8'
      const lg    = angle > Math.PI ? 1 : 0
      paths += `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${lg},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${color}" stroke="white" stroke-width="1.5"/>`
      const pct = Math.round(val / total * 100)
      const y   = 16 + i * 21
      legend += `\n        <rect x="188" y="${y-8}" width="8" height="8" fill="${color}" rx="1"/>\n        <text x="199" y="${y}" font-size="8.5" fill="#434654">${kat}</text>\n        <text x="378" y="${y}" text-anchor="end" font-size="8.5" fill="#434654" font-weight="700">${pct}%</text>`
      startA = endA
    })
    return `<svg viewBox="0 0 385 182" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:420px;">\n      ${paths}\n      <circle cx="${cx}" cy="${cy}" r="33" fill="white"/>\n      <text x="${cx}" y="${cy-5}" text-anchor="middle" font-size="8" fill="#737685">Total</text>\n      <text x="${cx}" y="${cy+9}" text-anchor="middle" font-size="9" font-weight="700" fill="#003d9b">${fmt(total)}</text>\n      ${legend}\n    </svg>`
  }

  function buildUserSVG(byUser, total, getNameFn) {
    const entries = Object.entries(byUser)
    if (!entries.length) return ''
    const maxVal = Math.max(...entries.map(([,v]) => v), 1)
    let rows = ''
    entries.forEach(([uid, val], i) => {
      const name  = getNameFn(uid) || '?'
      const pct   = Math.round((val / total) * 100)
      const wFill = Math.round((val / maxVal) * 220)
      const y     = i * 28
      const color = name.toLowerCase() === 'aldin' ? '#003d9b' : '#db2777'
      rows += `\n        <text x="0" y="${y+12}" font-size="9" fill="#434654" font-weight="600">${name}</text>\n        <rect x="72" y="${y+2}" width="${wFill}" height="16" fill="${color}" rx="3" opacity="0.85"/>\n        <text x="${72+wFill+5}" y="${y+13}" font-size="9" fill="${color}" font-weight="700">${fmt(val)} (${pct}%)</text>`
    })
    const svgH = entries.length * 28 + 6
    return `<svg viewBox="0 0 460 ${svgH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:460px;">${rows}</svg>`
  }

  function getAnomali(exp) {
    const avg = exp.length ? exp.reduce((s,r) => s+r.nilai, 0) / exp.length : 0
    return exp.filter(r => r.nilai > avg*3 && r.nilai > 100000).sort((a,b) => b.nilai-a.nilai).slice(0,5)
  }

  function generateAndPrint() {
    setGenerating(true)
    setTimeout(() => {
      try {
        const { exp, inc, cash } = getFilteredData(selPeriod)
        const s = buildSummary(exp, inc, cash, budgetPlans)
        const periodLabel = selPeriod !== '' && periods[parseInt(selPeriod)]
          ? periods[parseInt(selPeriod)].label : 'Semua Data'
        const top10      = Object.entries(s.byKategori).sort((a,b) => b[1]-a[1]).slice(0,10)
        const anomali    = getAnomali(exp)
        const sortedExp  = [...exp].sort((a,b) => (b.tanggal||'').localeCompare(a.tanggal||''))
        const sortedInc  = [...inc].sort((a,b) => (b.tanggal||'').localeCompare(a.tanggal||''))
        const sortedCash = [...cash].sort((a,b) => (b.tanggal||'').localeCompare(a.tanggal||''))
        const barSVG     = buildBarSVG(exp, inc)
        const pieSVG     = buildPieSVG(s.byKategori, s.totalExpenses)
        const userBarSVG = buildUserSVG(s.byUser, s.totalExpenses, getUserName)
        const trenRows = BULAN_ORDER.filter(b => s.byBulan[b] || s.incomeByBulan[b]).map(b => {
          const expV = s.byBulan[b] || 0; const incV = s.incomeByBulan[b] || 0; const sel = incV - expV
          return `<tr><td>${b}</td><td class="tr amount-green">${fmtFull(incV)}</td><td class="tr amount-red">${fmtFull(expV)}</td><td class="tr ${sel>=0?'amount-green':'amount-red'}">${fmtFull(sel)}</td></tr>`
        }).join('')
        const userChip = uid => { const n = getUserName(uid)||''; return `<span class="uc ${n.toLowerCase()==='aldin'?'ua':'us'}">${n}</span>` }
        const hasBudget = s.budgetVsReal && s.budgetVsReal.filter(b=>b.alokasi>0).length > 0
        const CSS = `*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#041b3c;background:#fff;}.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:96vh;padding:50px 40px;page-break-after:always;text-align:center;}.cl{font-size:50px;font-weight:900;color:#003d9b;letter-spacing:-2px;margin-bottom:6px;}.cs{font-size:14px;color:#737685;margin-bottom:38px;}.cline{width:56px;height:4px;background:#003d9b;margin:0 auto 28px;border-radius:2px;}.cp{display:inline-block;background:#003d9b;color:#fff;padding:10px 32px;border-radius:24px;font-size:13px;font-weight:700;margin-bottom:12px;}.cd{font-size:10px;color:#737685;margin-bottom:38px;}.toc{text-align:left;border:1px solid #c3c6d6;border-radius:10px;padding:18px 26px;background:#f9f9ff;min-width:260px;}.toc-t{font-size:9px;font-weight:700;text-transform:uppercase;color:#737685;letter-spacing:.5px;margin-bottom:10px;}.toc-r{font-size:10px;color:#434654;padding:5px 0;border-bottom:1px dashed #e8edff;display:flex;justify-content:space-between;}.toc-r:last-child{border-bottom:none;}.cm{margin-top:30px;font-size:10px;color:#737685;}.page{padding:26px 34px;}.pb{page-break-before:always;}h1{font-size:16px;font-weight:800;color:#003d9b;margin-bottom:3px;}h2{font-size:11.5px;font-weight:700;color:#434654;text-transform:uppercase;letter-spacing:.5px;margin:20px 0 9px;border-bottom:2px solid #003d9b;padding-bottom:5px;}.rh{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;padding-bottom:12px;border-bottom:1px solid #c3c6d6;}.rm{font-size:9.5px;color:#737685;text-align:right;line-height:1.9;}.kg{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:6px;}.kc{background:#f9f9ff;border:1px solid #c3c6d6;border-radius:8px;padding:11px;position:relative;overflow:hidden;}.kc::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;}.kc.inc::before{background:#1b6b3a;}.kc.exp::before{background:#ba1a1a;}.kc.sal::before{background:#003d9b;}.kc.cas::before{background:#5e3c00;}.kl{font-size:8px;font-weight:700;color:#737685;text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px;}.kv{font-size:13px;font-weight:800;}.kv.g{color:#1b6b3a;}.kv.r{color:#ba1a1a;}.kv.b{color:#003d9b;}.kv.y{color:#5e3c00;}.ks{font-size:8px;color:#737685;margin-top:3px;}.cb{border:1px solid #e8edff;border-radius:8px;padding:12px;background:#f9f9ff;margin-bottom:5px;}.ct{font-size:9.5px;font-weight:700;color:#434654;margin-bottom:7px;text-transform:uppercase;letter-spacing:.4px;}.pr{margin-bottom:8px;}.pl{display:flex;justify-content:space-between;margin-bottom:2px;font-size:9.5px;}.pw{background:#e8edff;border-radius:3px;height:7px;}.pf{height:100%;border-radius:3px;}table{width:100%;border-collapse:collapse;margin-bottom:6px;font-size:10px;}th{background:#003d9b;color:#fff;padding:6px 8px;text-align:left;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;}td{padding:5px 8px;border-bottom:1px solid #e8edff;vertical-align:middle;}tr:nth-child(even) td{background:#f9f9ff;}tr:last-child td{border-bottom:none;}.tr{text-align:right;font-weight:700;}.tc{text-align:center;}.amount-red{color:#ba1a1a;font-weight:700;}.amount-green{color:#1b6b3a;font-weight:700;}.amount-yellow{color:#5e3c00;font-weight:700;}.b{display:inline-block;padding:2px 6px;border-radius:10px;font-size:8px;font-weight:700;}.bb{background:#dae2ff;color:#003d9b;}.bg{background:#d6f5e3;color:#1b6b3a;}.br{background:#ffdad6;color:#ba1a1a;}.bx{background:#e8edff;color:#434654;}.by{background:#fff3cc;color:#5e3c00;}.uc{display:inline-block;padding:2px 6px;border-radius:10px;font-size:8px;font-weight:700;}.ua{background:#dae2ff;color:#003d9b;}.us{background:#fce7f3;color:#9d174d;}.ib{background:#f1f3ff;border:1px solid #c3c6d6;border-radius:7px;padding:9px 12px;}.il{font-size:8px;color:#737685;font-weight:700;text-transform:uppercase;margin-bottom:2px;}.iv{font-size:13px;font-weight:800;color:#003d9b;}.is{font-size:8.5px;color:#737685;margin-top:2px;}.ai{display:flex;align-items:center;gap:9px;padding:7px 9px;background:#fff8f0;border:1px solid #ffdad6;border-radius:6px;margin-bottom:5px;}.ab{background:#ba1a1a;color:#fff;font-size:7.5px;font-weight:700;padding:2px 5px;border-radius:5px;white-space:nowrap;}.ft{position:fixed;bottom:16px;left:34px;right:34px;display:flex;justify-content:space-between;font-size:8px;color:#737685;border-top:1px solid #c3c6d6;padding-top:5px;}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}`
        const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/><title>Laporan Keuangan Arvifund — ${periodLabel}</title><style>${CSS}</style></head><body>
<div class="cover"><div class="cl">💰 Arvifund</div><div class="cs">Personal Finance Tracker · Household Report</div><div class="cline"></div><div class="cp">📅 ${periodLabel}</div><div class="cd">Dicetak: ${now.toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div><div class="toc"><div class="toc-t">Daftar Isi</div><div class="toc-r"><span>1. Ringkasan Keuangan</span><span>KPI, Kategori, Anomali</span></div><div class="toc-r"><span>2. Analisis &amp; Grafik</span><span>Bar + Pie Chart + Tren</span></div>${hasBudget?'<div class="toc-r"><span>3. Budget vs Realisasi</span><span>Perbandingan Anggaran</span></div>':''}<div class="toc-r"><span>${hasBudget?'4':'3'}. Detail Pengeluaran</span><span>${sortedExp.length} transaksi</span></div><div class="toc-r"><span>${hasBudget?'5':'4'}. Detail Pemasukan</span><span>${sortedInc.length} transaksi</span></div>${sortedCash.length?'<div class="toc-r"><span>Detail Tarik Tunai</span><span>'+sortedCash.length+' transaksi</span></div>':''}</div><div class="cm">👥 ${(profiles||[]).map(p=>p.username).join(' · ')}</div></div>
<div class="page"><div class="rh"><div><h1>Laporan Keuangan Arvifund</h1><div style="font-size:11px;color:#737685;margin-top:2px;">${periodLabel}</div></div><div class="rm"><div>Dicetak: ${now.toLocaleDateString('id-ID')}</div><div>${now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})} WIB</div><div>Arvifund v2.0</div></div></div>
<h2>Ringkasan Keuangan</h2><div class="kg"><div class="kc inc"><div class="kl">Total Pemasukan</div><div class="kv g">${fmtFull(s.totalIncome)}</div><div class="ks">${inc.length} transaksi</div></div><div class="kc exp"><div class="kl">Total Pengeluaran</div><div class="kv r">${fmtFull(s.totalExpenses)}</div><div class="ks">${exp.length} transaksi</div></div><div class="kc sal"><div class="kl">Saldo Bersih</div><div class="kv ${s.saldo>=0?'b':'r'}">${fmtFull(s.saldo)}</div><div class="ks">pemasukan − pengeluaran</div></div><div class="kc cas"><div class="kl">Tarik Tunai</div><div class="kv y">${fmtFull(s.totalCash)}</div><div class="ks">${cash.length} transaksi</div></div></div>
${Object.keys(s.byUser).length?`<h2>Pengeluaran per Anggota</h2><div class="cb"><div class="ct">Perbandingan Pengeluaran Anggota Keluarga</div>${userBarSVG}<div style="display:grid;grid-template-columns:repeat(${Object.keys(s.byUser).length},1fr);gap:9px;margin-top:10px;">${Object.entries(s.byUser).map(([uid,val])=>{const n=getUserName(uid)||'?';const pct=s.totalExpenses>0?Math.round(val/s.totalExpenses*100):0;return '<div class="ib"><div class="il">'+n+'</div><div class="iv">'+fmtFull(val)+'</div><div class="is">'+pct+'% dari total pengeluaran</div></div>'}).join('')}</div></div>`:''}
<h2>Top 10 Kategori Pengeluaran</h2>${top10.map(([kat,val])=>{const pct=s.totalExpenses>0?Math.round(val/s.totalExpenses*100):0;const color=KATEGORI_COLOR[kat]||'#003d9b';return '<div class="pr"><div class="pl"><span>'+(KATEGORI_ICON[kat]||'📦')+' '+kat+'</span><span><strong>'+fmtFull(val)+'</strong> ('+pct+'%)</span></div><div class="pw"><div class="pf" style="width:'+pct+'%;background:'+color+';"></div></div></div>'}).join('')}
${anomali.length?`<h2>⚠️ Transaksi Anomali</h2>${anomali.map(r=>'<div class="ai"><span class="ab">ANOMALI</span><div style="flex:1;"><strong>'+(r.toko||'—')+'</strong>'+(r.uraian?' <span style="color:#737685;"> · '+r.uraian+'</span>':'')+'<br><span style="color:#737685;font-size:9px;">'+fmtTanggalShort(r.tanggal)+' · '+(r.kategori||'—')+' · '+getUserName(r.user_id)+'</span></div><strong style="color:#ba1a1a;white-space:nowrap;">'+fmtFull(r.nilai)+'</strong></div>').join('')}`:''}
</div>
<div class="page pb"><div class="rh"><div><h1>Analisis &amp; Grafik</h1><div style="font-size:11px;color:#737685;">${periodLabel}</div></div><div class="rm"><div>Arvifund v2.0</div></div></div>
<h2>Pemasukan vs Pengeluaran per Bulan</h2><div class="cb">${barSVG}</div>
<h2>Distribusi Pengeluaran per Kategori</h2><div class="cb">${pieSVG}</div>
${trenRows?`<h2>Tren Bulanan</h2><table><thead><tr><th>Bulan</th><th class="tr">Pemasukan</th><th class="tr">Pengeluaran</th><th class="tr">Saldo</th></tr></thead><tbody>${trenRows}</tbody></table>`:''}
</div>
${hasBudget?`<div class="page pb"><div class="rh"><div><h1>Budget vs Realisasi</h1><div style="font-size:11px;color:#737685;">${periodLabel}</div></div><div class="rm"><div>Budget: <strong>${fmtFull(s.budgetVsReal.reduce((sum,b)=>sum+b.alokasi,0))}</strong></div><div>Realisasi: <strong style="color:#ba1a1a;">${fmtFull(s.totalExpenses)}</strong></div></div></div><table><thead><tr><th>Kategori</th><th class="tr">Budget</th><th class="tr">Realisasi</th><th class="tr">Sisa</th><th class="tc">%</th><th class="tc">Status</th></tr></thead><tbody>${s.budgetVsReal.filter(b=>b.alokasi>0).map(b=>{const sisa=b.alokasi-b.realisasi;const st=b.pct>=100?'🔴 Over':b.pct>=80?'🟡 Warning':'🟢 Aman';return '<tr><td>'+(KATEGORI_ICON[b.kategori]||'')+' '+b.kategori+'</td><td class="tr">'+fmtFull(b.alokasi)+'</td><td class="tr '+(b.pct>=100?'amount-red':'')+'">'+fmtFull(b.realisasi)+'</td><td class="tr '+(sisa<0?'amount-red':'amount-green')+'">'+fmtFull(Math.abs(sisa))+'</td><td class="tc"><span class="b '+(b.pct>=100?'br':b.pct>=80?'by':'bg')+'">'+b.pct+'%</span></td><td class="tc" style="font-size:9px;">'+st+'</td></tr>'}).join('')}<tr style="background:#dae2ff;font-weight:800;"><td>TOTAL</td><td class="tr">${fmtFull(s.budgetVsReal.reduce((sum,b)=>sum+b.alokasi,0))}</td><td class="tr amount-red">${fmtFull(s.totalExpenses)}</td><td class="tr ${s.budgetVsReal.reduce((sum,b)=>sum+b.alokasi,0)-s.totalExpenses<0?'amount-red':'amount-green'}">${fmtFull(Math.abs(s.budgetVsReal.reduce((sum,b)=>sum+b.alokasi,0)-s.totalExpenses))}</td><td colspan="2"></td></tr></tbody></table><h2>Visualisasi Budget</h2>${s.budgetVsReal.filter(b=>b.alokasi>0).map(b=>{const color=b.pct>=100?'#ba1a1a':b.pct>=80?'#f59e0b':'#1b6b3a';return '<div class="pr"><div class="pl"><span>'+(KATEGORI_ICON[b.kategori]||'')+' '+b.kategori+' — '+fmtFull(b.realisasi)+' / '+fmtFull(b.alokasi)+'</span><span style="color:'+color+';font-weight:700;">'+b.pct+'%</span></div><div class="pw"><div class="pf" style="width:'+Math.min(b.pct,100)+'%;background:'+color+';"></div></div></div>'}).join('')}</div>`:''}
${sortedExp.length?`<div class="page pb"><div class="rh"><div><h1>Detail Pengeluaran</h1><div style="font-size:11px;color:#737685;">${periodLabel} · ${sortedExp.length} transaksi</div></div><div class="rm"><div>Total: <strong style="color:#ba1a1a;">${fmtFull(s.totalExpenses)}</strong></div></div></div><table><thead><tr><th>Tanggal</th><th>Toko</th><th>Uraian</th><th>Kategori</th><th>Metode</th><th>Bank</th><th>User</th><th class="tr">Nilai</th></tr></thead><tbody>${sortedExp.map(r=>'<tr><td style="white-space:nowrap;">'+fmtTanggalShort(r.tanggal)+'</td><td><strong>'+(r.toko||'—')+'</strong></td><td style="color:#737685;font-size:9px;">'+(r.uraian||'')+'</td><td><span class="b bx">'+(KATEGORI_ICON[r.kategori]||'')+' '+(r.kategori||'—')+'</span></td><td style="font-size:9px;">'+(r.transaksi||'—')+'</td><td><span class="b bb">'+(r.bank||'—')+'</span></td><td>'+userChip(r.user_id)+'</td><td class="tr amount-red">'+fmtFull(r.nilai)+'</td></tr>').join('')}<tr style="background:#dae2ff;"><td colspan="7" style="font-weight:800;text-align:right;font-size:11px;">TOTAL PENGELUARAN</td><td class="tr amount-red" style="font-size:12px;">${fmtFull(s.totalExpenses)}</td></tr></tbody></table></div>`:''}
${sortedInc.length?`<div class="page pb"><div class="rh"><div><h1>Detail Pemasukan</h1><div style="font-size:11px;color:#737685;">${periodLabel} · ${sortedInc.length} transaksi</div></div><div class="rm"><div>Total: <strong style="color:#1b6b3a;">${fmtFull(s.totalIncome)}</strong></div></div></div><table><thead><tr><th>Tanggal</th><th>Sumber</th><th>Keterangan</th><th>Metode</th><th>Bank</th><th>User</th><th class="tr">Jumlah</th></tr></thead><tbody>${sortedInc.map(r=>'<tr><td style="white-space:nowrap;">'+fmtTanggalShort(r.tanggal)+'</td><td><strong>'+(r.sumber||'—')+'</strong></td><td style="color:#737685;font-size:9px;">'+(r.items||'')+'</td><td style="font-size:9px;">'+(r.metode||'—')+'</td><td><span class="b bb">'+(r.bank||'—')+'</span></td><td>'+userChip(r.user_id)+'</td><td class="tr amount-green">'+fmtFull(r.jumlah)+'</td></tr>').join('')}<tr style="background:#d6f5e3;"><td colspan="6" style="font-weight:800;text-align:right;font-size:11px;">TOTAL PEMASUKAN</td><td class="tr amount-green" style="font-size:12px;">${fmtFull(s.totalIncome)}</td></tr></tbody></table></div>`:''}
${sortedCash.length?`<div class="page pb"><div class="rh"><div><h1>Detail Tarik Tunai</h1><div style="font-size:11px;color:#737685;">${periodLabel} · ${sortedCash.length} transaksi</div></div><div class="rm"><div>Total: <strong style="color:#5e3c00;">${fmtFull(s.totalCash)}</strong></div></div></div><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Lokasi ATM</th><th>Bank</th><th>User</th><th class="tr">Nilai</th></tr></thead><tbody>${sortedCash.map(r=>'<tr><td style="white-space:nowrap;">'+fmtTanggalShort(r.tanggal)+'</td><td>'+(r.transaksi||'—')+'</td><td style="color:#737685;font-size:9px;">'+(r.alamat||'—')+'</td><td><span class="b bb">'+(r.bank||'—')+'</span></td><td>'+userChip(r.user_id)+'</td><td class="tr amount-yellow">'+fmtFull(r.nilai)+'</td></tr>').join('')}<tr style="background:#ffddb3;"><td colspan="5" style="font-weight:800;text-align:right;font-size:11px;">TOTAL TARIK TUNAI</td><td class="tr amount-yellow" style="font-size:12px;">${fmtFull(s.totalCash)}</td></tr></tbody></table></div>`:''}
<div class="ft"><span>Arvifund · ${(profiles||[]).map(p=>p.username).join(' & ')}</span><span>© ${now.getFullYear()} · ${periodLabel} · Dicetak ${now.toLocaleDateString('id-ID')}</span></div>
<script>window.onload=function(){window.print();}<\/script></body></html>`
        const blob = new Blob([html], { type: 'text/html' })
        const url  = URL.createObjectURL(blob)
        const win  = window.open(url, '_blank')
        if (win) win.onafterprint = () => URL.revokeObjectURL(url)
      } catch(e) {
        console.error('ExportPDFDashboard error:', e)
      } finally {
        setGenerating(false)
      }
    }, 80)
  }

  const { exp: pExp, inc: pInc, cash: pCash } = getFilteredData(selPeriod)
  const preview = buildSummary(pExp, pInc, pCash, budgetPlans)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--surface)', color: 'var(--text1)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit', transition: 'background 0.15s',
          WebkitTapHighlightColor: 'transparent',
        }}
        onMouseOver={e => e.currentTarget.style.background = 'var(--surface2)'}
        onMouseOut={e  => e.currentTarget.style.background = 'var(--surface)'}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 17 }}>picture_as_pdf</span>
        Export PDF
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">📊 Export Laporan Lengkap</span>
              <button onClick={() => setShowModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text2)', padding:4 }}>
                <span className="material-symbols-outlined" style={{ fontSize:20 }}>close</span>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize:13, color:'var(--text2)', marginBottom:16, lineHeight:1.6 }}>
                Laporan lengkap: KPI, grafik bar &amp; pie, tren bulanan, budget vs realisasi, anomali, dan detail semua transaksi.
              </p>
              <div className="form-group">
                <label className="form-label">Pilih Periode</label>
                <select className="form-select" value={selPeriod} onChange={e => setSelPeriod(e.target.value)}>
                  <option value="">Semua Data</option>
                  {periods.map((p,i) => <option key={i} value={String(i)}>{p.label}</option>)}
                </select>
              </div>
              <div style={{ background:'var(--surface2)', borderRadius:8, padding:14, marginBottom:16, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>Pemasukan</div>
                  <div style={{ fontSize:14, fontWeight:800, color:'var(--green)' }}>{fmt(preview.totalIncome)}</div>
                  <div style={{ fontSize:10, color:'var(--text3)' }}>{pInc.length} trx</div>
                </div>
                <div>
                  <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>Pengeluaran</div>
                  <div style={{ fontSize:14, fontWeight:800, color:'var(--red)' }}>{fmt(preview.totalExpenses)}</div>
                  <div style={{ fontSize:10, color:'var(--text3)' }}>{pExp.length} trx</div>
                </div>
                <div>
                  <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>Saldo</div>
                  <div style={{ fontSize:14, fontWeight:800, color: preview.saldo>=0?'var(--accent)':'var(--red)' }}>{fmt(preview.saldo)}</div>
                  <div style={{ fontSize:10, color:'var(--text3)' }}>{pCash.length} tunai</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ flex:1 }}>Batal</button>
                <button className="btn btn-primary" onClick={() => { setShowModal(false); generateAndPrint() }} disabled={generating} style={{ flex:2 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:16 }}>{generating ? 'hourglass_empty' : 'download'}</span>
                  {generating ? 'Memproses...' : 'Generate & Print PDF'}
                </button>
              </div>
              <p style={{ fontSize:11, color:'var(--text3)', marginTop:12, textAlign:'center' }}>PDF terbuka di tab baru → pilih "Save as PDF" di dialog print</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
