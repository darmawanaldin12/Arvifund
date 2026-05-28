import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `Kamu adalah asisten keuangan pribadi. Analisis gambar struk atau catatan transaksi dari pengguna. Ekstrak informasi transaksi seperti jumlah, kategori, merchant, metode pembayaran, dan tanggal jika tersedia. Balas hanya JSON valid.`;

export async function POST(req) {
  try {
    const body = await req.json();

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: SYSTEM_PROMPT }, ...(body?.parts || [])] }],
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
