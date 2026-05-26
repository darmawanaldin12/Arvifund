import { supabase } from '@/lib/supabase'

async function getDashboardData() {
  const [{ data: expenses }, { data: income }] = await Promise.all([
    supabase.from('expenses').select('amount'),
    supabase.from('income').select('amount'),
  ])

  const totalExpense = expenses?.reduce((sum, item) => sum + Number(item.amount ?? 0), 0) ?? 0
  const totalIncome = income?.reduce((sum, item) => sum + Number(item.amount ?? 0), 0) ?? 0

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactions: expenses?.length ?? 0,
  }
}

export default async function Home() {
  const data = await getDashboardData()

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold">Arvifund</h1>
        <p className="text-slate-400 mt-1">Family finance dashboard</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <Card title="Saldo" value={data.balance} />
          <Card title="Pemasukan" value={data.totalIncome} />
          <Card title="Pengeluaran" value={data.totalExpense} />
          <Card title="Transaksi" rawValue={data.transactions} />
        </div>
      </div>
    </main>
  )
}

function Card({ title, value, rawValue }: { title: string; value?: number; rawValue?: number }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="text-2xl font-semibold mt-2">{rawValue ?? `Rp ${value?.toLocaleString('id-ID')}`}</p>
    </div>
  )
}
