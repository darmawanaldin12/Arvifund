'use client'
import { useState, useRef, useEffect } from 'react'
import { useData } from '../../components/DataContext'
import AppHeader from '../../components/layout/AppHeader'
import { fmt, fmtFull, BULAN_ORDER, KATEGORI_ICON } from '../../lib/utils'

const SUGGESTED_QUESTIONS = [
  'Bulan ini saya boros di mana?',
  'Berapa rata-rata pengeluaran harian saya?',
  'Kategori apa yang paling banyak menguras budget?',
  'Bagaimana tren keuangan saya 3 bulan terakhir?',
  'Berapa sisa budget saya bulan ini?',
  'Kapan saya bisa nabung Rp 10 juta?',
]

function buildFinancialContext({ expenses, income, cashRecords, budgetPlans, summaryPeriode, summaryAll, profiles, getUserName }) {
  const now = new Date()
  const bulanNama = BULAN_ORDER[now.getMonth()]
  const tahun = now.getFullYear()

  const totalExp = summaryAll.totalExpenses || 0
  const totalInc = summaryAll.totalIncome || 0
  const saldo    = summaryAll.saldo || 0

  const byKat = summaryPeriode.byKategori || {}
  const top5  = Object.entries(byKat).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const recentExp = [...expenses]
    .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''))
    .slice(0, 20)

  const budgetBulanIni = (budgetPlans || []).filter(p => p.bulan === bulanNama && p.tahun === tahun)
  const totalBudget    = budgetBulanIni.reduce((s, p) => s + (p.alokasi || 0), 0)
  const expBulanIni    = summaryPeriode.byBulan?.[bulanNama] || 0
  const incBulanIni    = summaryPeriode.incomeByBulan?.[bulanNama] || 0

  const byUser = summaryPeriode.byUser || {}
  const userSpending = Object.entries(byUser).map(([uid, val]) => ({
    nama: getUserName(uid), total: val,
  }))

  const recentIncTxt = income.slice(0, 10).map(r =>
    `- ${r.tanggal}: ${r.sumber || 'Pemasukan'} Rp ${r.jumlah?.toLocaleString('id-ID') || 0} (${r.bank || '-'})`
  ).join('\n')

  const recentExpTxt = recentExp.map(r =>
    `- ${r.tanggal}: ${r.toko || '-'} Rp ${r.nilai?.toLocaleString('id-ID') || 0} [${r.kategori || '-'}] via ${r.transaksi || '-'} (${r.bank || '-'}) oleh ${getUserName(r.user_id)}`
  ).join('\n')

  const budgetTxt = budgetBulanIni.length > 0
    ? budgetBulanIni.map(p => {
        const real = byKat[p.kategori] || 0
        const pct  = p.alokasi > 0 ? Math.round(real / p.alokasi * 100) : 0
        return `- ${p.kategori}: alokasi Rp ${p.alokasi?.toLocaleString('id-ID')}, realisasi Rp ${real.toLocaleString('id-ID')} (${pct}%)`
      }).join('\n')
    : '(belum ada budget plan)'

  const top5Txt = top5.map(([k, v]) =>
    `- ${k}: Rp ${v.toLocaleString('id-ID')}`
  ).join('\n')

  return `Kamu adalah Arpijan AI, asisten keuangan pribadi yang cerdas, ramah, dan jujur untuk aplikasi Arvifund milik ${profiles?.map(p => p.username).join(' & ') || 'pengguna'}.

Tanggal hari ini: ${now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
Bulan aktif: ${bulanNama} ${tahun}

=== RINGKASAN KEUANGAN (SEMUA DATA) ===
Total Pemasukan: Rp ${totalInc.toLocaleString('id-ID')}
Total Pengeluaran: Rp ${totalExp.toLocaleString('id-ID')}
Saldo Bersih: Rp ${saldo.toLocaleString('id-ID')}
Jumlah transaksi pengeluaran: ${expenses.length}
Jumlah transaksi pemasukan: ${income.length}

=== BULAN INI (${bulanNama} ${tahun}) ===
Pengeluaran: Rp ${expBulanIni.toLocaleString('id-ID')}
Pemasukan: Rp ${incBulanIni.toLocaleString('id-ID')}
Total Budget Direncanakan: Rp ${totalBudget.toLocaleString('id-ID')}
Sisa Budget: Rp ${(totalBudget - expBulanIni).toLocaleString('id-ID')}

=== TOP 5 KATEGORI PENGELUARAN (PERIODE INI) ===
${top5Txt || '(belum ada data)'}

=== PENGELUARAN PER USER (PERIODE INI) ===
${userSpending.map(u => `- ${u.nama}: Rp ${u.total.toLocaleString('id-ID')}`).join('\n') || '(belum ada data)'}

=== BUDGET VS REALISASI BULAN INI ===
${budgetTxt}

=== 20 PENGELUARAN TERAKHIR ===
${recentExpTxt || '(belum ada data)'}

=== 10 PEMASUKAN TERAKHIR ===
${recentIncTxt || '(belum ada data)'}

=== INSTRUKSI ===
- Jawab dalam Bahasa Indonesia yang santai, jelas, dan to the point.
- Gunakan data di atas sebagai sumber jawaban utama. Jangan mengarang data.
- Jika ditanya tentang proyeksi atau kalkulasi, lakukan perhitungan yang masuk akal berdasarkan data.
- Gunakan format yang mudah dibaca: boleh pakai bullet point, angka, atau tabel sederhana.
- Bersikap seperti financial advisor yang supportif — jujur tapi tidak menghakimi.
- Jika data tidak cukup untuk menjawab, katakan dengan jelas dan beri saran alternatif.
- Panggil pengguna dengan ramah. Nama user yang terdaftar: ${profiles?.map(p => p.username).join(', ') || 'teman'}.
- Selalu format angka rupiah dengan separator ribuan (contoh: Rp 1.500.000).`
}

