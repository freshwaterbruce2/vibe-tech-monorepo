import type { SearchValues } from './types';

export const DEFAULT_SEARCH_VALUES: SearchValues = {
  destination: 'Miami',
  checkIn: '2026-05-04',
  checkOut: '2026-05-06',
  guests: 2,
};

export function parseSearchValues(params: URLSearchParams): SearchValues {
  return {
    destination: params.get('destination') ?? DEFAULT_SEARCH_VALUES.destination,
    checkIn: params.get('checkIn') ?? DEFAULT_SEARCH_VALUES.checkIn,
    checkOut: params.get('checkOut') ?? DEFAULT_SEARCH_VALUES.checkOut,
    guests: Number(params.get('guests') ?? DEFAULT_SEARCH_VALUES.guests),
  };
}

export function toSearchParams(values: SearchValues): URLSearchParams {
  return new URLSearchParams({
    destination: values.destination,
    checkIn: values.checkIn,
    checkOut: values.checkOut,
    guests: String(values.guests),
  });
}

export function calculateNights(checkIn: string, checkOut: string): number {
  const checkInTime = Date.parse(`${checkIn}T00:00:00Z`);
  const checkOutTime = Date.parse(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(checkInTime) || Number.isNaN(checkOutTime)) return 1;

  const nights = Math.ceil((checkOutTime - checkInTime) / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 1;
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatReviewCount(count: number): string {
  return new Intl.NumberFormat('en-US').format(count);
}
