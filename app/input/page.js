'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const KATEGORI_LIST = [
  'Makanan & Minuman', 'Tagihan', 'Transportasi', 'Kesehatan',
  'Pakaian', 'Elektronik', 'Rumah Tangga', 'Pendidikan',
  'Hiburan', 'Cicilan', 'Investasi', 'Lainnya',
];
const JENIS_LIST = ['Pengeluaran', 'Pemasukan', 'Tarik Tunai'];
const METODE_LIST = ['Cash', 'Transfer', 'Debit', 'Kredit', 'QRIS'];

function parseOutput(output) {
  const get = (key) => {
    const match = output.match(new RegExp(`${key}:\\s*(.+)`));
    return match ? match[1].trim().replace(/^=/, '') : '';
  };
  return {
    toko: get('TOKO'),
    total: get('TOTAL'),
    items: get('ITEMS'),
    kategori: get('KATEGORI'),
    jenis: get('JENIS'),
    metode: get('METODE'),
    bank: get('BANK'),
    tanggal: get('TANGGAL_STRUK'),
  };
}

function getBulan(tanggal) {
  const bulanArr = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  try {
    const d = new Date(tanggal);
    return bulanArr[d.getMonth()];
  } catch { return ''; }
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      background: type === 'success' ? 'var(--green)' : 'var(--red)',
      color: '#fff', padding: '12px 24px', borderRadius: 'var(--radius-sm)',
      fontWeight: 600, fontSize: 14, zIndex: 9999, whiteSpace: 'nowrap',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)', animation: 'fadeUp 0.3s ease',
    }}>
      {message}
    </div>
  );
}

function FieldRow({ label, value, onChange, type = 'text', options }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </label>
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={{
          width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)',
          borderRadius: 'var(--radius-sm)', color: 'var(--text1)', padding: '10px 12px',
          fontSize: 14, outline: 'none',
        }}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{
          width: '100%', background: 'var(--surface2)', border: '1px solid var(--border2)',
          borderRadius: 'var(--radius-sm)', color: 'var(--text1)', padding: '10px 12px',
          fontSize: 14, outline: 'none', boxSizing: 'border-box',
        }} />
      )}
    </div>
  );
}