export default function ArpijanPage() {
  const { expenses, income, cashRecords, budgetPlans, summaryPeriode, summaryAll, profiles, getUserName, loading } = useData()

  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [isTyping, setIsTyping]   = useState(false)
  const [error, setError]         = useState('')
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  async function sendMessage(text) {
    const userText = (text || input).trim()
    if (!userText || isTyping) return

    setInput('')
    setError('')

    const userMsg = { role: 'user', content: userText, id: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setIsTyping(true)

    try {
      const systemPrompt = buildFinancialContext({
        expenses, income, cashRecords, budgetPlans,
        summaryPeriode, summaryAll, profiles, getUserName,
      })

      // Bangun history percakapan untuk Gemini multi-turn
      // Pesan pertama user selalu disisipi systemPrompt
      const history = [...messages, userMsg]
      const contents = history.map((m, i) => {
        const role = m.role === 'assistant' ? 'model' : 'user'
        let text = m.content
        // Inject systemPrompt hanya di pesan user pertama
        if (m.role === 'user' && i === 0) {
          text = `${systemPrompt}\n\nPertanyaan pengguna: ${m.content}`
        }
        return { role, parts: [{ text }] }
      })

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Server error ${res.status}`)
      }

      const data = await res.json()
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!reply) throw new Error('Tidak ada respon dari Arpijan')

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        id: Date.now() + 1,
      }])
    } catch (err) {
      setError('Arpijan gagal merespons: ' + err.message)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Maaf, saya sedang tidak bisa menjawab. Coba lagi sebentar.',
        id: Date.now() + 1,
        isError: true,
      }])
    } finally {
      setIsTyping(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function clearChat() {
    setMessages([])
    setError('')
    inputRef.current?.focus()
  }

  const isEmptyChat = messages.length === 0

  return (
    <>
      <AppHeader
        title="Arpijan AI"
        subtitle="Financial Advisor Pribadi"
      />

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100dvh - var(--header-h) - var(--nav-h))',
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* ── CHAT AREA ── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px',
          WebkitOverflowScrolling: 'touch',
        }}>

          {/* ── EMPTY STATE / WELCOME ── */}
          {isEmptyChat && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60%', gap: 16, textAlign: 'center', padding: '24px 16px' }}>
              {/* Avatar */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), #818cf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, boxShadow: '0 8px 24px rgba(0,61,155,0.2)',
                border: '3px solid var(--accent-light)',
              }}>🤖</div>

              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)', marginBottom: 6 }}>
                  Halo! Saya Arpijan AI 👋
                </div>
                <div style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.6, maxWidth: 320 }}>
                  Financial advisor pribadi kamu. Tanya apa saja tentang keuangan kamu — saya sudah tahu semua datanya.
                </div>
              </div>

              {/* Quick questions */}
              <div style={{ width: '100%', maxWidth: 480 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                  Coba tanya:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text1)',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-light)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                    >
                      <span style={{ fontSize: 16 }}>💬</span>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── MESSAGES ── */}
          {messages.map((msg, i) => (
            <div key={msg.id || i} style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              gap: 8,
              marginBottom: 16,
            }}>
              {/* Avatar */}
              {msg.role === 'assistant' && (
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--accent), #818cf8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16,
                }}>🤖</div>
              )}

              {/* Bubble */}
              <div style={{
                maxWidth: '78%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user'
                  ? '16px 4px 16px 16px'
                  : '4px 16px 16px 16px',
                background: msg.role === 'user'
                  ? 'var(--accent)'
                  : msg.isError
                    ? 'var(--red-bg)'
                    : 'var(--surface)',
                color: msg.role === 'user'
                  ? 'white'
                  : msg.isError
                    ? 'var(--red)'
                    : 'var(--text1)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* ── TYPING INDICATOR ── */}
          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--accent), #818cf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>🤖</div>
              <div style={{
                padding: '12px 16px',
                borderRadius: '4px 16px 16px 16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {[0, 0.2, 0.4].map((delay, i) => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: 'var(--accent)',
                    animation: `dotBounce 1.2s ease-in-out ${delay}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── SUGGESTED CHIPS (saat sudah ada chat) ── */}
        {!isEmptyChat && (
          <div style={{
            padding: '8px 16px 0',
            display: 'flex', gap: 6, overflowX: 'auto',
            scrollbarWidth: 'none',
          }}>
            {SUGGESTED_QUESTIONS.slice(0, 4).map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                disabled={isTyping}
                style={{
                  flexShrink: 0,
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text2)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: isTyping ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                  opacity: isTyping ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* ── INPUT AREA ── */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}>
          {/* Clear button */}
          {!isEmptyChat && (
            <button
              onClick={clearChat}
              title="Hapus percakapan"
              style={{
                width: 40, height: 40, flexShrink: 0,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--surface2)',
                color: 'var(--text3)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete_sweep</span>
            </button>
          )}

          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Tanya Arpijan tentang keuangan kamu..."
              rows={1}
              disabled={isTyping}
              style={{
                width: '100%',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 20,
                padding: '10px 16px',
                color: 'var(--text1)',
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                lineHeight: 1.5,
                maxHeight: 120,
                overflowY: 'auto',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
            />
          </div>

          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isTyping}
            style={{
              width: 40, height: 40, flexShrink: 0,
              borderRadius: '50%',
              border: 'none',
              background: (!input.trim() || isTyping) ? 'var(--surface2)' : 'var(--accent)',
              color: (!input.trim() || isTyping) ? 'var(--text3)' : 'white',
              cursor: (!input.trim() || isTyping) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
              {isTyping ? 'more_horiz' : 'send'}
            </span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes dotBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </>
  )
}
