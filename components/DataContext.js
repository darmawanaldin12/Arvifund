'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, getUser } from '../lib/supabase'
import { getAllDashboardData, getProfile } from '../lib/data'
import { buildSummary, buildPeriods, getCurrentPeriodIndex, filterByPeriod } from '../lib/utils'

const DataContext = createContext(null)

// ── Hitung saldo per bank per user dari semua transaksi ───
// Formula:
//   saldo[userId][bank] =
//     income masuk ke bank ini
//     - expenses yang pakai bank ini
//     - cash_records (tarik tunai) dari bank ini
//     - transfers KELUAR dari bank ini (from_user=userId, from_bank=bank)
//     + transfers MASUK ke bank ini (to_user=userId, to_bank=bank)
export function buildBankBalances(expenses, income, cashRecords, transfers, profiles) {
  const result = {} // { userId: { bankName: saldo } }

  const ensureUser = (uid) => {
    if (!result[uid]) result[uid] = {}
  }
  const add = (uid, bank, val) => {
    ensureUser(uid)
    result[uid][bank] = (result[uid][bank] || 0) + val
  }

  // Income → tambah saldo bank penerima
  income.forEach(r => {
    if (r.user_id && r.bank) add(r.user_id, r.bank, r.jumlah || 0)
  })

  // Expenses → kurangi saldo bank yang dipakai
  expenses.forEach(r => {
    if (r.user_id && r.bank) add(r.user_id, r.bank, -(r.nilai || 0))
  })

  // Cash records (tarik tunai) → kurangi saldo bank asal
  cashRecords.forEach(r => {
    if (r.user_id && r.bank) add(r.user_id, r.bank, -(r.nilai || 0))
  })

  // Transfers → kurangi from, tambah to
  transfers.forEach(r => {
    if (r.from_user && r.from_bank) add(r.from_user, r.from_bank, -(r.jumlah || 0))
    if (r.to_user && r.to_bank)     add(r.to_user,   r.to_bank,    (r.jumlah || 0))
  })

  return result
}

export function DataProvider({ children }) {
  const [user, setUser]           = useState(null)
  const [profile, setProfile]     = useState(null)
  const [profiles, setProfiles]   = useState([])
  const [expenses, setExpenses]   = useState([])
  const [income, setIncome]       = useState([])
  const [cashRecords, setCashRecords] = useState([])
  const [budgetPlans, setBudgetPlans] = useState([])
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  // Period filter
  const payPeriodDate = profile?.pay_period_date || 25
  const overrides     = profile?.pay_period_overrides || {}
  const periods       = buildPeriods(payPeriodDate, overrides)
  const [periodIdx, setPeriodIdx] = useState('')

  useEffect(() => {
    if (profile) {
      const idx = getCurrentPeriodIndex(profile.pay_period_date || 25, profile.pay_period_overrides || {})
      setPeriodIdx(String(idx))
    }
  }, [profile])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const u = await getUser()
      if (!u) return
      setUser(u)

      const [profileData, dashData] = await Promise.all([
        getProfile(u.id),
        getAllDashboardData(),
      ])

      setProfile(profileData)
      setProfiles(dashData.profiles || [])
      setExpenses(dashData.expenses || [])
      setIncome(dashData.income || [])
      setCashRecords(dashData.cashRecords || [])
      setBudgetPlans(dashData.budgetPlans || [])
      setTransfers(dashData.transfers || [])
      setLastRefresh(new Date())
    } catch (err) {
      setError(err.message)
      console.error('loadData error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setExpenses([])
        setIncome([])
        setCashRecords([])
        setBudgetPlans([])
        setTransfers([])
      }
    })
    return () => subscription.unsubscribe()
  }, [loadData])

  const filteredExpenses = periodIdx !== '' ? filterByPeriod(expenses, periodIdx, payPeriodDate, overrides) : expenses
  const filteredIncome = periodIdx !== ''
    ? filterByPeriod(income.map(r => ({ ...r, nilai: r.jumlah })), periodIdx, payPeriodDate, overrides)
      .map(({ nilai: _nilai, ...r }) => r)
    : income
  const filteredCashRecords = periodIdx !== '' ? filterByPeriod(cashRecords, periodIdx, payPeriodDate, overrides) : cashRecords

  const summaryPeriode = buildSummary(filteredExpenses, filteredIncome, filteredCashRecords, budgetPlans)
  const summaryAll     = buildSummary(expenses, income, cashRecords, budgetPlans)

  // Saldo per bank per user — dihitung dari semua data historis (bukan filtered)
  const bankBalances = buildBankBalances(expenses, income, cashRecords, transfers, profiles)

  function getUserName(userId) {
    const p = profiles.find(p => p.id === userId)
    return p?.username || 'Unknown'
  }

  return (
    <DataContext.Provider value={{
      user, profile, profiles,
      expenses, income, cashRecords, budgetPlans, transfers,
      filteredExpenses, filteredIncome, filteredCashRecords,
      summaryPeriode, summaryAll,
      bankBalances,
      loading, error, lastRefresh,
      periodIdx, setPeriodIdx,
      periods, payPeriodDate, overrides,
      loadData, getUserName,
      setExpenses, setIncome, setCashRecords, setBudgetPlans, setTransfers,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
