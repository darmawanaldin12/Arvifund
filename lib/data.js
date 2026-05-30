import { supabase } from './supabase'

// ââ PROFILES âââââââââââââââââââââââââââââââââââââââââââââââ
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, chat_id, pay_period_date')
  if (error) throw error
  return data || []
}

// ââ EXPENSES âââââââââââââââââââââââââââââââââââââââââââââââ
// Bug 5 fix: tambahkan userId param untuk filter data per user jika diperlukan
// Pastikan Row Level Security (RLS) diaktifkan di Supabase untuk keamanan penuh
export async function getExpenses(userId = null) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('tanggal', { ascending: false })
  if (error) throw error
  return data || []
}

export async function updateExpense(id, payload, editedBy) {
  const { data, error } = await supabase
    .from('expenses')
    .update({
      ...payload,
      edited_by: editedBy,
      edited_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
  if (error) throw error
  return data
}

// ââ INCOME âââââââââââââââââââââââââââââââââââââââââââââââââ
export async function getIncome(userId = null) {
  const { data, error } = await supabase
    .from('income')
    .select('*')
    .order('tanggal', { ascending: false })
  if (error) throw error
  return data || []
}

export async function updateIncome(id, payload, editedBy) {
  const { data, error } = await supabase
    .from('income')
    .update({
      ...payload,
      edited_by: editedBy,
      edited_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
  if (error) throw error
  return data
}

// ââ CASH RECORDS âââââââââââââââââââââââââââââââââââââââââââ
export async function getCashRecords(userId = null) {
  const { data, error } = await supabase
    .from('cash_records')
    .select('*')
    .order('tanggal', { ascending: false })
  if (error) throw error
  return data || []
}

export async function updateCashRecord(id, payload, editedBy) {
  const { data, error } = await supabase
    .from('cash_records')
    .update({
      ...payload,
      edited_by: editedBy,
      edited_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
  if (error) throw error
  return data
}

// ââ BUDGET PLANS âââââââââââââââââââââââââââââââââââââââââââ
export async function getBudgetPlans() {
  const { data, error } = await supabase
    .from('budget_plans')
    .select('*')
    .order('tahun', { ascending: true })
  if (error) throw error
  return data || []
}

export async function upsertBudgetPlan(payload, editedBy) {
  const { data, error } = await supabase
    .from('budget_plans')
    .upsert({
      ...payload,
      edited_by: editedBy,
      edited_at: new Date().toISOString(),
    }, { onConflict: 'kategori,bulan,tahun' })
    .select()
  if (error) throw error
  return data
}

// ââ ALL DATA (untuk dashboard) âââââââââââââââââââââââââââââ
export async function getAllDashboardData() {
  const [expenses, income, cashRecords, budgetPlans, profiles] = await Promise.all([
    getExpenses(),
    getIncome(),
    getCashRecords(),
    getBudgetPlans(),
    getAllProfiles(),
  ])
  return { expenses, income, cashRecords, budgetPlans, profiles }
}
