export const SUPPORTED_CURRENCIES: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
  { code: 'JPY', label: 'Japanese Yen' },
  { code: 'CHF', label: 'Swiss Franc' },
  { code: 'CNY', label: 'Chinese Yuan' },
  { code: 'HKD', label: 'Hong Kong Dollar' },
  { code: 'SGD', label: 'Singapore Dollar' },
  { code: 'INR', label: 'Indian Rupee' },
  { code: 'KRW', label: 'South Korean Won' },
  { code: 'MXN', label: 'Mexican Peso' },
  { code: 'BRL', label: 'Brazilian Real' },
  { code: 'ZAR', label: 'South African Rand' },
  { code: 'SEK', label: 'Swedish Krona' },
  { code: 'NOK', label: 'Norwegian Krone' },
  { code: 'DKK', label: 'Danish Krone' },
  { code: 'PLN', label: 'Polish Zloty' },
  { code: 'NZD', label: 'New Zealand Dollar' },
  { code: 'TRY', label: 'Turkish Lira' },
  { code: 'AED', label: 'UAE Dirham' },
  { code: 'SAR', label: 'Saudi Riyal' },
  { code: 'ILS', label: 'Israeli Shekel' },
  { code: 'THB', label: 'Thai Baht' },
  { code: 'PHP', label: 'Philippine Peso' },
  { code: 'IDR', label: 'Indonesian Rupiah' },
  { code: 'MYR', label: 'Malaysian Ringgit' },
  { code: 'CZK', label: 'Czech Koruna' },
  { code: 'HUF', label: 'Hungarian Forint' },
]

const formatterCache = new Map<string, Intl.NumberFormat>()

const formatterFor = (currency: string): Intl.NumberFormat => {
  const key = currency.toUpperCase()
  let f = formatterCache.get(key)
  if (!f) {
    try {
      f = new Intl.NumberFormat('en-US', { style: 'currency', currency: key })
    } catch {
      f = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    formatterCache.set(key, f)
  }
  return f
}

/**
 * Format a money amount for display.
 * Falls back to a plain decimal if the currency code is unknown.
 */
export const formatCurrency = (amount: number, currency: string): string => {
  try {
    return formatterFor(currency).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`
  }
}

/**
 * Convert one currency to another using a known exchange rate.
 * Returns NaN if rate is not finite or non-positive.
 */
export const convertWithRate = (amount: number, rate: number): number => {
  if (!Number.isFinite(rate) || rate <= 0) return Number.NaN
  return amount * rate
}
