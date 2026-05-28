'use client';

import { useState, useRef } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import { createClient } from '@/lib/supabase';

// ─── helpers ────────────────────────────────────────────────────────────────

function parseGeminiOutput(raw = '') {
  const get = (key) => {
    const regex = new RegExp(`${key}:\\s*(.+)`, 'i');
    const match = raw.match(regex);
    return match ? match[1].trim() : '';
  };
  return {
    toko: get('TOKO'),
    total: get('TOTAL').replace(/[^0-9]/g, ''),
    items: get('ITEMS'),
    kategori: get('KATEGORI'),
    jenis: get('JENIS'),
    metode: get('METODE'),
    bank: get('BANK'),
    tanggal: get('TANGGAL_STRUK') || new Date().toISOString().slice(0, 10),
  };
}

function bulanFromDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
}

const KATEGORI_LIST = [
  'Makanan & Minuman', 'Tagihan', 'Transportasi', 'Kesehatan',
  'Pakaian', 'Elektronik', 'Rumah Tangga', 'Pendidikan',
  'Hiburan', 'Cicilan', 'Investasi', 'Lainnya',
];
const JENIS_LIST = ['Pengeluaran', 'Pemasukan', 'Tarik Tunai'];
const METODE_LIST = ['Cash', 'Transfer', 'Debit', 'Kredit'];
const BANK_LIST = ['BCA', 'BRI', 'BNI', 'Mandiri', 'BSI', 'GoPay', 'OVO', 'Dana', 'ShopeePay', 'Lainnya'];

// ─── sub-components ──────────────────────────────────────────────────────────

function Toast({ msg, type }) {
  if (!msg) return null;
  const colors = { success: 'var(--green)', error: 'var(--red)', info: 'var(--accent)' };
  return (
    <div style={{
      position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)',
      background: colors[type] || 'var(--surface2)', color: '#fff',
      padding: '12px 24px', borderRadius: 'var(--radius)', zIndex: 9999,
      fontSize: '14px', fontWeight: 600, boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      whiteSpace: 'nowrap', maxWidth: '90vw', textAlign: 'center',
      animation: 'fadeInUp 0.3s ease',
    }}>
      {msg}
    </div>
  );
}

