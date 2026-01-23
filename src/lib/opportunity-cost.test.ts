// Feature: second-thought, Property 3: Opportunity Cost Calculation Correctness
// Feature: second-thought, Property 4: Currency Formatting Correctness
// Validates: Requirements 3.1, 3.2, 3.3

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
    calculateOpportunityCost,
    formatCurrency,
    ANNUAL_GROWTH_RATE,
} from './opportunity-cost';

// Use integer cents and convert to dollars for better precision
const priceArbitrary = fc.integer({ min: 1, max: 10000000 }).map((cents) => cents / 100);

describe('Opportunity Cost Calculator', () => {
    // Property 3: Opportunity Cost Calculation Correctness
    describe('Property 3: Calculation Correctness', () => {
        it('should calculate correct compound interest for 5 years', () => {
            fc.assert(
                fc.property(priceArbitrary, (price) => {
                    const result = calculateOpportunityCost(price);
                    const expected = price * Math.pow(1 + ANNUAL_GROWTH_RATE, 5);
                    return Math.abs(result.projections.years5 - expected) < 0.01;
                }),
                { numRuns: 100 }
            );
        });

        it('should calculate correct compound interest for 10 years', () => {
            fc.assert(
                fc.property(priceArbitrary, (price) => {
                    const result = calculateOpportunityCost(price);
                    const expected = price * Math.pow(1 + ANNUAL_GROWTH_RATE, 10);
                    return Math.abs(result.projections.years10 - expected) < 0.01;
                }),
                { numRuns: 100 }
            );
        });

        it('should calculate correct compound interest for 20 years', () => {
            fc.assert(
                fc.property(priceArbitrary, (price) => {
                    const result = calculateOpportunityCost(price);
                    const expected = price * Math.pow(1 + ANNUAL_GROWTH_RATE, 20);
                    return Math.abs(result.projections.years20 - expected) < 0.01;
                }),
                { numRuns: 100 }
            );
        });

        it('should have projections in increasing order (5yr < 10yr < 20yr)', () => {
            fc.assert(
                fc.property(priceArbitrary, (price) => {
                    const result = calculateOpportunityCost(price);
                    return (
                        result.projections.years5 < result.projections.years10 &&
                        result.projections.years10 < result.projections.years20
                    );
                }),
                { numRuns: 100 }
            );
        });

        it('should return zero projections for zero or negative prices', () => {
            fc.assert(
                fc.property(fc.integer({ min: -10000, max: 0 }), (price) => {
                    const result = calculateOpportunityCost(price);
                    return (
                        result.projections.years5 === 0 &&
                        result.projections.years10 === 0 &&
                        result.projections.years20 === 0
                    );
                }),
                { numRuns: 100 }
            );
        });
    });

    // Property 4: Currency Formatting Correctness
    describe('Property 4: Currency Formatting', () => {
        it('should format USD with $ symbol and two decimal places', () => {
            fc.assert(
                fc.property(priceArbitrary, (amount) => {
                    const formatted = formatCurrency(amount, 'USD');
                    // Should start with $ and contain a decimal point
                    return formatted.startsWith('$') && formatted.includes('.');
                }),
                { numRuns: 100 }
            );
        });

        it('should format with exactly two decimal places', () => {
            fc.assert(
                fc.property(priceArbitrary, (amount) => {
                    const formatted = formatCurrency(amount, 'USD');
                    // Extract decimal part - should have exactly 2 digits after decimal
                    const decimalPart = formatted.split('.')[1];
                    // Remove any trailing non-digit characters (like currency symbols)
                    const digits = decimalPart?.replace(/\D/g, '');
                    return digits?.length === 2;
                }),
                { numRuns: 100 }
            );
        });

        it('should include thousands separators for large numbers', () => {
            fc.assert(
                fc.property(fc.integer({ min: 100000, max: 10000000 }).map((c) => c / 100), (amount) => {
                    const formatted = formatCurrency(amount, 'USD');
                    // Should contain comma for thousands separator
                    return formatted.includes(',');
                }),
                { numRuns: 100 }
            );
        });

        it('should produce non-empty string for any valid amount', () => {
            fc.assert(
                fc.property(priceArbitrary, (amount) => {
                    const formatted = formatCurrency(amount, 'USD');
                    return formatted.length > 0;
                }),
                { numRuns: 100 }
            );
        });
    });

    // Unit tests for specific examples
    describe('Unit Tests', () => {
        it('should calculate $100 correctly', () => {
            const result = calculateOpportunityCost(100);
            expect(result.projections.years5).toBeCloseTo(140.26, 1);
            expect(result.projections.years10).toBeCloseTo(196.72, 1);
            expect(result.projections.years20).toBeCloseTo(386.97, 1);
        });

        it('should format $1234.56 correctly', () => {
            const formatted = formatCurrency(1234.56, 'USD');
            expect(formatted).toBe('$1,234.56');
        });

        it('should include comparison text', () => {
            const result = calculateOpportunityCost(100);
            expect(result.comparisonText).toContain('$100.00');
            expect(result.comparisonText).toContain('20 years');
        });
    });
});
