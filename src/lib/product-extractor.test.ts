import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
    parsePrice,
    parseCurrency,
    detectSite,
    containsUrgencyIndicator,
    validateProduct,
    normalizeProductName,
    calculateDiscountPercentage,
    isSuspiciousDiscount,
    extractProductFromData,
    ExtractedProduct,
} from './product-extractor';

describe('Product Extractor', () => {
    // Property 1: Price parsing correctness
    describe('parsePrice', () => {
        it('should parse valid price strings correctly', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 9999999 }),
                    (cents) => {
                        const price = cents / 100;
                        const formatted = `$${price.toFixed(2)}`;
                        const parsed = parsePrice(formatted);
                        expect(parsed).toBeCloseTo(price, 2);
                    }
                )
            );
        });

        it('should handle prices with commas', () => {
            expect(parsePrice('$1,234.56')).toBe(1234.56);
            expect(parsePrice('$12,345')).toBe(12345);
            expect(parsePrice('€1,000.00')).toBe(1000);
        });

        it('should return null for invalid inputs', () => {
            expect(parsePrice(null)).toBeNull();
            expect(parsePrice('')).toBeNull();
            expect(parsePrice('free')).toBeNull();
        });

        it('should extract price from mixed text', () => {
            expect(parsePrice('Price: $49.99 USD')).toBe(49.99);
            expect(parsePrice('Now only €29.99!')).toBe(29.99);
        });
    });

    // Property 2: Currency detection correctness
    describe('parseCurrency', () => {
        it('should detect USD for dollar sign', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 999999 }),
                    (cents) => {
                        const price = cents / 100;
                        const text = `$${price.toFixed(2)}`;
                        expect(parseCurrency(text)).toBe('USD');
                    }
                )
            );
        });

        it('should detect correct currencies', () => {
            expect(parseCurrency('$100')).toBe('USD');
            expect(parseCurrency('€50')).toBe('EUR');
            expect(parseCurrency('£75')).toBe('GBP');
            expect(parseCurrency('¥1000')).toBe('JPY');
            expect(parseCurrency('₹500')).toBe('INR');
        });

        it('should default to USD for unknown currencies', () => {
            expect(parseCurrency('100')).toBe('USD');
            expect(parseCurrency(null)).toBe('USD');
        });
    });

    // Property 3: Site detection correctness
    describe('detectSite', () => {
        it('should detect Amazon sites', () => {
            expect(detectSite('www.amazon.com')).toBe('amazon');
            expect(detectSite('amazon.co.uk')).toBe('amazon');
            expect(detectSite('smile.amazon.com')).toBe('amazon');
        });

        it('should detect eBay sites', () => {
            expect(detectSite('www.ebay.com')).toBe('ebay');
            expect(detectSite('ebay.co.uk')).toBe('ebay');
        });

        it('should return generic for unknown sites', () => {
            fc.assert(
                fc.property(
                    fc.string().filter(s => !s.includes('amazon') && !s.includes('ebay')),
                    (hostname) => {
                        expect(detectSite(hostname)).toBe('generic');
                    }
                )
            );
        });
    });

    // Property 4: Urgency indicator detection
    describe('containsUrgencyIndicator', () => {
        it('should detect urgency patterns', () => {
            expect(containsUrgencyIndicator('Only 3 left in stock!')).toBe(true);
            expect(containsUrgencyIndicator('Limited time offer')).toBe(true);
            expect(containsUrgencyIndicator('Sale ends soon')).toBe(true);
            expect(containsUrgencyIndicator('Hurry! Almost gone')).toBe(true);
            expect(containsUrgencyIndicator('Last chance to buy')).toBe(true);
            expect(containsUrgencyIndicator('Selling fast!')).toBe(true);
            expect(containsUrgencyIndicator('5 people viewing this')).toBe(true);
            expect(containsUrgencyIndicator('Flash sale!')).toBe(true);
        });

        it('should not flag normal text as urgency', () => {
            expect(containsUrgencyIndicator('Product description')).toBe(false);
            expect(containsUrgencyIndicator('Free shipping')).toBe(false);
            expect(containsUrgencyIndicator('Customer reviews')).toBe(false);
        });
    });

    // Property 5: Product validation
    describe('validateProduct', () => {
        it('should validate complete products', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        name: fc.string({ minLength: 1 }),
                        price: fc.integer({ min: 1, max: 9999900 }).map(c => c / 100),
                        currency: fc.constantFrom('USD', 'EUR', 'GBP'),
                        url: fc.webUrl(),
                        urgencyIndicators: fc.array(fc.string()),
                    }),
                    (product) => {
                        expect(validateProduct(product)).toBe(true);
                    }
                )
            );
        });

        it('should reject invalid products', () => {
            expect(validateProduct({})).toBe(false);
            expect(validateProduct({ name: '' })).toBe(false);
            expect(validateProduct({ name: 'Test', price: 0 })).toBe(false);
            expect(validateProduct({ name: 'Test', price: -10 })).toBe(false);
        });
    });

    // Property 6: Product name normalization
    describe('normalizeProductName', () => {
        it('should trim whitespace', () => {
            fc.assert(
                fc.property(fc.string(), (name) => {
                    const normalized = normalizeProductName(`  ${name}  `);
                    expect(normalized).toBe(name.trim().substring(0, 200));
                })
            );
        });

        it('should limit length to 200 characters', () => {
            const longName = 'A'.repeat(300);
            expect(normalizeProductName(longName).length).toBe(200);
        });
    });

    // Property 7: Discount calculation correctness
    describe('calculateDiscountPercentage', () => {
        it('should calculate correct discount percentage', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 100, max: 100000 }),
                    fc.integer({ min: 1, max: 99 }),
                    (originalCents, discountPercent) => {
                        const originalPrice = originalCents / 100;
                        const currentPrice = originalPrice * (1 - discountPercent / 100);
                        const discount = calculateDiscountPercentage(currentPrice, originalPrice);
                        expect(discount).toBeCloseTo(discountPercent, 0);
                    }
                )
            );
        });

        it('should return null when no discount', () => {
            expect(calculateDiscountPercentage(100, undefined)).toBeNull();
            expect(calculateDiscountPercentage(100, 50)).toBeNull(); // original < current
            expect(calculateDiscountPercentage(100, 100)).toBeNull(); // same price
        });
    });

    // Property 8: Suspicious discount detection
    describe('isSuspiciousDiscount', () => {
        it('should flag discounts over 80% as suspicious', () => {
            expect(isSuspiciousDiscount(10, 100)).toBe(true); // 90% off
            expect(isSuspiciousDiscount(15, 100)).toBe(true); // 85% off
            expect(isSuspiciousDiscount(19, 100)).toBe(true); // 81% off
        });

        it('should not flag reasonable discounts', () => {
            expect(isSuspiciousDiscount(50, 100)).toBe(false); // 50% off
            expect(isSuspiciousDiscount(70, 100)).toBe(false); // 30% off
            expect(isSuspiciousDiscount(80, 100)).toBe(false); // 20% off
        });

        it('should handle edge cases', () => {
            expect(isSuspiciousDiscount(100, undefined)).toBe(false);
            expect(isSuspiciousDiscount(100, 50)).toBe(false);
        });
    });

    // Property 9: Full extraction pipeline
    describe('extractProductFromData', () => {
        it('should extract valid products', () => {
            const result = extractProductFromData({
                name: 'Test Product',
                priceText: '$49.99',
                url: 'https://example.com/product',
            });

            expect(result).not.toBeNull();
            expect(result?.name).toBe('Test Product');
            expect(result?.price).toBe(49.99);
            expect(result?.currency).toBe('USD');
        });

        it('should include original price when higher', () => {
            const result = extractProductFromData({
                name: 'Sale Item',
                priceText: '$29.99',
                originalPriceText: '$59.99',
                url: 'https://example.com/sale',
            });

            expect(result?.originalPrice).toBe(59.99);
        });

        it('should exclude original price when lower or equal', () => {
            const result = extractProductFromData({
                name: 'Item',
                priceText: '$59.99',
                originalPriceText: '$29.99',
                url: 'https://example.com/item',
            });

            expect(result?.originalPrice).toBeUndefined();
        });

        it('should extract urgency indicators', () => {
            const result = extractProductFromData({
                name: 'Hot Item',
                priceText: '$99.99',
                urgencyTexts: ['Only 2 left!', 'Free shipping', 'Limited time offer'],
                url: 'https://example.com/hot',
            });

            expect(result?.urgencyIndicators).toHaveLength(2);
            expect(result?.urgencyIndicators).toContain('Only 2 left!');
            expect(result?.urgencyIndicators).toContain('Limited time offer');
        });

        it('should return null for invalid data', () => {
            expect(extractProductFromData({ url: 'https://example.com' })).toBeNull();
            expect(extractProductFromData({ name: 'Test', url: 'https://example.com' })).toBeNull();
            expect(extractProductFromData({ priceText: '$10', url: 'https://example.com' })).toBeNull();
        });

        it('should limit urgency indicators to 5', () => {
            const result = extractProductFromData({
                name: 'Product',
                priceText: '$10',
                urgencyTexts: [
                    'Only 1 left',
                    'Only 2 left',
                    'Only 3 left',
                    'Only 4 left',
                    'Only 5 left',
                    'Only 6 left',
                    'Only 7 left',
                ],
                url: 'https://example.com',
            });

            expect(result?.urgencyIndicators.length).toBeLessThanOrEqual(5);
        });
    });

    // Property 10: Extraction preserves data integrity
    describe('Data Integrity', () => {
        it('should preserve price precision', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 999999 }),
                    (cents) => {
                        const price = cents / 100;
                        const priceText = `$${price.toFixed(2)}`;
                        const result = extractProductFromData({
                            name: 'Test',
                            priceText,
                            url: 'https://example.com',
                        });
                        expect(result?.price).toBeCloseTo(price, 2);
                    }
                )
            );
        });

        it('should handle various price formats', () => {
            const formats = [
                { text: '$1,234.56', expected: 1234.56 },
                { text: '€999.00', expected: 999 },
                { text: '£49.99 GBP', expected: 49.99 },
                { text: 'Price: $19.99', expected: 19.99 },
                { text: 'Now $29.99 (was $39.99)', expected: 29.99 },
            ];

            for (const { text, expected } of formats) {
                const result = extractProductFromData({
                    name: 'Test',
                    priceText: text,
                    url: 'https://example.com',
                });
                expect(result?.price).toBe(expected);
            }
        });
    });
});
