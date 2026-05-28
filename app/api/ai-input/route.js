import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `Kamu adalah asisten keuangan pribadi. Pengguna akan mendeskripsikan transaksi keuangan dalam bahasa natural (Indonesia atau Inggris). Ekstrak informasi dan format output PERSIS seperti berikut:

TOKO: [nama toko/merchant/sumber transaksi]
TOTAL: [angka saja tanpa Rp, titik, atau koma. Contoh: 150000]
ITEMS: [daftar barang atau keterangan transaksi]
KATEGORI: [pilih salah satu: Makanan & Minuman/Tagihan/Transportasi/Kesehatan/Pakaian/Elektronik/Rumah Tangga/Pendidikan/Hiburan/Cicilan/Investasi/Lainnya]
JENIS: [pilih salah satu: Pengeluaran/Pemasukan/Tarik Tunai]
METODE: [pilih salah satu: Cash/Transfer/Debit/Kredit]
BANK: [nama bank atau Cash jika tunai]
TANGGAL_STRUK: [format YYYY-MM-DD, gunakan hari ini jika tidak disebutkan]

Contoh input: "tadi beli makan siang di warteg 15ribu bayar cash"
Contoh output:
TOKO: Warteg
TOTAL: 15000
ITEMS: Makan siang
KATEGORI: Makanan & Minuman
JENIS: Pengeluaran
METODE: Cash
BANK: Cash
TANGGAL_STRUK: 2025-01-15

Penting:
- TOTAL hanya angka murni (15rb = 15000, 1.5jt = 1500000)
- Selalu isi semua field
- Interpretasi angka dalam bahasa Indonesia (k/rb = ribu, jt = juta)`;

export async function POST(request) {
  try {
    // Dibaca saat runtime, bukan build time
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const body = await request.json();
    const { text } = body;

    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `${SYSTEM_PROMPT}\n\nInput pengguna: "${text}"`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    };

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Gemini AI Input error:', err);
      return NextResponse.json({ error: 'Gemini API error', detail: err }, { status: 500 });
    }

    const data = await res.json();
    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ result });
  } catch (error) {
    console.error('AI Input route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
