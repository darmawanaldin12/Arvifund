import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { getLocalDateStr } from '../../../../lib/utils'

// Route ini di-trigger Vercel Cron (lihat vercel.json), jadi harus jalan di
// Node.js runtime (bukan Edge) karena pakai library 'web-push'.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  // Pakai SERVICE ROLE key (bukan anon key) karena RLS di semua tabel
  // mensyaratkan auth.role() = 'authenticated' — cron job tidak punya
  // sesi login user, jadi harus lewat service role untuk bisa baca lintas user.
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(request) {
  // Proteksi endpoint: Vercel otomatis mengirim header ini kalau env var
  // CRON_SECRET diset, jadi endpoint ini tidak bisa dipicu sembarang orang.
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return Response.json({ error: 'Env var belum lengkap (SUPABASE_SERVICE_ROLE_KEY / VAPID keys)' }, { status: 500 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  const today = getLocalDateStr() // format YYYY-MM-DD, mengikuti WIB (Asia/Jakarta)

  const [profilesRes, expensesRes, incomeRes, cashRes, subsRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, username').not('username', 'is', null),
    supabaseAdmin.from('expenses').select('user_id').eq('tanggal', today),
    supabaseAdmin.from('income').select('user_id').eq('tanggal', today),
    supabaseAdmin.from('cash_records').select('user_id').eq('tanggal', today),
    supabaseAdmin.from('push_subscriptions').select('*'),
  ])

  const firstError = [profilesRes, expensesRes, incomeRes, cashRes, subsRes].find(r => r.error)
  if (firstError) {
    return Response.json({ error: firstError.error.message }, { status: 500 })
  }

  const profiles = profilesRes.data || []
  const subs     = subsRes.data || []

  const sudahCatat = new Set([
    ...(expensesRes.data || []).map(r => r.user_id),
    ...(incomeRes.data || []).map(r => r.user_id),
    ...(cashRes.data || []).map(r => r.user_id),
  ])

  const belumCatat = profiles.filter(p => !sudahCatat.has(p.id))

  const results = []
  for (const person of belumCatat) {
    const userSubs = subs.filter(s => s.user_id === person.id)
    if (userSubs.length === 0) {
      results.push({ user: person.username, status: 'no_subscription' })
      continue
    }
    for (const sub of userSubs) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }
      const payload = JSON.stringify({
        title: 'Belum catat transaksi hari ini 👀',
        body: `Hai ${person.username}, jangan lupa catat transaksi hari ini di Arvifund ya.`,
        url: '/transaksi',
      })
      try {
        await webpush.sendNotification(pushSubscription, payload)
        results.push({ user: person.username, status: 'sent' })
      } catch (err) {
        results.push({ user: person.username, status: 'failed', error: err.message })
        // Subscription sudah tidak valid (browser uninstall/cabut izin) → bersihkan dari DB
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }
  }

  return Response.json({
    date: today,
    totalUser: profiles.length,
    sudahCatat: profiles.length - belumCatat.length,
    belumCatat: belumCatat.map(p => p.username),
    results,
  })
}
