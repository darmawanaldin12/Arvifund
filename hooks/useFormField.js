'use client'
import { useState, useRef, useCallback } from 'react'

/**
 * useFormField — hook untuk form field dengan shake error + state
 *
 * Usage:
 *   const field = useFormField()
 *   <div className={`form-group ${field.groupClass}`}>
 *     <label className="form-label">Nama</label>
 *     <input className={`form-input ${field.inputClass}`} ref={field.ref}
 *       onChange={e => { field.clear(); setValue(e.target.value) }} />
 *     {field.errorMsg && <p className="form-error">⚠ {field.errorMsg}</p>}
 *   </div>
 *
 *   // Trigger shake + error:
 *   if (!value) { field.shake('Wajib diisi'); return }
 */
export function useFormField() {
  const [state, setState]     = useState('idle') // idle | error | success
  const [errorMsg, setMsg]    = useState('')
  const [shaking, setShaking] = useState(false)
  const ref = useRef(null)

  const shake = useCallback((msg = '') => {
    setMsg(msg)
    setState('error')
    setShaking(true)
    ref.current?.focus()
    setTimeout(() => setShaking(false), 450)
  }, [])

  const clear = useCallback(() => {
    if (state !== 'idle') setState('idle')
    if (errorMsg) setMsg('')
  }, [state, errorMsg])

  const success = useCallback(() => {
    setState('success')
    setMsg('')
  }, [])

  return {
    ref,
    shake,
    clear,
    success,
    errorMsg,
    state,
    groupClass: state === 'error' ? 'error' : state === 'success' ? 'success' : '',
    inputClass: shaking ? 'shake' : '',
  }
}