function ConfirmForm({ parsed, onChange, onSubmit, onReset, loading }) {
  const fields = [
    { key: 'toko', label: 'Toko / Sumber', type: 'text' },
    { key: 'total', label: 'Total (angka)', type: 'number' },
    { key: 'items', label: 'Items / Keterangan', type: 'text' },
    { key: 'tanggal', label: 'Tanggal', type: 'date' },
    { key: 'bank', label: 'Bank', type: 'text' },
  ];

  return (
    <div className="confirm-form">
      <div className="section-title">
        <span className="section-icon">✅</span>
        Konfirmasi Data
      </div>

      {fields.map(({ key, label, type }) => (
        <div key={key} className="field-group">
          <label>{label}</label>
          <input
            type={type}
            value={parsed[key] || ''}
            onChange={e => onChange(key, e.target.value)}
          />
        </div>
      ))}

      <div className="field-group">
        <label>Kategori</label>
        <select value={parsed.kategori || ''} onChange={e => onChange('kategori', e.target.value)}>
          {KATEGORI_LIST.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      <div className="field-group">
        <label>Jenis Transaksi</label>
        <select value={parsed.jenis || ''} onChange={e => onChange('jenis', e.target.value)}>
          {JENIS_LIST.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
      </div>

      <div className="field-group">
        <label>Metode Pembayaran</label>
        <select value={parsed.metode || ''} onChange={e => onChange('metode', e.target.value)}>
          {METODE_LIST.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="jenis-badge-row">
        <span className={`jenis-badge jenis-${(parsed.jenis || '').toLowerCase().replace(/\s+/g, '-')}`}>
          {parsed.jenis === 'Pengeluaran' ? '📤' : parsed.jenis === 'Pemasukan' ? '📥' : '🏧'} {parsed.jenis}
        </span>
        <span className="total-preview">
          Rp {Number(parsed.total || 0).toLocaleString('id-ID')}
        </span>
      </div>

      <div className="btn-row">
        <button className="btn-ghost" onClick={onReset} disabled={loading}>
          ↩ Ulangi
        </button>
        <button className="btn-primary" onClick={onSubmit} disabled={loading}>
          {loading ? '⏳ Menyimpan...' : '💾 Simpan'}
        </button>
      </div>
    </div>
  );
}

// ─── tab: foto ───────────────────────────────────────────────────────────────

function FotoTab({ onParsed }) {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/ocr', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OCR gagal');
      onParsed(parseGeminiOutput(data.result));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tab-content">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
      />

      {!preview ? (
        <div
          className="drop-zone"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <div className="drop-icon">📷</div>
          <div className="drop-text">Tap untuk ambil foto atau pilih dari galeri</div>
          <div className="drop-sub">JPG, PNG, WEBP</div>
        </div>
      ) : (
        <div className="preview-container">
          <img src={preview} alt="Preview struk" className="receipt-preview" />
          <button className="btn-ghost btn-sm" onClick={() => { setPreview(null); setFile(null); }}>
            🗑 Ganti Foto
          </button>
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {preview && (
        <button className="btn-primary btn-full" onClick={handleAnalyze} disabled={loading}>
          {loading ? <><span className="btn-spinner" /> Menganalisis struk...</> : '🔍 Analisis dengan AI'}
        </button>
      )}
    </div>
  );
}

// ─── tab: teks ───────────────────────────────────────────────────────────────

function TeksTab({ onParsed }) {
  const [mode, setMode] = useState('ai'); // 'ai' | 'manual'
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [manual, setManual] = useState({
    toko: '',
    total: '',
    items: '',
    tanggal: new Date().toISOString().slice(0, 10),
    kategori: 'Lainnya',
    jenis: 'Pengeluaran',
    metode: 'Cash',
    bank: '',
  });

  const setM = (key, val) => setManual(prev => ({ ...prev, [key]: val }));

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analisis gagal');
      onParsed(parseGeminiOutput(data.result));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manual.total || Number(manual.total) === 0) {
      alert('Nominal tidak boleh kosong atau 0');
      return;
    }
    onParsed(manual);
  };

  const examples = [
    'Beli kopi di Starbucks 65rb pakai GoPay',
    'Bayar listrik PLN 350000 transfer BCA',
    'Gaji bulan ini masuk 5jt dari PT Maju',
    'Tarik tunai ATM BRI 500rb',
  ];

  return (
    <div className="tab-content">
      {/* Toggle AI / Manual */}
      <div style={{
        display: 'flex', gap: '4px',
        background: 'var(--surface2)', borderRadius: 'var(--radius-sm)',
        padding: '4px',
      }}>
        <button
          onClick={() => setMode('ai')}
          style={{
            flex: 1, padding: '10px', border: 'none', borderRadius: 'var(--radius-sm)',
            background: mode === 'ai' ? 'var(--grad1)' : 'transparent',
            color: mode === 'ai' ? '#fff' : 'var(--text2)',
            fontFamily: 'inherit', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          🤖 Pakai AI
        </button>
        <button
          onClick={() => setMode('manual')}
          style={{
            flex: 1, padding: '10px', border: 'none', borderRadius: 'var(--radius-sm)',
            background: mode === 'manual' ? 'var(--grad1)' : 'transparent',
            color: mode === 'manual' ? '#fff' : 'var(--text2)',
            fontFamily: 'inherit', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          ✍️ Input Manual
        </button>
      </div>

      {/* ── MODE AI ── */}
      {mode === 'ai' && (
        <>
          <div className="section-title">
            <span className="section-icon">⌨️</span>
            Deskripsikan Transaksi
          </div>
          <textarea
            className="text-input"
            placeholder="Contoh: beli makan siang di warteg 15ribu bayar cash..."
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
          />
          <div className="examples-row">
            <span className="examples-label">Contoh:</span>
            {examples.map((ex, i) => (
              <button key={i} className="example-chip" onClick={() => setText(ex)}>{ex}</button>
            ))}
          </div>
          {error && (
            <div className="error-box">
              {error}
              <button
                onClick={() => setMode('manual')}
                style={{
                  display: 'block', marginTop: '8px', background: 'none',
                  border: 'none', color: 'var(--accent)', fontWeight: 700,
                  cursor: 'pointer', fontSize: '13px', padding: 0,
                }}
              >
                → Beralih ke Input Manual
              </button>
            </div>
          )}
          <button
            className="btn-primary btn-full"
            onClick={handleAnalyze}
            disabled={loading || !text.trim()}
          >
            {loading ? <><span className="btn-spinner" /> Memproses...</> : '🤖 Parse dengan AI'}
          </button>
        </>
      )}

      {/* ── MODE MANUAL ── */}
      {mode === 'manual' && (
        <>
          <div className="section-title">
            <span className="section-icon">✍️</span>
            Input Manual
          </div>

          <div className="field-group">
            <label>Jenis Transaksi</label>
            <select value={manual.jenis} onChange={e => setM('jenis', e.target.value)}>
              {JENIS_LIST.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>

          <div className="field-group">
            <label>Toko / Sumber</label>
            <input
              type="text"
              placeholder="Contoh: Warung Bu Siti, PT Maju..."
              value={manual.toko}
              onChange={e => setM('toko', e.target.value)}
            />
          </div>

          <div className="field-group">
            <label>Uraian / Keterangan</label>
            <input
              type="text"
              placeholder="Contoh: Makan siang, Gaji April..."
              value={manual.items}
              onChange={e => setM('items', e.target.value)}
            />
          </div>

          <div className="field-group">
            <label>Nominal (Rp)</label>
            <input
              type="number"
              placeholder="Contoh: 50000"
              value={manual.total}
              onChange={e => setM('total', e.target.value)}
              inputMode="numeric"
            />
            {manual.total ? (
              <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600, marginTop: '2px' }}>
                Rp {Number(manual.total).toLocaleString('id-ID')}
              </span>
            ) : null}
          </div>

          <div className="field-group">
            <label>Tanggal</label>
            <input
              type="date"
              value={manual.tanggal}
              onChange={e => setM('tanggal', e.target.value)}
            />
          </div>

          <div className="field-group">
            <label>Kategori</label>
            <select value={manual.kategori} onChange={e => setM('kategori', e.target.value)}>
              {KATEGORI_LIST.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          <div className="field-group">
            <label>Metode Pembayaran</label>
            <select value={manual.metode} onChange={e => setM('metode', e.target.value)}>
              {METODE_LIST.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="field-group">
            <label>Bank / Dompet Digital</label>
            <select value={manual.bank} onChange={e => setM('bank', e.target.value)}>
              <option value="">-- Pilih --</option>
              {BANK_LIST.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="jenis-badge-row">
            <span className={`jenis-badge jenis-${manual.jenis.toLowerCase().replace(/\s+/g, '-')}`}>
              {manual.jenis === 'Pengeluaran' ? '📤' : manual.jenis === 'Pemasukan' ? '📥' : '🏧'} {manual.jenis}
            </span>
            <span className="total-preview">
              Rp {Number(manual.total || 0).toLocaleString('id-ID')}
            </span>
          </div>

          <button
            className="btn-primary btn-full"
            onClick={handleManualSubmit}
            disabled={!manual.total || Number(manual.total) === 0}
          >
            ➡️ Lanjut ke Konfirmasi
          </button>
        </>
      )}
    </div>
  );
}

// ─── tab: voice ──────────────────────────────────────────────────────────────

function VoiceTab({ onParsed }) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duration, setDuration] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (e) {
      setError('Tidak bisa mengakses mikrofon: ' + e.message);
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const handleFileUpload = (f) => {
    if (!f) return;
    setAudioBlob(f);
    setAudioUrl(URL.createObjectURL(f));
    setError('');
  };

  const handleAnalyze = async () => {
    if (!audioBlob) return;
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('audio', audioBlob, 'voice.webm');
      const res = await fetch('/api/voice', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transkrip gagal');
      onParsed(parseGeminiOutput(data.result));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="tab-content">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={e => handleFileUpload(e.target.files[0])}
      />

      <div className="section-title">
        <span className="section-icon">🎤</span>
        Rekam atau Upload Voice Note
      </div>

      {!audioUrl ? (
        <div className="voice-area">
          <div className={`record-btn-wrap ${recording ? 'recording' : ''}`}>
            <button
              className={`record-btn ${recording ? 'active' : ''}`}
              onClick={recording ? stopRecording : startRecording}
            >
              {recording ? '⏹' : '🎙'}
            </button>
            {recording && <div className="record-pulse" />}
          </div>
          {recording && (
            <div className="record-status">
              <span className="record-dot" /> Merekam... {fmt(duration)}
            </div>
          )}
          {!recording && (
            <button className="btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()}>
              📁 Upload File Audio
            </button>
          )}
        </div>
      ) : (
        <div className="audio-preview">
          <audio controls src={audioUrl} style={{ width: '100%' }} />
          <button className="btn-ghost btn-sm" onClick={() => { setAudioUrl(null); setAudioBlob(null); }}>
            🗑 Hapus
          </button>
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {audioUrl && (
        <button className="btn-primary btn-full" onClick={handleAnalyze} disabled={loading}>
          {loading ? <><span className="btn-spinner" /> Mentranskrip...</> : '🎧 Transkrip & Parse'}
        </button>
      )}
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function InputPage() {
  const [activeTab, setActiveTab] = useState('foto');
  const [parsed, setParsed] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'info' });

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'info' }), 3500);
  };

  const handleParsed = (data) => {
    setParsed(data);
    showToast('✅ Data berhasil diparse!', 'success');
  };

  const handleChange = (key, val) => {
    setParsed(prev => ({ ...prev, [key]: val }));
  };

  const handleReset = () => setParsed(null);

  const handleSave = async () => {
    if (!parsed) return;

    if (!parsed.total || Number(parsed.total) === 0) {
      showToast('⚠️ Total tidak boleh kosong atau 0', 'error');
      return;
    }
    if (!parsed.jenis) {
      showToast('⚠️ Pilih jenis transaksi', 'error');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Belum login');

      const userId = user.id;
      const nilai = Number(parsed.total) || 0;
      const tanggal = parsed.tanggal || new Date().toISOString().slice(0, 10);
      const bulan = bulanFromDate(tanggal);

      let error;

      if (parsed.jenis === 'Pengeluaran') {
        ({ error } = await supabase.from('expenses').insert({
          toko: parsed.toko || '-',
          tanggal,
          bulan,
          transaksi: parsed.items || '-',
          uraian: parsed.items || '-',
          kategori: parsed.kategori || 'Lainnya',
          bank: parsed.bank || '-',
          nilai,
          user_id: userId,
        }));
      } else if (parsed.jenis === 'Pemasukan') {
        ({ error } = await supabase.from('income').insert({
          sumber: parsed.toko || '-',
          tanggal,
          bulan,
          jumlah: nilai,
          metode: parsed.metode || 'Cash',
          kategori: parsed.kategori || 'Lainnya',
          items: parsed.items || '-',
          bank: parsed.bank || '-',
          user_id: userId,
        }));
      } else if (parsed.jenis === 'Tarik Tunai') {
        ({ error } = await supabase.from('cash_records').insert({
          tanggal,
          bulan,
          transaksi: parsed.items || 'Tarik Tunai',
          kategori: parsed.kategori || 'Lainnya',
          bank: parsed.bank || '-',
          nilai,
          alamat: parsed.toko || '-',
          metode: parsed.metode || 'Cash',
          user_id: userId,
        }));
      }

      if (error) throw new Error(error.message);

      showToast('🎉 Transaksi berhasil disimpan!', 'success');
      setParsed(null);
    } catch (e) {
      showToast('❌ ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'foto', label: 'Foto', icon: '📷' },
    { id: 'teks', label: 'Teks', icon: '⌨️' },
    { id: 'voice', label: 'Voice', icon: '🎤' },
  ];

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .spinner {
          width: 36px; height: 36px;
          border: 3px solid var(--border2);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .btn-spinner {
          display: inline-block;
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .input-page {
          min-height: 100vh;
          background: var(--bg);
          padding-bottom: 100px;
        }
        .page-inner {
          max-width: 480px;
          margin: 0 auto;
          padding: 16px;
        }
        .tab-bar {
          display: flex;
          gap: 8px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 6px;
          margin-bottom: 20px;
        }
        .tab-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 10px 6px;
          border-radius: var(--radius-sm);
          border: none;
          background: transparent;
          color: var(--text2);
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn .tab-icon { font-size: 20px; }
        .tab-btn.active {
          background: var(--grad1);
          color: #fff;
          font-weight: 700;
          box-shadow: 0 2px 12px rgba(56,189,248,0.25);
        }
        .tab-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 20px;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 700;
          color: var(--text1);
          margin-bottom: 4px;
        }
        .section-icon { font-size: 18px; }
        .drop-zone {
          background: var(--surface2);
          border: 2px dashed var(--border2);
          border-radius: var(--radius);
          padding: 48px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .drop-zone:hover { border-color: var(--accent); background: var(--surface3); }
        .drop-icon { font-size: 48px; }
        .drop-text { font-size: 15px; font-weight: 600; color: var(--text1); text-align: center; }
        .drop-sub { font-size: 13px; color: var(--text3); }
        .preview-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }
        .receipt-preview {
          width: 100%;
          max-height: 320px;
          object-fit: contain;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: var(--surface2);
        }
        .text-input {
          width: 100%;
          background: var(--surface2);
          border: 1px solid var(--border2);
          border-radius: var(--radius-sm);
          padding: 14px;
          color: var(--text1);
          font-family: inherit;
          font-size: 15px;
          line-height: 1.6;
          resize: vertical;
          min-height: 110px;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .text-input:focus { outline: none; border-color: var(--accent); }
        .text-input::placeholder { color: var(--text3); }
        .examples-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .examples-label { font-size: 12px; color: var(--text3); font-weight: 600; }
        .example-chip {
          background: var(--surface2);
          border: 1px solid var(--border2);
          border-radius: 20px;
          padding: 5px 12px;
          font-size: 12px;
          color: var(--text2);
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          text-align: left;
        }
        .example-chip:hover { border-color: var(--accent); color: var(--accent); }
        .voice-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          padding: 24px 0;
        }
        .record-btn-wrap {
          position: relative;
          width: 80px;
          height: 80px;
        }
        .record-btn {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: none;
          background: var(--grad1);
          font-size: 32px;
          cursor: pointer;
          position: relative;
          z-index: 1;
          transition: transform 0.2s;
          box-shadow: 0 4px 20px rgba(56,189,248,0.3);
        }
        .record-btn.active { background: var(--grad3); box-shadow: 0 4px 20px rgba(244,63,94,0.4); }
        .record-btn:hover { transform: scale(1.05); }
        .record-pulse {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(244,63,94,0.3);
          animation: pulse-ring 1.2s ease-out infinite;
        }
        .record-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: var(--red);
        }
        .record-dot {
          width: 8px;
          height: 8px;
          background: var(--red);
          border-radius: 50%;
          animation: pulse-ring 1s ease-out infinite;
          flex-shrink: 0;
        }
        .audio-preview {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }
        .error-box {
          background: rgba(244,63,94,0.12);
          border: 1px solid rgba(244,63,94,0.3);
          border-radius: var(--radius-sm);
          padding: 12px 16px;
          color: var(--red);
          font-size: 14px;
        }
        .btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: var(--grad1);
          border: none;
          border-radius: var(--radius-sm);
          padding: 14px 24px;
          color: #fff;
          font-family: inherit;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
          box-shadow: 0 2px 12px rgba(56,189,248,0.25);
        }
        .btn-primary:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-primary.btn-full { width: 100%; }
        .btn-ghost {
          background: var(--surface2);
          border: 1px solid var(--border2);
          border-radius: var(--radius-sm);
          padding: 10px 18px;
          color: var(--text2);
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-ghost:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
        .btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-ghost.btn-full { width: 100%; box-sizing: border-box; }
        .btn-sm { padding: 8px 14px; font-size: 13px; }
        .confirm-form {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field-group label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text3);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .field-group input,
        .field-group select {
          background: var(--surface2);
          border: 1px solid var(--border2);
          border-radius: var(--radius-sm);
          padding: 11px 14px;
          color: var(--text1);
          font-family: inherit;
          font-size: 15px;
          width: 100%;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .field-group input:focus,
        .field-group select:focus { outline: none; border-color: var(--accent); }
        .field-group select { cursor: pointer; }
        .jenis-badge-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--surface2);
          border-radius: var(--radius-sm);
          padding: 12px 16px;
        }
        .jenis-badge {
          font-size: 13px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 20px;
        }
        .jenis-pengeluaran { background: rgba(244,63,94,0.15); color: var(--red); }
        .jenis-pemasukan { background: rgba(16,185,129,0.15); color: var(--green); }
        .jenis-tarik-tunai { background: rgba(245,158,11,0.15); color: var(--yellow); }
        .total-preview {
          font-size: 18px;
          font-weight: 800;
          color: var(--text1);
        }
        .btn-row {
          display: flex;
          gap: 12px;
          margin-top: 4px;
        }
        .btn-row .btn-ghost { flex: 1; }
        .btn-row .btn-primary { flex: 2; }
      `}</style>

      <div className="input-page">
        <AppHeader title="Input Transaksi" />

        <div className="page-inner">
          <div className="tab-bar">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => { setActiveTab(t.id); setParsed(null); }}
              >
                <span className="tab-icon">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {!parsed ? (
            <>
              {activeTab === 'foto' && <FotoTab onParsed={handleParsed} />}
              {activeTab === 'teks' && <TeksTab onParsed={handleParsed} />}
              {activeTab === 'voice' && <VoiceTab onParsed={handleParsed} />}
            </>
          ) : (
            <ConfirmForm
              parsed={parsed}
              onChange={handleChange}
              onSubmit={handleSave}
              onReset={handleReset}
              loading={saving}
            />
          )}
        </div>

        <Toast msg={toast.msg} type={toast.type} />
        <BottomNav />
      </div>
    </>
  );
}
