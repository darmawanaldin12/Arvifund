import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { model, contents, generationConfig } = body

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY tidak ditemukan di server' }, { status: 500 })
    }

    // Support multiple comma-separated API keys with round-robin + fallback
    const apiKeys = apiKey.split(',').map(k => k.trim()).filter(Boolean)
    const models = model
      ? [model]
      : ['gemini-2.5-flash', 'gemini-2.0-flash']

    let lastError = null
    let responseData = null

    for (const mdl of models) {
      if (responseData) break
      for (const key of apiKeys) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents, generationConfig }),
            }
          )

          if (res.ok) {
            responseData = await res.json()
            break
          } else {
            const errText = await res.text()
            let parsed
            try { parsed = JSON.parse(errText) } catch (_) {}
            lastError = parsed?.error?.message || errText || `HTTP ${res.status}`
            if (res.status === 429) {
              await new Promise(r => setTimeout(r, 500))
            }
          }
        } catch (err) {
          lastError = err.message
        }
      }
    }

    if (!responseData) {
      return NextResponse.json(
        { error: lastError || 'Gagal memproses dengan Gemini API' },
        { status: 502 }
      )
    }

    return NextResponse.json(responseData)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
