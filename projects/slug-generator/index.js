export function generateSlug(str) {
  if (typeof str !== 'string') return '';

  return str
    .normalize('NFD') // Decompose combined graphemes into the combination of simple ones
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase() // Convert to lower case
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric characters except spaces and dashes
    .replace(/[\s-]+/g, '-') // Replace multiple spaces or dashes with a single dash
    .replace(/^-+|-+$/g, ''); // Trim leading and trailing dashes
}
