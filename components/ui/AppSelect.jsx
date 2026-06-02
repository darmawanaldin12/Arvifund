'use client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

/**
 * AppSelect — drop-in replacement untuk <select className="form-select">
 * Props: value, onChange (e => ...), placeholder, options, style, className
 * options: array of string ATAU array of { value, label }
 */
export default function AppSelect({ value, onChange, placeholder, options = [], style, className }) {
  return (
    <Select
      value={value || ''}
      onValueChange={val => {
        // Emulate native event agar onChange handler yang ada tetap bekerja
        onChange({ target: { value: val } })
      }}
    >
      <SelectTrigger
        className={className}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          color: value ? 'var(--text1)' : 'var(--text3)',
          borderRadius: 'var(--radius-sm)',
          height: 40,
          fontSize: 14,
          fontFamily: 'inherit',
          ...style,
        }}
      >
        <SelectValue placeholder={placeholder || 'Pilih...'} />
      </SelectTrigger>
      <SelectContent>
        {placeholder !== undefined && (
          <SelectItem value="" style={{ color: 'var(--text3)' }}>
            {placeholder || 'Pilih...'}
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
