import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

function createCanvas(w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return canvas
}

// Chart.js perlu satu tick render sebelum toDataURL() dipanggil, meski animation:false.
function waitFrame() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
}

const jt = v => (v / 1_000_000).toFixed(1) + 'jt'

export async function renderTrendChartImage(trendPeriods) {
  const canvas = createCanvas(900, 380)
  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: trendPeriods.map(p => p.label),
      datasets: [
        { label: 'Pemasukan', data: trendPeriods.map(p => p.income), borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.08)', fill: true, tension: 0.3, pointRadius: 4 },
        { label: 'Pengeluaran', data: trendPeriods.map(p => p.expense), borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.08)', fill: true, tension: 0.3, pointRadius: 4 },
      ],
    },
    options: {
      responsive: false, animation: false, devicePixelRatio: 2,
      plugins: { legend: { position: 'top', labels: { font: { size: 13 } } } },
      scales: { y: { ticks: { callback: jt, font: { size: 11 } } }, x: { ticks: { font: { size: 12 } } } },
    },
  })
  await waitFrame()
  const url = canvas.toDataURL('image/png')
  chart.destroy()
  return url
}

export async function renderDonutChartImage(topKategori) {
  const top = topKategori.slice(0, 6)
  const canvas = createCanvas(500, 440)
  const chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: top.map(k => k.kategori),
      datasets: [{ data: top.map(k => k.nilai), backgroundColor: top.map(k => k.color), borderColor: '#fff', borderWidth: 3 }],
    },
    options: {
      responsive: false, animation: false, devicePixelRatio: 2, cutout: '58%',
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } } },
    },
  })
  await waitFrame()
  const url = canvas.toDataURL('image/png')
  chart.destroy()
  return url
}

export async function renderBudgetChartImage(budgetVsReal) {
  const canvas = createCanvas(900, 380)
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: budgetVsReal.map(b => b.kategori),
      datasets: [
        { label: 'Budget', data: budgetVsReal.map(b => b.alokasi), backgroundColor: '#CBD5E1' },
        { label: 'Realisasi', data: budgetVsReal.map(b => b.realisasi), backgroundColor: budgetVsReal.map(b => b.pct > 100 ? '#DC2626' : '#1E40AF') },
      ],
    },
    options: {
      responsive: false, animation: false, devicePixelRatio: 2,
      plugins: { legend: { position: 'top', labels: { font: { size: 13 } } } },
      scales: { y: { ticks: { callback: jt, font: { size: 11 } } }, x: { ticks: { font: { size: 11 } } } },
    },
  })
  await waitFrame()
  const url = canvas.toDataURL('image/png')
  chart.destroy()
  return url
}
