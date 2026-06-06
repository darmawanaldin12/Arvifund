import { supabase } from './supabase'

// ── PROFILES ───────────────────────────────────────────────
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
    .select('id, username, chat_id, pay_period_date, pay_period_overrides')
  if (error) throw error
  return data || []
}

// ── EXPENSES ───────────────────────────────────────────────
export async function getExpenses() {
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

// ── INCOME ─────────────────────────────────────────────────
export async function getIncome() {
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

// ── CASH RECORDS ───────────────────────────────────────────
export async function getCashRecords() {
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

// ── BUDGET PLANS ───────────────────────────────────────────
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

// ── TRANSFERS ──────────────────────────────────────────────
export async function getTransfers() {
  const { data, error } = await supabase
    .from('transfers')
    .select('*')
    .order('tanggal', { ascending: false })
  if (error) throw error
  return data || []
}

export async function insertTransfer(payload, editedBy) {
  // user_id WAJIB diisi agar RLS policy (authenticated users can insert) terpenuhi
  const { data, error } = await supabase
    .from('transfers')
    .insert([{
      ...payload,
      user_id:   editedBy,   // kolom user_id = user yang sedang login
      edited_by: editedBy,
      edited_at: new Date().toISOString(),
    }])
    .select()
  if (error) throw error
  return data
}

export async function deleteTransfer(id) {
  const { error } = await supabase
    .from('transfers')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── ALL DATA (untuk dashboard) ─────────────────────────────
export async function getAllDashboardData() {
  const [expenses, income, cashRecords, budgetPlans, profiles, transfers] = await Promise.all([
    getExpenses(),
    getIncome(),
    getCashRecords(),
    getBudgetPlans(),
    getAllProfiles(),
    getTransfers(),
  ])
  return { expenses, income, cashRecords, budgetPlans, profiles, transfers }
}
