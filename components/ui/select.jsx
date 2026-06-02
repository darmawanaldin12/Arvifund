'use client'
import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef(({ style, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    style={{
      display: 'flex',
      height: 40,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'space-between',
      whiteSpace: 'nowrap',
      borderRadius: 'var(--radius-sm, 8px)',
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      padding: '0 12px',
      fontSize: 14,
      color: 'var(--text1)',
      cursor: 'pointer',
      outline: 'none',
      fontFamily: 'inherit',
      transition: 'border-color 0.15s',
      ...style,
    }}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0, marginLeft: 6 }}>
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = 'SelectTrigger'

const SelectScrollUpButton = React.forwardRef((props, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    style={{ display: 'flex', cursor: 'default', alignItems: 'center', justifyContent: 'center', padding: '4px 0' }}
    {...props}
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 15l-6-6-6 6"/>
    </svg>
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = 'SelectScrollUpButton'

const SelectScrollDownButton = React.forwardRef((props, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    style={{ display: 'flex', cursor: 'default', alignItems: 'center', justifyContent: 'center', padding: '4px 0' }}
    {...props}
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = 'SelectScrollDownButton'

const SelectContent = React.forwardRef(({ style, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      style={{
        position: 'relative',
        zIndex: 9999,
        maxHeight: 320,
        minWidth: '8rem',
        overflow: 'hidden',
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        ...style,
      }}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport style={{ padding: 4 }}>
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = 'SelectContent'

const SelectLabel = React.forwardRef(({ style, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    style={{ padding: '6px 8px', fontSize: 11, fontWeight: 600, color: 'var(--text3)', ...style }}
    {...props}
  />
))
SelectLabel.displayName = 'SelectLabel'

const SelectItem = React.forwardRef(({ style, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    style={{
      position: 'relative',
      display: 'flex',
      width: '100%',
      cursor: 'pointer',
      userSelect: 'none',
      alignItems: 'center',
      borderRadius: 8,
      padding: '8px 32px 8px 10px',
      fontSize: 13,
      color: 'var(--text1)',
      outline: 'none',
      transition: 'background 0.1s',
      ...style,
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)' }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    {...props}
  >
    <span style={{ position: 'absolute', right: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16 }}>
      <SelectPrimitive.ItemIndicator>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent)' }}>
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = 'SelectItem'

const SelectSeparator = React.forwardRef(({ style, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    style={{ margin: '4px -4px', height: 1, background: 'var(--border)', ...style }}
    {...props}
  />
))
SelectSeparator.displayName = 'SelectSeparator'

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
