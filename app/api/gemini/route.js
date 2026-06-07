import { NextResponse } from 'next/server'

// Urutan model: coba yang paling capable dulu, fallback ke yang lebih ringan
// gemini-2.5-flash-lite = gratis, limit lebih longgar, cocok sebagai last resort
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite']

// Timeout per request ke Gemini (30 detik)
const GEMINI_TIMEOUT_MS = 30_000

function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer))
}

// Fisher-Yates shuffle untuk distribusi key yang benar-benar acak
function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
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

    // Iterasi model → iterasi key (di-shuffle tiap model untuk distribusi merata)
    // Jika key kena 429, langsung coba key berikutnya
    // Jika semua key untuk satu model habis, pindah ke model berikutnya
    for (const mdl of modelsToTry) {
      if (responseData) break

      // Shuffle key secara acak (Fisher-Yates) agar beban tersebar merata
      const shuffledKeys = shuffleArray(apiKeys)

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
            // Tandai model yang berhasil (untuk debug)
            responseData._usedModel = mdl
            break
          }

          // Baca error
          const errText = await res.text()
          let parsed
          try { parsed = JSON.parse(errText) } catch (_) {}
          const errMsg = parsed?.error?.message || errText || `HTTP ${res.status}`

          if (res.status === 429) {
            // Rate limit → langsung coba key berikutnya dengan delay singkat
            lastError = `[${mdl}] Rate limit (key ...${key.slice(-4)}): ${errMsg}`
            // Delay 500ms sebelum coba key berikutnya
            await new Promise(r => setTimeout(r, 500))
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