export default function InputPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('foto');
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [form, setForm] = useState({});
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef();
  const [inputText, setInputText] = useState('');
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setParsed(null); setForm({});
  };

  const handleOCR = async () => {
    if (!imageFile) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('image', imageFile);
      const res = await fetch('/api/ocr', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const p = parseOutput(data.output);
      setParsed(p); setForm(p);
    } catch (err) {
      showToast(err.message || 'Gagal memproses gambar', 'error');
    } finally { setLoading(false); }
  };

  const handleTextSubmit = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const p = parseOutput(data.output);
      setParsed(p); setForm(p);
    } catch (err) {
      showToast(err.message || 'Gagal memproses teks', 'error');
    } finally { setLoading(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob); setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(); mediaRecorderRef.current = mr; setRecording(true);
    } catch { showToast('Izin mikrofon diperlukan', 'error'); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false); };

  const handleVoiceUploadChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAudioBlob(file); setAudioUrl(URL.createObjectURL(file));
    setParsed(null); setForm({});
  };

  const handleVoiceSubmit = async () => {
    if (!audioBlob) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('audio', audioBlob, 'recording.webm');
      const res = await fetch('/api/voice', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const p = parseOutput(data.output);
      setParsed(p); setForm(p);
    } catch (err) {
      showToast(err.message || 'Gagal memproses audio', 'error');
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Silakan login terlebih dahulu');
      const bulan = getBulan(form.tanggal);
      const nilai = parseFloat(form.total) || 0;

      if (form.jenis === 'Pengeluaran') {
        const { error } = await supabase.from('expenses').insert({
          toko: form.toko, tanggal: form.tanggal, bulan,
          transaksi: form.metode, uraian: form.items,
          kategori: form.kategori, bank: form.bank, nilai, user_id: user.id,
        });
        if (error) throw error;
      } else if (form.jenis === 'Pemasukan') {
        const { error } = await supabase.from('income').insert({
          sumber: form.toko, tanggal: form.tanggal, bulan,
          jumlah: nilai, metode: form.metode, kategori: form.kategori,
          items: form.items, bank: form.bank, user_id: user.id,
        });
        if (error) throw error;
      } else if (form.jenis === 'Tarik Tunai') {
        const { error } = await supabase.from('cash_records').insert({
          tanggal: form.tanggal, bulan, transaksi: form.metode,
          kategori: form.kategori, bank: form.bank, nilai,
          alamat: form.toko, metode: form.metode, user_id: user.id,
        });
        if (error) throw error;
      }

      showToast('Transaksi berhasil disimpan! ✓', 'success');
      setTimeout(() => router.push('/'), 1500);
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan', 'error');
    } finally { setSaving(false); }
  };

  const resetAll = () => {
    setParsed(null); setForm({}); setImagePreview(null);
    setImageFile(null); setInputText(''); setAudioBlob(null); setAudioUrl(null);
  };

  const Spinner = () => (
    <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  );

  const btnStyle = (disabled) => ({
    width: '100%', padding: 14, background: 'var(--grad1)', border: 'none',
    borderRadius: 'var(--radius)', color: '#fff', fontSize: 15, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1,
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  });

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80 }}>
        <AppHeader title="Input Transaksi" />
        <div style={{ padding: '16px 16px 0' }}>

          {/* Tab Switcher */}
          <div style={{ display: 'flex', gap: 8, background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 4, border: '1px solid var(--border)', marginBottom: 20 }}>
            {[{id:'foto',label:'📷 Foto'},{id:'teks',label:'⌨️ Teks'},{id:'voice',label:'🎤 Voice'}].map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); resetAll(); }} style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'Plus Jakarta Sans, sans-serif',
                background: activeTab === tab.id ? 'var(--grad1)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'var(--text2)',
              }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB FOTO */}
          {activeTab === 'foto' && !parsed && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <div onClick={() => fileInputRef.current?.click()} style={{
                border: '2px dashed var(--border2)', borderRadius: 'var(--radius)',
                padding: '32px 16px', textAlign: 'center', cursor: 'pointer',
                marginBottom: 16, background: 'var(--surface)',
              }}>
                {imagePreview
                  ? <img src={imagePreview} alt="preview" style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 10, objectFit: 'contain' }} />
                  : <><div style={{ fontSize: 48, marginBottom: 12 }}>📷</div><p style={{ color: 'var(--text2)', fontSize: 14 }}>Tap untuk upload foto struk</p></>
                }
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} style={{ display: 'none' }} />
              {imageFile && (
                <button onClick={handleOCR} disabled={loading} style={btnStyle(loading)}>
                  {loading ? <><Spinner /> Memproses...</> : '🔍 Analisis Struk'}
                </button>
              )}
            </div>
          )}

          {/* TAB TEKS */}
          {activeTab === 'teks' && !parsed && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 12 }}>Ketik transaksi dengan bahasa natural, contoh: "beli nasi goreng 15rb cash di warteg"</p>
              <textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Tulis transaksi di sini..." rows={5} style={{
                width: '100%', background: 'var(--surface)', border: '1px solid var(--border2)',
                borderRadius: 'var(--radius)', color: 'var(--text1)', padding: '12px 14px',
                fontSize: 14, outline: 'none', resize: 'none',
                fontFamily: 'Plus Jakarta Sans, sans-serif', boxSizing: 'border-box', marginBottom: 14,
              }} />
              <button onClick={handleTextSubmit} disabled={loading || !inputText.trim()} style={btnStyle(loading || !inputText.trim())}>
                {loading ? <><Spinner /> Memproses...</> : '✨ Parse dengan AI'}
              </button>
            </div>
          )}

          {/* TAB VOICE */}
          {activeTab === 'voice' && !parsed && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <button onClick={recording ? stopRecording : startRecording} style={{
                  width: 96, height: 96, borderRadius: '50%',
                  background: recording ? 'var(--red)' : 'var(--grad1)',
                  border: 'none', cursor: 'pointer', fontSize: 36,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: recording ? '0 0 0 8px rgba(244,63,94,0.2)' : '0 4px 20px rgba(56,189,248,0.3)',
                }}>
                  {recording ? '⏹' : '🎤'}
                </button>
                <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 12 }}>
                  {recording ? '🔴 Merekam... tap untuk berhenti' : 'Tap untuk mulai merekam'}
                </p>
              </div>
              <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 12, marginBottom: 16 }}>— atau upload file audio —</div>
              <label style={{ display: 'block', border: '2px dashed var(--border2)', borderRadius: 'var(--radius)', padding: 16, textAlign: 'center', cursor: 'pointer', marginBottom: 16 }}>
                <input type="file" accept="audio/*" onChange={handleVoiceUploadChange} style={{ display: 'none' }} />
                <span style={{ color: 'var(--text2)', fontSize: 13 }}>📂 Upload file audio (MP3, WAV, M4A)</span>
              </label>
              {audioUrl && (
                <>
                  <audio controls src={audioUrl} style={{ width: '100%', marginBottom: 14, borderRadius: 8 }} />
                  <button onClick={handleVoiceSubmit} disabled={loading} style={btnStyle(loading)}>
                    {loading ? <><Spinner /> Memproses...</> : '🎵 Transkrip & Parse'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* FORM KONFIRMASI */}
          {parsed && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ color: 'var(--text1)', fontSize: 16, fontWeight: 700 }}>✅ Konfirmasi Data</h3>
                <button onClick={resetAll} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13 }}>← Ulangi</button>
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {JENIS_LIST.map(j => (
                    <button key={j} onClick={() => setForm(f => ({ ...f, jenis: j }))} style={{
                      flex: 1, padding: '8px 4px', borderRadius: 'var(--radius-sm)', border: '1px solid',
                      borderColor: form.jenis === j ? 'var(--accent)' : 'var(--border2)',
                      background: form.jenis === j ? 'rgba(56,189,248,0.1)' : 'var(--surface2)',
                      color: form.jenis === j ? 'var(--accent)' : 'var(--text2)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif',
                    }}>{j}</button>
                  ))}
                </div>
                <FieldRow label="Toko / Sumber" value={form.toko || ''} onChange={v => setForm(f => ({ ...f, toko: v }))} />
                <FieldRow label="Total (Rp)" value={form.total || ''} onChange={v => setForm(f => ({ ...f, total: v }))} type="number" />
                <FieldRow label="Keterangan / Items" value={form.items || ''} onChange={v => setForm(f => ({ ...f, items: v }))} />
                <FieldRow label="Kategori" value={form.kategori || ''} onChange={v => setForm(f => ({ ...f, kategori: v }))} options={KATEGORI_LIST} />
                <FieldRow label="Metode" value={form.metode || ''} onChange={v => setForm(f => ({ ...f, metode: v }))} options={METODE_LIST} />
                <FieldRow label="Bank" value={form.bank || ''} onChange={v => setForm(f => ({ ...f, bank: v }))} />
                <FieldRow label="Tanggal Struk" value={form.tanggal || ''} onChange={v => setForm(f => ({ ...f, tanggal: v }))} type="date" />
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text2)', fontSize: 14 }}>Total</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: form.jenis === 'Pemasukan' ? 'var(--green)' : form.jenis === 'Tarik Tunai' ? 'var(--yellow)' : 'var(--red)' }}>
                  Rp{parseInt(form.total || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <button onClick={handleSave} disabled={saving} style={btnStyle(saving)}>
                {saving ? <><Spinner /> Menyimpan...</> : '💾 Simpan Transaksi'}
              </button>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
