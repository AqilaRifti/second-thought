// Feature: second-thought, Property 5: Predatory Pricing Detection
// Validates: Requirements 4.1, 4.2, 4.3

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
    detectFakeDiscount,
    detectUrgencyManipulation,
    analyzePricing,
} from './pricing-analyzer';
import type { ProductInfo } from './types';

// Arbitrary for products with significant discounts (>50%)
const discountedProductArbitrary = fc
    .tuple(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: 10, max: 500 }),
        fc.constantFrom('USD', 'EUR', 'GBP')
    )
    .chain(([name, price, currency]) =>
        fc.record({
            name: fc.constant(name),
            price: fc.constant(price),
            currency: fc.constant(currency),
            url: fc.constant('http://test.com/product'),
            urgencyIndicators: fc.constant([] as string[]),
            // Original price is at least 2x the current price (>50% discount)
            originalPrice: fc.integer({ min: price * 2, max: price * 5 }),
        })
    );

// Arbitrary for products with urgency indicators
const urgencyProductArbitrary = fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    price: fc.integer({ min: 1, max: 100000 }),
    currency: fc.constantFrom('USD', 'EUR', 'GBP'),
    url: fc.constant('http://test.com/product'),
    urgencyIndicators: fc.array(
        fc.constantFrom(
            'Only 3 left!',
            'Limited time offer',
            'Sale ends soon',
            'Hurry!',
            "Don't miss out",
            'Last chance',
            'Selling fast',
            '15 people viewing',
            '50 sold in the last hour',
            'Flash sale'
        ),
        { minLength: 1, maxLength: 3 }
    ),
});

// Arbitrary for products without predatory patterns
const cleanProductArbitrary = fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    price: fc.integer({ min: 1, max: 100000 }),
    currency: fc.constantFrom('USD', 'EUR', 'GBP'),
    url: fc.constant('http://test.com/product'),
    urgencyIndicators: fc.constant([] as string[]),
});

// Arbitrary for products with both discount and urgency
const predatoryProductArbitrary = fc
    .tuple(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: 10, max: 500 }),
        fc.constantFrom('USD', 'EUR', 'GBP'),
        fc.array(
            fc.constantFrom('Only 3 left!', 'Sale ends soon', 'Hurry!'),
            { minLength: 1, maxLength: 2 }
        )
    )
    .chain(([name, price, currency, urgencyIndicators]) =>
        fc.record({
            name: fc.constant(name),
            price: fc.constant(price),
            currency: fc.constant(currency),
            url: fc.constant('http://test.com/product'),
            urgencyIndicators: fc.constant(urgencyIndicators),
            originalPrice: fc.integer({ min: price * 2, max: price * 5 }),
        })
    );

describe('Pricing Analyzer', () => {
    // Property 5: Predatory Pricing Detection
    describe('Property 5: Predatory Pricing Detection', () => {
        it('should detect fake discounts when discount > 50%', () => {
            fc.assert(
                fc.property(discountedProductArbitrary, (product) => {
                    const warning = detectFakeDiscount(product as ProductInfo);

                    // Should detect the fake discount
                    expect(warning).not.toBeNull();
                    expect(warning!.type).toBe('fake_discount');
                    expect(warning!.confidence).toBeGreaterThan(0);
                    expect(warning!.explanation).toBeTruthy();

                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it('should detect urgency manipulation when urgency indicators present', () => {
            fc.assert(
                fc.property(urgencyProductArbitrary, (product) => {
                    const warning = detectUrgencyManipulation(product as ProductInfo);

                    // Should detect urgency manipulation
                    expect(warning).not.toBeNull();
                    expect(warning!.type).toBe('urgency_manipulation');
                    expect(warning!.confidence).toBeGreaterThan(0);
                    expect(warning!.explanation).toBeTruthy();

                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it('should return at least one warning for products with predatory patterns', () => {
            fc.assert(
                fc.property(predatoryProductArbitrary, (product) => {
                    const warnings = analyzePricing(product as ProductInfo);

                    // Should have at least one warning
                    expect(warnings.length).toBeGreaterThan(0);

                    // All warnings should have valid structure
                    for (const warning of warnings) {
                        expect(['fake_discount', 'urgency_manipulation', 'inflated_price']).toContain(
                            warning.type
                        );
                        expect(warning.confidence).toBeGreaterThanOrEqual(0);
                        expect(warning.confidence).toBeLessThanOrEqual(1);
                        expect(warning.explanation.length).toBeGreaterThan(0);
                    }

                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it('should not flag clean products without predatory patterns', () => {
            fc.assert(
                fc.property(cleanProductArbitrary, (product) => {
                    const warnings = analyzePricing(product as ProductInfo);

                    // Clean products should have no warnings
                    expect(warnings.length).toBe(0);

                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it('should have confidence scores between 0 and 1', () => {
            fc.assert(
                fc.property(
                    fc.oneof(discountedProductArbitrary, urgencyProductArbitrary),
                    (product) => {
                        const warnings = analyzePricing(product as ProductInfo);

                        for (const warning of warnings) {
                            expect(warning.confidence).toBeGreaterThanOrEqual(0);
                            expect(warning.confidence).toBeLessThanOrEqual(1);
                        }

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Unit tests
    describe('Unit Tests', () => {
        it('should not flag products without original price', () => {
            const product: ProductInfo = {
                name: 'Test Product',
                price: 100,
                currency: 'USD',
                url: 'http://test.com',
                urgencyIndicators: [],
            };

            const warning = detectFakeDiscount(product);
            expect(warning).toBeNull();
        });

        it('should not flag products with small discounts', () => {
            const product: ProductInfo = {
                name: 'Test Product',
                price: 90,
                currency: 'USD',
                originalPrice: 100, // 10% discount
                url: 'http://test.com',
                urgencyIndicators: [],
            };

            const warning = detectFakeDiscount(product);
            expect(warning).toBeNull();
        });

        it('should flag extreme discounts with high confidence', () => {
            const product: ProductInfo = {
                name: 'Test Product',
                price: 20,
                currency: 'USD',
                originalPrice: 100, // 80% discount
                url: 'http://test.com',
                urgencyIndicators: [],
            };

            const warning = detectFakeDiscount(product);
            expect(warning).not.toBeNull();
            expect(warning!.confidence).toBeGreaterThanOrEqual(0.9);
        });

        it('should detect multiple urgency patterns', () => {
            const product: ProductInfo = {
                name: 'Test Product',
                price: 100,
                currency: 'USD',
                url: 'http://test.com',
                urgencyIndicators: ['Only 5 left!', 'Sale ends soon', 'Hurry!'],
            };

            const warning = detectUrgencyManipulation(product);
            expect(warning).not.toBeNull();
            expect(warning!.confidence).toBeGreaterThan(0.5);
        });

        it('should not flag non-matching urgency text', () => {
            const product: ProductInfo = {
                name: 'Test Product',
                price: 100,
                currency: 'USD',
                url: 'http://test.com',
                urgencyIndicators: ['Great product', 'Best seller'],
            };

            const warning = detectUrgencyManipulation(product);
            expect(warning).toBeNull();
        });
    });
});
