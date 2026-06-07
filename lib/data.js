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
    .not('toko', 'like', '[AUDIT]%')
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

export async function deleteExpense(id) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── INCOME ─────────────────────────────────────────────────
export async function getIncome() {
  const { data, error } = await supabase
    .from('income')
    .select('*')
    .not('sumber', 'like', '[AUDIT]%')
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

// ── ACCOUNTS ───────────────────────────────────────────────
export async function getAccounts() {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, user_id, name, type, balance')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data || []
}

/**
 * Lookup account UUID berdasarkan user_id + nama bank.
 * Throws jika tidak ditemukan — agar error jelas di UI.
 */
export async function findAccountId(userId, bankName) {
  const { data, error } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('name', bankName)
    .single()
  if (error || !data) {
    throw new Error(`Rekening "${bankName}" tidak ditemukan untuk user ini. Pastikan rekening sudah ditambahkan di tabel accounts.`)
  }
  return data.id
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

/**
 * Insert transfer dengan auto-lookup from_account_id & to_account_id
 * dari tabel accounts berdasarkan (user_id + bank name).
 */
export async function insertTransfer(payload, editedBy) {
  const { from_user, to_user, from_bank, to_bank } = payload

  const [fromAccountId, toAccountId] = await Promise.all([
    findAccountId(from_user, from_bank),
    findAccountId(to_user, to_bank),
  ])

  const { data, error } = await supabase
    .from('transfers')
    .insert([{
      ...payload,
      from_account_id: fromAccountId,
      to_account_id:   toAccountId,
      user_id:         editedBy,
      edited_by:       editedBy,
      edited_at:       new Date().toISOString(),
    }])
    .select()
  if (error) throw error
  return data
}

export async function updateTransfer(id, payload, editedBy) {
  const { from_user, to_user, from_bank, to_bank } = payload

  const [fromAccountId, toAccountId] = await Promise.all([
    findAccountId(from_user, from_bank),
    findAccountId(to_user, to_bank),
  ])

  const { data, error } = await supabase
    .from('transfers')
    .update({
      ...payload,
      from_account_id: fromAccountId,
      to_account_id:   toAccountId,
      edited_by:       editedBy,
      edited_at:       new Date().toISOString(),
    })
    .eq('id', id)
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
