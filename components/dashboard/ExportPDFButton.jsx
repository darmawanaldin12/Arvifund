'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { pdf } from '@react-pdf/renderer'
import { FileDown, Loader2, X } from 'lucide-react'
import { useData } from '../DataContext'
import { buildReportData } from '../../lib/pdfReportData'
import { generateNarrative, buildFallbackNarrative } from '../../lib/pdfNarrative'
import { renderTrendChartImage, renderDonutChartImage, renderBudgetChartImage } from '../../lib/pdfChartImages'
import PDFReportDocument from './PDFReportDocument'

export default function ExportPDFButton() {
  const {
    expenses, income, cashRecords, budgetPlans,
    periods, payPeriodDate, overrides, getUserName,
  } = useData()

  const [open, setOpen]               = useState(false)
  const [mounted, setMounted]         = useState(false)
  const [selectedIdx, setSelectedIdx] = useState('0')
  const [loading, setLoading]         = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [error, setError]             = useState('')
  const modalRef = useRef(null)

  useEffect(() => { setMounted(true) }, [])

  // Lock scroll body selagi modal terbuka (sama seperti EditModal — portal
  // me-render di luar page, jadi body perlu dikunci manual)
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [open])

  function handleOpen() {
    setError('')
    setSelectedIdx(periods?.[0] ? '0' : '')
    setOpen(true)
  }

  function handleClose() {
    if (loading) return // jangan bisa ditutup selagi proses generate
    setOpen(false)
  }

  async function handleGenerate() {
    setLoading(true)
    setError('')
    try {
      setLoadingStep('Menghitung ringkasan periode...')
      const reportData = buildReportData({
        periodIdx: selectedIdx, periods, expenses, income, cashRecords, budgetPlans,
        payPeriodDate, overrides, getUserName,
      })

      setLoadingStep('Membuat grafik...')
      const [trendImg, donutImg, budgetImg] = await Promise.all([
        reportData.trendPeriods.length ? renderTrendChartImage(reportData.trendPeriods) : Promise.resolve(null),
        reportData.topKategori.length ? renderDonutChartImage(reportData.topKategori) : Promise.resolve(null),
        reportData.budgetVsReal.length ? renderBudgetChartImage(reportData.budgetVsReal) : Promise.resolve(null),
      ])

      setLoadingStep('Meminta analisa dari Gemini...')
      let narrative
      try {
        narrative = await generateNarrative(reportData)
      } catch (e) {
        console.error('Gemini narrative gagal, pakai fallback:', e)
        narrative = buildFallbackNarrative(reportData)
      }

      setLoadingStep('Menyusun PDF...')
      const blob = await pdf(
        <PDFReportDocument
          reportData={reportData}
          narrative={narrative}
          chartImages={{ trend: trendImg, donut: donutImg, budget: budgetImg }}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Laporan-Arvifund-${reportData.periodLabel.replace(/[^a-zA-Z0-9]+/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      setOpen(false)
    } catch (err) {
      console.error('Export PDF error:', err)
      setError('Gagal membuat laporan: ' + err.message)
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }

  return (
    <>
      <button className="trx-export-btn" onClick={handleOpen} type="button">
        <FileDown size={14} /> Export Laporan PDF
      </button>

      {open && mounted && createPortal(
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
          <div className="modal-content" ref={modalRef} style={{ maxWidth: 420 }} role="dialog" aria-modal="true">
            <div className="modal-header">
              <span className="modal-title">Export Laporan PDF</span>
              {!loading && (
                <button onClick={handleClose} aria-label="Tutup dialog" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', padding: 4 }}>
                  <X size={20} />
                </button>
              )}
            </div>
            <div className="modal-body">
              {!loading ? (
                <>
                  <label className="form-label" htmlFor="pdf-period-select">Pilih Periode</label>
                  <select
                    id="pdf-period-select"
                    className="form-select"
                    value={selectedIdx}
                    onChange={e => setSelectedIdx(e.target.value)}
                  >
                    {periods.map((p, i) => (
                      <option key={i} value={i}>{p.label}</option>
                    ))}
                  </select>

                  {error && (
                    <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 10, padding: '8px 10px', background: 'var(--red-bg)', borderRadius: 8 }}>
                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ marginTop: 16, width: '100%' }}
                    onClick={handleGenerate}
                    disabled={selectedIdx === ''}
                  >
                    Generate PDF
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Loader2 size={30} className="animate-spin" style={{ margin: '0 auto 14px', color: 'var(--accent)' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', marginBottom: 4 }}>{loadingStep}</p>
                  <p style={{ fontSize: 11, color: 'var(--text3)' }}>Mohon tunggu, jangan tutup halaman ini.</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
