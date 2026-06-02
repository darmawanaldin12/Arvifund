'use client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

/**
 * AppSelect — drop-in replacement untuk <select className="form-select">
 * Props: value, onChange(e), placeholder, options, style
 * options: string[] ATAU { value, label }[]
 */
export default function AppSelect({ value, onChange, placeholder, options = [], style }) {
  // Nilai yang ditampilkan — jika value kosong, pakai string khusus supaya
  // SelectValue bisa show placeholder
  const selectValue = value || ''

  return (
    <Select
      value={selectValue}
      onValueChange={val => {
        // val === '__placeholder__' artinya user pilih placeholder (reset)
        onChange({ target: { value: val === '__placeholder__' ? '' : val } })
      }}
    >
      <SelectTrigger
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: selectValue ? 'var(--text1)' : 'var(--text3)',
          borderRadius: 'var(--radius-sm, 8px)',
          height: 40,
          fontSize: 14,
          fontFamily: 'inherit',
          width: '100%',
          ...style,
        }}
      >
        <SelectValue placeholder={placeholder || 'Pilih...'} />
      </SelectTrigger>
      <SelectContent>
        {/* Placeholder item — hanya tampil jika ada placeholder */}
        {placeholder !== undefined && (
          <SelectItem
            value="__placeholder__"
            style={{ color: 'var(--text3)', fontStyle: 'italic' }}
          >
            {placeholder}
          </SelectItem>
        )}
        {options.map(opt => {
          const val = typeof opt === 'string' ? opt : opt.value
          const lbl = typeof opt === 'string' ? opt : opt.label
          return (
            <SelectItem key={val} value={val}>
              {lbl}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
