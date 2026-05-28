{/* KPI Grid */}
<div className="kpi-grid">
  {/* Income */}
  <div className="kpi-card income" onClick={() => router.push('/income')} style={{ cursor: 'pointer' }}>
    <div className="kpi-top">
      <div className="kpi-icon income">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
          <polyline points="17 6 23 6 23 12"/>
        </svg>
      </div>
      <span className="kpi-label">Total Pemasukan</span>
    </div>
    <div className="kpi-value" style={{ color: 'var(--green)' }}>{fmt(s.totalIncome)}</div>
    <div className="kpi-sub">tahun ini</div>
    {momIncome && <span className={`kpi-mom ${momIncome.cls}`}>{momIncome.label} vs {bulanLaluMom}</span>}
  </div>

  {/* Expense */}
  <div className="kpi-card expense" onClick={() => router.push('/expenses')} style={{ cursor: 'pointer' }}>
    <div className="kpi-top">
      <div className="kpi-icon expense">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
          <polyline points="17 18 23 18 23 12"/>
        </svg>
      </div>
      <span className="kpi-label">Total Pengeluaran</span>
    </div>
    <div className="kpi-value" style={{ color: 'var(--red)' }}>{fmt(s.totalExpenses)}</div>
    <div className="kpi-sub">{s.expensesCount} transaksi</div>
    {momExpense && <span className={`kpi-mom ${momExpense.cls}`}>{momExpense.label} vs {bulanLaluMom}</span>}
  </div>

  {/* Saldo Periode */}
  <div className="kpi-card saldo" onClick={() => router.push('/record')} style={{ cursor: 'pointer' }}>
    <div className="kpi-top">
      <div className="kpi-icon saldo">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <span className="kpi-label">Saldo Periode</span>
    </div>
    <div className="kpi-value" style={{ color: s.saldo >= 0 ? 'var(--accent)' : 'var(--red)' }}>{fmt(s.saldo)}</div>
    <div className="kpi-sub">income − pengeluaran periode</div>
    {momSaldo && <span className={`kpi-mom ${momSaldo.cls}`}>{momSaldo.label} vs {bulanLaluMom}</span>}
  </div>

  {/* Saldo Tahun */}
  <div className="kpi-card saldo-tahun" onClick={() => router.push('/record')} style={{ cursor: 'pointer' }}>
    <div className="kpi-top">
      <div className="kpi-icon saldo-tahun">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <span className="kpi-label">Saldo Tahun Ini</span>
    </div>
    <div className="kpi-value" style={{ color: saldoTahun >= 0 ? 'var(--purple)' : 'var(--red)' }}>{fmt(saldoTahun)}</div>
    <div className="kpi-sub">total income − total pengeluaran</div>
    {momSaldoTahun && <span className={`kpi-mom ${momSaldoTahun.cls}`}>{momSaldoTahun.label} vs {bulanLaluMom}</span>}
  </div>

  {/* Tarik Tunai */}
  <div className="kpi-card cash" onClick={() => router.push('/cashrecord')} style={{ gridColumn: 'span 2', cursor: 'pointer' }}>
    <div className="kpi-top">
      <div className="kpi-icon cash">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="2"/>
          <circle cx="12" cy="12" r="2"/>
          <path d="M6 12h.01M18 12h.01"/>
        </svg>
      </div>
      <span className="kpi-label">Tarik Tunai</span>
    </div>
    <div className="kpi-value" style={{ color: 'var(--yellow)' }}>{fmt(s.totalCash)}</div>
    <div className="kpi-sub">{s.cashrecordCount} transaksi</div>
  </div>
</div>
