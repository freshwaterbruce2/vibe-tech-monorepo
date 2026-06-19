export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseBookingDate(value: string): number | null {
  if (!DATE_ONLY_PATTERN.test(value)) return null;

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp;
}

export function validateBookingDates(
  checkIn: string,
  checkOut: string,
): string | null {
  const checkInTime = parseBookingDate(checkIn);
  if (checkInTime === null) return 'Check-in date must use YYYY-MM-DD';

  const checkOutTime = parseBookingDate(checkOut);
  if (checkOutTime === null) return 'Check-out date must use YYYY-MM-DD';

  if (checkOutTime <= checkInTime)
    return 'Check-out date must be after check-in';

  return null;
}

export function calculateNights(checkIn: string, checkOut: string): number {
  const checkInTime = parseBookingDate(checkIn);
  const checkOutTime = parseBookingDate(checkOut);
  if (checkInTime === null || checkOutTime === null) return 0;

  const delta = checkOutTime - checkInTime;
  return Math.ceil(delta / (1000 * 60 * 60 * 24));
}
