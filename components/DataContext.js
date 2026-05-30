'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, getUser } from '../lib/supabase'
import { getAllDashboardData, getProfile } from '../lib/data'
import { buildSummary, buildPeriods, getCurrentPeriodIndex, filterByPeriod } from '../lib/utils'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [user, setUser]           = useState(null)
  const [profile, setProfile]     = useState(null)
  const [profiles, setProfiles]   = useState([])
  const [expenses, setExpenses]   = useState([])
  const [income, setIncome]       = useState([])
  const [cashRecords, setCashRecords] = useState([])
  const [budgetPlans, setBudgetPlans] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  // Period filter
  const payPeriodDate = profile?.pay_period_date || 25
  const overrides     = profile?.pay_period_overrides || {}
  const periods       = buildPeriods(payPeriodDate, overrides)
  const [periodIdx, setPeriodIdx] = useState('')

  // Set period ke current saat profile loaded
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
    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setExpenses([])
        setIncome([])
        setCashRecords([])
        setBudgetPlans([])
      }
    })
    return () => subscription.unsubscribe()
  }, [loadData])

  // Filtered data berdasarkan period
  const filteredExpenses   = periodIdx !== '' ? filterByPeriod(expenses, periodIdx, payPeriodDate, overrides)   : expenses
  const filteredIncome     = periodIdx !== '' ? filterByPeriod(income.map(r => ({ ...r, nilai: r.jumlah })), periodIdx, payPeriodDate, overrides).map(r => ({ ...r })) : income
  const filteredCashRecords = periodIdx !== '' ? filterByPeriod(cashRecords, periodIdx, payPeriodDate, overrides) : cashRecords

  // Summary untuk periode aktif
  const summaryPeriode = buildSummary(filteredExpenses, filteredIncome, filteredCashRecords, budgetPlans)
  // Summary untuk semua data (tahun ini)
  const summaryAll = buildSummary(expenses, income, cashRecords, budgetPlans)

  // Username lookup
  function getUserName(userId) {
    const p = profiles.find(p => p.id === userId)
    return p?.username || 'Unknown'
  }

  return (
    <DataContext.Provider value={{
      user, profile, profiles,
      expenses, income, cashRecords, budgetPlans,
      filteredExpenses, filteredIncome, filteredCashRecords,
      summaryPeriode, summaryAll,
      loading, error, lastRefresh,
      periodIdx, setPeriodIdx,
      periods, payPeriodDate, overrides,
      loadData, getUserName,
      setExpenses, setIncome, setCashRecords, setBudgetPlans,
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
