'use client'
import { Download, Loader2 } from 'lucide-react'
import { fmt } from '../../lib/utils'

export default function TransaksiSummaryBar({ activeCount, tab, totalByTipe, tipeConfig, onExport, exporting }) {
  return (
    <div className="trx-summary-bar">
      <div className="trx-summary-row">
        <span><strong style={{ color: 'var(--text1)' }}>{activeCount}</strong> transaksi</span>
        <span className="trx-summary-right">
          {tab !== 'all' && (
            <span>Total: <strong style={{ color: tipeConfig[tab].color }}>{fmt(totalByTipe[tab])}</strong></span>
          )}
          <button
            onClick={onExport}
            disabled={exporting || activeCount === 0}
            aria-label="Unduh CSV"
            className="trx-export-btn"
            style={{
              color: activeCount === 0 ? 'var(--text3)' : 'var(--accent)',
              cursor: activeCount === 0 ? 'not-allowed' : 'pointer',
              opacity: activeCount === 0 ? 0.5 : 1,
            }}
          >
            {exporting ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Download size={13} />}
            CSV
          </button>
        </span>
      </div>
    </div>
  )
}
