import {
  Utensils, Car, Sparkles, HeartPulse, Shirt, Smartphone,
  Home, GraduationCap, Gamepad2, FileText, CreditCard,
  TrendingUp, Briefcase, Package, Banknote,
} from 'lucide-react'

const KATEGORI_ICON_MAP = {
  'Makanan & Minuman':    { Icon: Utensils,      color: '#f97316' },
  'Transportasi':         { Icon: Car,           color: '#3b82f6' },
  'Kosmetik & Perawatan': { Icon: Sparkles,      color: '#ec4899' },
  'Kesehatan':            { Icon: HeartPulse,    color: '#22c55e' },
  'Pakaian & Aksesoris':  { Icon: Shirt,         color: '#a855f7' },
  'Elektronik':           { Icon: Smartphone,    color: '#06b6d4' },
  'Rumah Tangga':         { Icon: Home,          color: '#84cc16' },
  'Pendidikan':           { Icon: GraduationCap, color: '#eab308' },
  'Hiburan':              { Icon: Gamepad2,      color: '#f43f5e' },
  'Tagihan':              { Icon: FileText,      color: '#6366f1' },
  'Cicilan':              { Icon: CreditCard,    color: '#f59e0b' },
  'Investasi':            { Icon: TrendingUp,    color: '#10b981' },
  'Bisnis':               { Icon: Briefcase,     color: '#8b5cf6' },
  'Lainnya':              { Icon: Package,       color: '#94a3b8' },
  'Pemasukan':            { Icon: Banknote,      color: '#34d399' },
}

/**
 * KategoriIcon — render Lucide icon sesuai kategori.
 * @param {string}  kategori  - nama kategori
 * @param {number}  size      - ukuran icon (default 16)
 * @param {string}  color     - override warna (opsional)
 * @param {string}  className - tambahan class (opsional)
 */
export default function KategoriIcon({ kategori, size = 16, color, className = '' }) {
  const entry = KATEGORI_ICON_MAP[kategori]
  if (!entry) return <Package size={size} color={color || '#94a3b8'} className={className} />
  const { Icon, color: defaultColor } = entry
  return <Icon size={size} color={color || defaultColor} className={className} />
}

export { KATEGORI_ICON_MAP }
