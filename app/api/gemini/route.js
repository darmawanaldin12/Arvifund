import { NextResponse } from 'next/server'

// Hanya gunakan gemini-2.5-flash
const MODELS = ['gemini-2.5-flash']

// Timeout per request ke Gemini (30 detik)
const GEMINI_TIMEOUT_MS = 30_000

function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer))
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { model, contents, generationConfig, systemInstruction } = body

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY tidak ditemukan di server' },
        { status: 500 }
      )
    }

    // Support multiple comma-separated API keys
    const apiKeys = apiKey.split(',').map(k => k.trim()).filter(Boolean)

    // Jika model diminta secara eksplisit, pastikan hanya dari daftar yang diizinkan
    // Kalau model yang diminta tidak ada di daftar, fallback ke urutan default
    const requestedModel = model && MODELS.includes(model) ? model : null
    const modelsToTry = requestedModel
      ? [requestedModel, ...MODELS.filter(m => m !== requestedModel)]
      : MODELS

    let lastError = null
    let responseData = null

    // Iterasi model → iterasi key
    // Jika key kena 429, langsung coba key berikutnya (bukan tunggu lama)
    // Jika semua key untuk satu model habis, pindah ke model berikutnya
    for (const mdl of modelsToTry) {
      if (responseData) break

      // Acak urutan key untuk distribusi beban merata (round-robin sederhana)
      const shuffledKeys = [...apiKeys]

      for (const key of shuffledKeys) {
        if (responseData) break

        try {
          const requestBody = { contents, generationConfig }
          // Sertakan systemInstruction jika ada
          if (systemInstruction) {
            requestBody.systemInstruction = systemInstruction
          }

          const res = await fetchWithTimeout(
            `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            },
            GEMINI_TIMEOUT_MS
          )

          if (res.ok) {
            responseData = await res.json()
            // Tandai model yang berhasil (opsional, untuk debug)
            responseData._usedModel = mdl
            break
          }

          // Baca error
          const errText = await res.text()
          let parsed
          try { parsed = JSON.parse(errText) } catch (_) {}
          const errMsg = parsed?.error?.message || errText || `HTTP ${res.status}`

          if (res.status === 429) {
            // Rate limit → langsung coba key berikutnya, tanpa delay panjang
            lastError = `[${mdl}] Rate limit (key ...${key.slice(-4)}): ${errMsg}`
            // Delay singkat 200ms sebelum coba key berikutnya
            await new Promise(r => setTimeout(r, 200))
            continue
          }

          if (res.status === 503 || res.status === 500) {
            // Server error → coba key berikutnya
            lastError = `[${mdl}] Server error ${res.status}: ${errMsg}`
            continue
          }

          if (res.status === 400) {
            // Bad request → tidak perlu coba key lain, tapi coba model lain
            lastError = `[${mdl}] Bad request: ${errMsg}`
            break // break dari loop key, lanjut ke model berikutnya
          }

          // Error lainnya
          lastError = `[${mdl}] Error ${res.status}: ${errMsg}`
          continue

        } catch (err) {
          if (err.name === 'AbortError') {
            // Timeout → coba model/key berikutnya
            lastError = `[${mdl}] Timeout setelah ${GEMINI_TIMEOUT_MS / 1000}s (key ...${key.slice(-4)})`
            continue
          }
          // Network error → coba key berikutnya
          lastError = `[${mdl}] Network error: ${err.message}`
          continue
        }
      }
    }

    if (!responseData) {
      console.error('Semua model & key gagal. Error terakhir:', lastError)
      return NextResponse.json(
        { error: lastError || 'Gagal memproses dengan Gemini API' },
        { status: 502 }
      )
    }

    return NextResponse.json(responseData)

  } catch (err) {
    console.error('Gemini route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
