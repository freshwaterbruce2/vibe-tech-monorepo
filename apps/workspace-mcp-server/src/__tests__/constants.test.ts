import { describe, it, expect } from 'vitest';
import { maskSecret, isSensitive } from '../constants.js';

describe('maskSecret', () => {
  it('returns ***masked*** for short values (≤12 chars)', () => {
    expect(maskSecret('short')).toBe('***masked***');
    expect(maskSecret('123456789012')).toBe('***masked***');
  });

  it('shows first 7 and last 4 chars for longer values', () => {
    const value = 'sk-abcdefghijklmnopqrstuvwxyz';
    const result = maskSecret(value);
    expect(result).toBe(`${value.slice(0, 7)}...${value.slice(-4)}`);
  });

  it('masks a 13-character value correctly', () => {
    const value = 'abcdefghijklm'; // 13 chars
    expect(maskSecret(value)).toBe('abcdefg...jklm');
  });

  it('always includes the ... separator', () => {
    expect(maskSecret('thisvalueislong1234')).toContain('...');
  });
});

describe('isSensitive', () => {
  it('returns true for API_KEY', () => {
    expect(isSensitive('OPENROUTER_API_KEY')).toBe(true);
    expect(isSensitive('API_KEY')).toBe(true);
  });

  it('returns true for SECRET', () => {
    expect(isSensitive('APP_SECRET')).toBe(true);
    expect(isSensitive('JWT_SECRET')).toBe(true);
  });

  it('returns true for TOKEN', () => {
    expect(isSensitive('TELEGRAM_BOT_TOKEN')).toBe(true);
    expect(isSensitive('ACCESS_TOKEN')).toBe(true);
  });

  it('returns true for PASSWORD', () => {
    expect(isSensitive('DB_PASSWORD')).toBe(true);
  });

  it('returns true for CREDENTIAL', () => {
    expect(isSensitive('GOOGLE_CREDENTIALS')).toBe(true);
  });

  it('returns false for non-sensitive keys', () => {
    expect(isSensitive('DATABASE_URL')).toBe(false);
    expect(isSensitive('PORT')).toBe(false);
    expect(isSensitive('NODE_ENV')).toBe(false);
    expect(isSensitive('LOG_LEVEL')).toBe(false);
    expect(isSensitive('VITE_APP_NAME')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isSensitive('api_key')).toBe(true);
    expect(isSensitive('my_token')).toBe(true);
    expect(isSensitive('password_hash')).toBe(true);
  });
});
