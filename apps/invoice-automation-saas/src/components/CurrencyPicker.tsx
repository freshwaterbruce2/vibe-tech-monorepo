import { SUPPORTED_CURRENCIES } from '../lib/currency'

interface CurrencyPickerProps {
  value: string
  onChange: (code: string) => void
  id?: string
  className?: string
  disabled?: boolean
}

const CurrencyPicker = ({ value, onChange, id, className, disabled }: CurrencyPickerProps) => {
  return (
    <select
      id={id}
      className={className ?? 'ui-input'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      {SUPPORTED_CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.code} — {c.label}
        </option>
      ))}
    </select>
  )
}

export default CurrencyPicker
