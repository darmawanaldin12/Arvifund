'use client'
import { AlertCircle, ChevronRight, Settings2, Landmark, Wallet, Banknote } from 'lucide-react'
import { fmtFull } from '../../lib/utils'

const BANK_STYLE = {
  Mandiri: { bg: 'linear-gradient(135deg,#073b8c,#0757c8)', label: 'mandiri', color: '#fff' },
  BCA: { bg: 'linear-gradient(135deg,#0875d1,#0096f2)', label: 'BCA', color: '#fff' },
  Cash: { bg: 'linear-gradient(135deg,#00a86b,#14c98b)', label: 'cash', color: '#fff' },
  BRI: { bg: 'linear-gradient(135deg,#a40020,#df153c)', label: 'BRI', color: '#fff' },
  BNI: { bg: 'linear-gradient(135deg,#f07800,#ffb000)', label: 'BNI', color: '#fff' },
}

export default function AccountSlider({ userId, userName, bankBalances, accounts, onSetSaldo, onViewHistory }) {
  const isAldin = userName?.toLowerCase().includes('ald')
  const color = isAldin ? 'var(--accent)' : '#db2777'
  const initial = userName?.[0]?.toUpperCase() || '?'
  const userAccounts = accounts.filter(a => a.user_id === userId)
  const allItems = userAccounts.map(acc => ({
    ...acc,
    ...(bankBalances[userId]?.[acc.name] || { saldo: 0, needsSetup: true, account_id: acc.id }),
  }))
  const totalSaldo = allItems.filter(a => !a.needsSetup).reduce((s, a) => s + a.saldo, 0)
  const needsSetupCount = allItems.filter(a => a.needsSetup).length

  if (allItems.length === 0) return null

  return (
    <section className="wallet-user-panel">
      <header className="wallet-user-panel-header">
        <div className="wallet-user-avatar" style={{ '--user-accent': color }}>{initial}</div>
        <div className="wallet-user-meta">
          <div className="wallet-user-name">{userName}</div>
          <div className="wallet-user-count">{needsSetupCount > 0 ? `${allItems.length - needsSetupCount} rekening aktif · ${needsSetupCount} belum diatur` : `${allItems.length} rekening aktif`}</div>
        </div>
        <div className="wallet-user-total">
          <span>Total aset</span>
          <strong>{needsSetupCount === allItems.length ? '—' : fmtFull(totalSaldo)}</strong>
        </div>
      </header>

      <div className="wallet-account-list">
        {allItems.map(acc => {
          const bank = BANK_STYLE[acc.name] || { bg: 'linear-gradient(135deg,#273449,#43536c)', label: acc.name?.slice(0, 4) || 'BANK', color: '#fff' }
          return (
            <div className="wallet-account-row" key={acc.id}>
              <button className="wallet-account-open" onClick={() => !acc.needsSetup && onViewHistory(acc)} disabled={acc.needsSetup} aria-label={`Lihat riwayat ${acc.name}`}>
                <span className="wallet-bank-logo" style={{ background: bank.bg, color: bank.color }}>
                  {acc.name === 'Cash' ? <Banknote size={23} strokeWidth={2.4} /> : <span>{bank.label}</span>}
                </span>
                <span className="wallet-account-meta">
                  <strong>{acc.name}</strong>
                  <small>{acc.needsSetup ? 'Saldo belum diatur' : acc.name === 'Cash' ? 'Tunai' : 'Rekening aktif'}</small>
                </span>
                <span className="wallet-account-balance">{acc.needsSetup ? '—' : fmtFull(acc.saldo)}</span>
                <ChevronRight className="wallet-account-chevron" size={18} />
              </button>
              <button className="wallet-account-edit" onClick={() => onSetSaldo({ account_id: acc.id, name: acc.name })} aria-label={`Ubah saldo ${acc.name}`}>
                <Settings2 size={15} />
              </button>
            </div>
          )
        })}
      </div>
      <footer className="wallet-user-panel-footer">
        <span>{needsSetupCount ? <><AlertCircle size={13} /> {needsSetupCount} saldo perlu diatur</> : <><Landmark size={13} /> Semua rekening terpantau</>}</span>
        <span className="wallet-user-footer-badge"><Wallet size={13} /> {allItems.length} rekening</span>
      </footer>
    </section>
  )
}
