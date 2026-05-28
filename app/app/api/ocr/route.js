import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `Kamu adalah asisten keuangan. Analisis struk/nota/bukti transaksi dari gambar ini dan ekstrak informasi dalam format PERSIS berikut (tidak ada teks lain):

TOKO: [nama toko/merchant, tulis "Tidak diketahui" jika tidak ada]
TOTAL: [angka saja tanpa Rp, titik, atau koma, contoh: 18000]
ITEMS: [daftar barang/keterangan singkat, pisahkan dengan koma]
KATEGORI: [pilih SATU: Makanan & Minuman/Tagihan/Transportasi/Kesehatan/Pakaian/Elektronik/Rumah Tangga/Pendidikan/Hiburan/Cicilan/Investasi/Lainnya]
JENIS: [pilih SATU: Pengeluaran/Pemasukan/Tarik Tunai]
METODE: [pilih SATU: Cash/Transfer/Debit/Kredit/QRIS]
BANK: [nama bank atau Cash jika tunai]
TANGGAL_STRUK: [format YYYY-MM-DD, gunakan hari ini jika tidak ada]

Penting: TOTAL harus angka murni tanpa simbol apapun.`;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image');

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada gambar yang diunggah' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    const payload = {
      contents: [{
        parts: [
          { text: SYSTEM_PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
    };

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Gemini OCR error:', err);
      return NextResponse.json({ error: 'Gagal memproses gambar dengan AI' }, { status: 500 });
    }

    const data = await res.json();
    const output = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!output) return NextResponse.json({ error: 'AI tidak menghasilkan output' }, { status: 500 });

    return NextResponse.json({ output });
  } catch (error) {
    console.error('OCR route error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
