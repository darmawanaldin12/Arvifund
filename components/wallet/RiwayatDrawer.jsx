'use client'
import { motion } from 'motion/react'
import { X, TrendingUp, TrendingDown } from 'lucide-react'
import { CARD_THEME } from './AtmCard'
import { fmtFull, fmtTanggalShort } from '../../lib/utils'

export default function RiwayatDrawer({ account, userName, expenses, income, cashRecords, transfers, getUserName, periodIdx, periods, onClose }) {
  const theme = CARD_THEME[account.name] || CARD_THEME.default

  const baselineDate = account.balance_set_at ? (() => {
    const d = new Date(account.balance_set_at); d.setHours(0,0,0,0); return d
  })() : null

  const inPeriod = (tanggal) => {
    if (periodIdx === '' || periodIdx === null) return true
    const idx = parseInt(periodIdx); if (isNaN(idx)) return true
    const p = periods[idx]; if (!p) return true
    const d = new Date(tanggal + 'T00:00:00')
    return d >= p.start && d <= p.end
  }

  const afterBaseline = (tanggal) => {
    if (!baselineDate) return false
    return new Date(tanggal + 'T00:00:00') >= baselineDate
  }

  const rows = []
  income.forEach(r => {
    if (r.bank === account.name && r.user_id === account.user_id && afterBaseline(r.tanggal) && inPeriod(r.tanggal))
      rows.push({ id: r.id, tanggal: r.tanggal, label: r.sumber || 'Pemasukan', sub: r.kategori || '', amount: r.jumlah, type: 'in' })
  })
  expenses.forEach(r => {
    if (r.bank === account.name && r.user_id === account.user_id && afterBaseline(r.tanggal) && inPeriod(r.tanggal))
      rows.push({ id: r.id, tanggal: r.tanggal, label: r.toko || 'Pengeluaran', sub: r.kategori || '', amount: r.nilai, type: 'out' })
  })
  cashRecords.forEach(r => {
    if (!afterBaseline(r.tanggal) || !inPeriod(r.tanggal)) return
    if (r.bank === account.name && r.user_id === account.user_id)
      rows.push({ id: r.id + '_out', tanggal: r.tanggal, label: r.transaksi || 'Tarik Tunai', sub: 'ke Cash', amount: r.nilai, type: 'out' })
    if (account.name === 'Cash' && r.user_id === account.user_id)
      rows.push({ id: r.id + '_in', tanggal: r.tanggal, label: r.transaksi || 'Tarik Tunai', sub: `dari ${r.bank}`, amount: r.nilai, type: 'in' })
  })
  transfers.forEach(r => {
    if (!afterBaseline(r.tanggal) || !inPeriod(r.tanggal)) return
    if (r.from_user === account.user_id && r.from_bank === account.name)
      rows.push({ id: r.id + '_out', tanggal: r.tanggal, label: `Transfer ke ${r.from_user === r.to_user ? r.to_bank : getUserName(r.to_user)}`, sub: r.catatan || '', amount: r.jumlah, type: 'out' })
    if (r.to_user === account.user_id && r.to_bank === account.name)
      rows.push({ id: r.id + '_in', tanggal: r.tanggal, label: `Transfer dari ${r.from_user === r.to_user ? r.from_bank : getUserName(r.from_user)}`, sub: r.catatan || '', amount: r.jumlah, type: 'in' })
  })
  rows.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))

  const totalIn  = rows.filter(r => r.type === 'in').reduce((s, r) => s + r.amount, 0)
  const totalOut = rows.filter(r => r.type === 'out').reduce((s, r) => s + r.amount, 0)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 350 }}
        style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 560, maxHeight: '88dvh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: theme.bg, borderRadius: '20px 20px 0 0', padding: '16px 20px 14px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 36 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '0.04em' }}>{account.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{userName}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>Saldo</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: account.saldo < 0 ? '#ff6b6b' : '#fff' }}>{fmtFull(account.saldo)}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>Masuk</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#6ee7b7' }}>{fmtFull(totalIn)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>Keluar</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fca5a5' }}>{fmtFull(totalOut)}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', padding: '4px 6px', display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px', paddingBottom: 'calc(60px + max(env(safe-area-inset-bottom), 16px) + 8px)' }}>
          {rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>Belum ada transaksi di periode ini</div>
          ) : rows.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: r.type === 'in' ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {r.type === 'in' ? <TrendingUp size={15} color="var(--green)" /> : <TrendingDown size={15} color="var(--red)" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtTanggalShort(r.tanggal)}{r.sub ? ` · ${r.sub}` : ''}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: r.type === 'in' ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>
                {r.type === 'in' ? '+' : '-'}{fmtFull(r.amount)}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
