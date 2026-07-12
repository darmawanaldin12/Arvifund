import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import { fmtFull, fmtTanggalShort } from '../../lib/utils'

const NAVY = '#1E40AF'
const RED = '#DC2626'
const GREEN = '#16A34A'
const GRAY = '#6B7280'
const DARK = '#111827'
const BORDER = '#E5E7EB'

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9.5, fontFamily: 'Helvetica', color: '#374151' },
  title: { fontSize: 18, fontWeight: 700, color: DARK, marginBottom: 2 },
  sub: { fontSize: 9, color: GRAY, marginBottom: 12 },
  hr: { borderBottomWidth: 1.5, borderBottomColor: NAVY, marginBottom: 14 },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  kpiCard: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 6, padding: 8 },
  kpiLabel: { fontSize: 7, color: GRAY, marginBottom: 4, textTransform: 'uppercase' },
  kpiValue: { fontSize: 12, fontWeight: 700 },
  kpiSub: { fontSize: 7, color: '#9CA3AF', marginTop: 2 },
  section: { fontSize: 12, fontWeight: 700, color: DARK, marginTop: 14, marginBottom: 6 },
  insightBox: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 6, padding: 10, marginBottom: 6 },
  insightText: { fontSize: 9.5, color: '#1E3A8A', lineHeight: 1.5 },
  chartImg: { width: '100%', marginBottom: 8 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6', paddingVertical: 4 },
  trHeader: { flexDirection: 'row', backgroundColor: NAVY, paddingVertical: 6, paddingHorizontal: 2, borderRadius: 3 },
  th: { color: '#fff', fontSize: 8, fontWeight: 700 },
  td: { fontSize: 8, color: '#374151' },
  footer: { position: 'absolute', bottom: 18, left: 28, right: 28, fontSize: 7.5, color: '#9CA3AF', textAlign: 'center' },
})

function KpiCard({ label, value, color, sub }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  )
}

export default function PDFReportDocument({ reportData, narrative, chartImages }) {
  const {
    periodLabel, generatedAt, totalIncome, totalExpenses, saldo, saldoTahun,
    expensesCount, topKategori, budgetVsReal, anomali, transactions,
  } = reportData

  const generatedLabel = generatedAt.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Laporan Keuangan Arvifund</Text>
        <Text style={styles.sub}>Periode: {periodLabel}   •   Dibuat: {generatedLabel}</Text>
        <View style={styles.hr} />

        <View style={styles.kpiRow}>
          <KpiCard label="Total Pemasukan" value={fmtFull(totalIncome)} color={GREEN} />
          <KpiCard label="Total Pengeluaran" value={fmtFull(totalExpenses)} color={RED} sub={`${expensesCount} transaksi`} />
          <KpiCard label="Saldo Periode" value={fmtFull(saldo)} color={saldo >= 0 ? NAVY : RED} />
          <KpiCard label="Saldo Keseluruhan" value={fmtFull(saldoTahun)} color={saldoTahun >= 0 ? NAVY : RED} />
        </View>

        <Text style={styles.section}>Analisa</Text>
        <View style={styles.insightBox}>
          <Text style={styles.insightText}>{narrative}</Text>
        </View>

        {chartImages.trend && (
          <>
            <Text style={styles.section}>Tren Pemasukan &amp; Pengeluaran</Text>
            <Image src={chartImages.trend} style={styles.chartImg} />
          </>
        )}

        <Text style={styles.section}>Breakdown Kategori Pengeluaran</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {chartImages.donut && <Image src={chartImages.donut} style={{ width: 190, height: 170 }} />}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={styles.trHeader}>
              <Text style={[styles.th, { flex: 2 }]}>Kategori</Text>
              <Text style={[styles.th, { flex: 1.3, textAlign: 'right' }]}>Nilai</Text>
              <Text style={[styles.th, { width: 34, textAlign: 'right' }]}>%</Text>
            </View>
            {topKategori.slice(0, 6).map((k, i) => (
              <View key={i} style={styles.tr}>
                <Text style={[styles.td, { flex: 2 }]}>{k.kategori}</Text>
                <Text style={[styles.td, { flex: 1.3, textAlign: 'right' }]}>{fmtFull(k.nilai)}</Text>
                <Text style={[styles.td, { width: 34, textAlign: 'right' }]}>{k.pct}%</Text>
              </View>
            ))}
          </View>
        </View>

        {budgetVsReal.length > 0 && chartImages.budget && (
          <>
            <Text style={styles.section}>Budget vs Realisasi</Text>
            <Image src={chartImages.budget} style={styles.chartImg} />
          </>
        )}

        {anomali.length > 0 && (
          <>
            <Text style={styles.section}>Transaksi Anomali</Text>
            <View style={styles.trHeader}>
              <Text style={[styles.th, { flex: 1 }]}>Tanggal</Text>
              <Text style={[styles.th, { flex: 2.2 }]}>Toko</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>Kategori</Text>
              <Text style={[styles.th, { flex: 1.3, textAlign: 'right' }]}>Nilai</Text>
            </View>
            {anomali.map((r, i) => (
              <View key={i} style={styles.tr}>
                <Text style={[styles.td, { flex: 1 }]}>{fmtTanggalShort(r.tanggal)}</Text>
                <Text style={[styles.td, { flex: 2.2 }]}>{r.toko || '—'}</Text>
                <Text style={[styles.td, { flex: 1.5 }]}>{r.kategori || '—'}</Text>
                <Text style={[styles.td, { flex: 1.3, textAlign: 'right', color: RED, fontWeight: 700 }]}>{fmtFull(r.nilai)}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.footer}>Laporan dibuat otomatis oleh Arvifund — analisa naratif dibantu Gemini AI berdasarkan data aktual.</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.section}>Lampiran: Rincian Transaksi ({transactions.length})</Text>
        <View style={styles.trHeader} fixed>
          <Text style={[styles.th, { flex: 1 }]}>Tanggal</Text>
          <Text style={[styles.th, { flex: 2.6 }]}>Toko/Sumber</Text>
          <Text style={[styles.th, { flex: 1.6 }]}>Kategori</Text>
          <Text style={[styles.th, { flex: 1 }]}>User</Text>
          <Text style={[styles.th, { flex: 1.4, textAlign: 'right' }]}>Nilai</Text>
        </View>
        {transactions.map((r, i) => (
          <View key={i} style={styles.tr} wrap={false}>
            <Text style={[styles.td, { flex: 1 }]}>{fmtTanggalShort(r.tanggal)}</Text>
            <Text style={[styles.td, { flex: 2.6 }]}>{r.label}</Text>
            <Text style={[styles.td, { flex: 1.6 }]}>{r.kategori}</Text>
            <Text style={[styles.td, { flex: 1 }]}>{r.user}</Text>
            <Text style={[styles.td, { flex: 1.4, textAlign: 'right', color: r.nilai >= 0 ? GREEN : '#374151', fontWeight: r.nilai >= 0 ? 700 : 400 }]}>
              {r.nilai >= 0 ? '+ ' : '- '}{fmtFull(Math.abs(r.nilai))}
            </Text>
          </View>
        ))}
        <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} fixed />
      </Page>
    </Document>
  )
}
