import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `Kamu adalah asisten keuangan pribadi. Dengarkan voice note ini dan ekstrak informasi transaksi keuangan. Format output PERSIS seperti berikut:

TOKO: [nama toko/merchant/sumber]
TOTAL: [angka saja tanpa Rp, titik, atau koma. Contoh: 150000]
ITEMS: [daftar barang atau keterangan transaksi]
KATEGORI: [pilih salah satu: Makanan & Minuman/Tagihan/Transportasi/Kesehatan/Pakaian/Elektronik/Rumah Tangga/Pendidikan/Hiburan/Cicilan/Investasi/Lainnya]
JENIS: [pilih salah satu: Pengeluaran/Pemasukan/Tarik Tunai]
METODE: [pilih salah satu: Cash/Transfer/Debit/Kredit]
BANK: [nama bank atau Cash]
TANGGAL_STRUK: [format YYYY-MM-DD, gunakan hari ini jika tidak disebutkan]

Catatan:
- Transkripsi dulu audio, lalu ekstrak informasi
- TOTAL hanya angka murni
- Jika ada kata "beli", "bayar", "belanja" → JENIS: Pengeluaran
- Jika ada kata "terima", "dapat", "gaji", "masuk" → JENIS: Pemasukan
- Jika ada kata "tarik", "ATM", "ambil tunai" → JENIS: Tarik Tunai`;

export async function POST(request) {
  try {
    // Dibaca saat runtime, bukan build time
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const formData = await request.formData();
    const file = formData.get('audio');

    if (!file) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = file.type || 'audio/webm';

    const payload = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
            {
              text: SYSTEM_PROMPT,
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
      console.error('Gemini Voice error:', err);
      return NextResponse.json({ error: 'Gemini API error', detail: err }, { status: 500 });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ result: text });
  } catch (error) {
    console.error('Voice route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
