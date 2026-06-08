'use client'
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, getUser } from '../lib/supabase'
import { getAllDashboardData, getProfile } from '../lib/data'
import { buildSummary, buildPeriods, getCurrentPeriodIndex, filterByPeriod } from '../lib/utils'

const DataContext = createContext(null)

export function buildBankBalances(expenses, income, cashRecords, transfers, accounts) {
  const result = {}

  const ensure = (uid, bank) => {
    if (!result[uid]) result[uid] = {}
    if (!result[uid][bank]) result[uid][bank] = { saldo: 0, needsSetup: true, balance_set_at: null, account_id: null }
  }

  accounts.forEach(acc => {
    ensure(acc.user_id, acc.name)
    const hasBaseline = !!acc.balance_set_at
    result[acc.user_id][acc.name] = {
      saldo: hasBaseline ? Number(acc.balance) : 0,
      needsSetup: !hasBaseline,
      balance_set_at: acc.balance_set_at || null,
      account_id: acc.id,
    }
  })

  const onOrAfterBaseline = (tanggal, userId, bankName) => {
    const baseline = result[userId]?.[bankName]?.balance_set_at
    if (!baseline) return false
    const baselineDate = new Date(baseline)
    baselineDate.setHours(0, 0, 0, 0)
    return new Date(tanggal + 'T00:00:00') >= baselineDate
  }

  income.forEach(r => {
    if (r.user_id && r.bank && onOrAfterBaseline(r.tanggal, r.user_id, r.bank)) {
      ensure(r.user_id, r.bank)
      result[r.user_id][r.bank].saldo += Number(r.jumlah) || 0
    }
  })

  expenses.forEach(r => {
    if (r.user_id && r.bank && onOrAfterBaseline(r.tanggal, r.user_id, r.bank)) {
      ensure(r.user_id, r.bank)
      result[r.user_id][r.bank].saldo -= Number(r.nilai) || 0
    }
  })

  cashRecords.forEach(r => {
    if (!r.user_id || !r.bank) return
    const jumlah = Number(r.nilai) || 0
    if (onOrAfterBaseline(r.tanggal, r.user_id, r.bank)) {
      ensure(r.user_id, r.bank)
      result[r.user_id][r.bank].saldo -= jumlah
    }
    if (onOrAfterBaseline(r.tanggal, r.user_id, 'Cash')) {
      ensure(r.user_id, 'Cash')
      result[r.user_id]['Cash'].saldo += jumlah
    }
  })

  transfers.forEach(r => {
    if (r.from_user && r.from_bank && onOrAfterBaseline(r.tanggal, r.from_user, r.from_bank)) {
      ensure(r.from_user, r.from_bank)
      result[r.from_user][r.from_bank].saldo -= Number(r.jumlah) || 0
    }
    if (r.to_user && r.to_bank && onOrAfterBaseline(r.tanggal, r.to_user, r.to_bank)) {
      ensure(r.to_user, r.to_bank)
      result[r.to_user][r.to_bank].saldo += Number(r.jumlah) || 0
    }
  })

  return result
}

export function DataProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [profile, setProfile]         = useState(null)
  const [profiles, setProfiles]       = useState([])
  const [expenses, setExpenses]       = useState([])
  const [income, setIncome]           = useState([])
  const [cashRecords, setCashRecords] = useState([])
  const [budgetPlans, setBudgetPlans] = useState([])
  const [transfers, setTransfers]     = useState([])
  const [accounts, setAccounts]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

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
      setAccounts(dashData.accounts || [])
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null); setProfile(null)
        setExpenses([]); setIncome([])
        setCashRecords([]); setBudgetPlans([])
        setTransfers([]); setAccounts([])
      }
    })
    return () => subscription.unsubscribe()
  }, [loadData])

  const filteredExpenses    = periodIdx !== '' ? filterByPeriod(expenses, periodIdx, payPeriodDate, overrides) : expenses
  const filteredIncome      = periodIdx !== ''
    ? filterByPeriod(income.map(r => ({ ...r, nilai: r.jumlah })), periodIdx, payPeriodDate, overrides).map(({ nilai: _, ...r }) => r)
    : income
  const filteredCashRecords = periodIdx !== '' ? filterByPeriod(cashRecords, periodIdx, payPeriodDate, overrides) : cashRecords

  const summaryPeriode = buildSummary(filteredExpenses, filteredIncome, filteredCashRecords, budgetPlans)
  const summaryAll     = buildSummary(expenses, income, cashRecords, budgetPlans)

  // Memoize bankBalances — hanya hitung ulang saat data master berubah, bukan saat periodIdx berubah
  const bankBalances = useMemo(
    () => buildBankBalances(expenses, income, cashRecords, transfers, accounts),
    [expenses, income, cashRecords, transfers, accounts]
  )

  function getUserName(userId) {
    const p = profiles.find(p => p.id === userId)
    return p?.username || 'Unknown'
  }

  return (
    <DataContext.Provider value={{
      user, profile, profiles,
      expenses, income, cashRecords, budgetPlans, transfers, accounts,
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
