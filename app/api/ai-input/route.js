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
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found in environment');
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

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

    console.log('Sending request to Gemini API...');
    console.log('Payload size:', JSON.stringify(payload).length, 'bytes');

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('Gemini API Response Status:', res.status, res.statusText);

    const responseText = await res.text();
    console.log('Gemini API Response Body:', responseText);

    if (!res.ok) {
      return NextResponse.json(
        { 
          error: 'Gemini API error', 
          status: res.status,
          statusText: res.statusText,
          detail: responseText,
        }, 
        { status: 500 }
      );
    }

    const data = JSON.parse(responseText);
    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!result) {
      console.error('No text in response:', JSON.stringify(data));
      return NextResponse.json(
        { error: 'No response from Gemini API', response: data }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('AI Input route error:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
