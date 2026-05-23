import { describe, expect, it } from 'vitest';
import { formatMoney, formatMoneyShort, formatPercent } from '../../../utils/format';

describe('formatMoney', () => {
  it('formats zero', () => {
    expect(formatMoney(0)).toBe('₹0');
  });

  it('formats thousands with commas', () => {
    expect(formatMoney(150000)).toBe('₹1,50,000');
  });

  it('formats small amounts', () => {
    expect(formatMoney(500)).toBe('₹500');
  });

  it('formats large amounts', () => {
    expect(formatMoney(10000000)).toBe('₹1,00,00,000');
  });

  it('formats negative amounts', () => {
    expect(formatMoney(-5000)).toBe('₹-5,000');
  });
});

describe('formatMoneyShort', () => {
  it('formats zero', () => {
    expect(formatMoneyShort(0)).toBe('₹0');
  });

  it('formats thousands', () => {
    expect(formatMoneyShort(5000)).toBe('₹5k');
  });

  it('formats thousands with decimal', () => {
    expect(formatMoneyShort(7500)).toBe('₹7.5k');
  });

  it('formats lakhs', () => {
    expect(formatMoneyShort(150000)).toBe('₹1.5L');
  });

  it('formats exact lakhs', () => {
    expect(formatMoneyShort(200000)).toBe('₹2L');
  });

  it('formats small amounts under 1000', () => {
    expect(formatMoneyShort(999)).toBe('₹999');
  });
});

describe('formatPercent', () => {
  it('formats percentage', () => {
    expect(formatPercent(25)).toBe('25%');
  });
});
