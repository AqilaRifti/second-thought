// Feature: second-thought, Property 2: AI Response Structure Validity
// Feature: second-thought, Property 9: Prompt Construction Includes User Goals
// Validates: Requirements 2.2, 6.3

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildPrompt, parseAIResponse } from './cerebras';
import type { ProductInfo, UserProfile } from './types';

// Arbitraries
const productInfoArbitrary = fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    price: fc.integer({ min: 1, max: 100000 }),
    currency: fc.constantFrom('USD', 'EUR', 'GBP'),
    originalPrice: fc.option(fc.integer({ min: 1, max: 100000 }), { nil: undefined }),
    category: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    url: fc.constant('http://test.com/product'),
    urgencyIndicators: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 3 }),
});

const userProfileArbitrary = fc.record({
    id: fc.uuid(),
    savingsGoal: fc.option(fc.integer({ min: 0, max: 1000000 }), { nil: undefined }),
    monthlyBudget: fc.option(fc.integer({ min: 0, max: 100000 }), { nil: undefined }),
    financialGoals: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
    spendingThreshold: fc.integer({ min: 1, max: 10000 }),
    coolDownEnabled: fc.boolean(),
    createdAt: fc.date(),
    updatedAt: fc.date(),
});

// Generate valid AI response JSON
const validAIResponseArbitrary = fc.record({
    isEssential: fc.boolean(),
    essentialityScore: fc.integer({ min: 0, max: 100 }).map((n) => n / 100),
    reasoning: fc.string({ minLength: 1, maxLength: 200 }),
    warnings: fc.array(
        fc.record({
            type: fc.constantFrom('fake_discount', 'urgency_manipulation', 'inflated_price'),
            confidence: fc.integer({ min: 0, max: 100 }).map((n) => n / 100),
            explanation: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        { maxLength: 3 }
    ),
    personalizedMessage: fc.string({ minLength: 1, maxLength: 200 }),
    suggestedAction: fc.constantFrom('proceed', 'cooldown', 'skip'),
});

describe('Cerebras AI Client', () => {
    // Property 2: AI Response Structure Validity
    describe('Property 2: Response Structure Validity', () => {
        it('should parse valid AI responses with correct structure', () => {
            fc.assert(
                fc.property(
                    validAIResponseArbitrary,
                    productInfoArbitrary,
                    (aiResponse, product) => {
                        const jsonContent = JSON.stringify(aiResponse);
                        const result = parseAIResponse(jsonContent, product as ProductInfo);

                        // Verify structure
                        expect(typeof result.isEssential).toBe('boolean');
                        expect(typeof result.essentialityScore).toBe('number');
                        expect(result.essentialityScore).toBeGreaterThanOrEqual(0);
                        expect(result.essentialityScore).toBeLessThanOrEqual(1);
                        expect(typeof result.reasoning).toBe('string');
                        expect(Array.isArray(result.warnings)).toBe(true);
                        expect(typeof result.personalizedMessage).toBe('string');
                        expect(['proceed', 'cooldown', 'skip']).toContain(result.suggestedAction);

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should handle markdown code blocks in response', () => {
            fc.assert(
                fc.property(
                    validAIResponseArbitrary,
                    productInfoArbitrary,
                    (aiResponse, product) => {
                        const jsonContent = '```json\n' + JSON.stringify(aiResponse) + '\n```';
                        const result = parseAIResponse(jsonContent, product as ProductInfo);

                        expect(typeof result.isEssential).toBe('boolean');
                        expect(result.essentialityScore).toBeGreaterThanOrEqual(0);
                        expect(result.essentialityScore).toBeLessThanOrEqual(1);

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should clamp essentialityScore to 0-1 range', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: -100, max: 200 }),
                    productInfoArbitrary,
                    (score, product) => {
                        const aiResponse = {
                            isEssential: false,
                            essentialityScore: score,
                            reasoning: 'test',
                            warnings: [],
                            personalizedMessage: 'test',
                            suggestedAction: 'cooldown',
                        };
                        const result = parseAIResponse(JSON.stringify(aiResponse), product as ProductInfo);

                        expect(result.essentialityScore).toBeGreaterThanOrEqual(0);
                        expect(result.essentialityScore).toBeLessThanOrEqual(1);

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return fallback for invalid JSON', () => {
            fc.assert(
                fc.property(
                    fc.string().filter((s) => {
                        try {
                            JSON.parse(s);
                            return false;
                        } catch {
                            return true;
                        }
                    }),
                    productInfoArbitrary,
                    (invalidJson, product) => {
                        const result = parseAIResponse(invalidJson, product as ProductInfo);

                        // Should return valid structure even for invalid input
                        expect(typeof result.isEssential).toBe('boolean');
                        expect(typeof result.essentialityScore).toBe('number');
                        expect(result.suggestedAction).toBe('cooldown'); // Fallback action

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Property 9: Prompt Construction Includes User Goals
    describe('Property 9: Prompt Includes User Goals', () => {
        it('should include all financial goals in the prompt', () => {
            fc.assert(
                fc.property(
                    productInfoArbitrary,
                    userProfileArbitrary,
                    (product, profile) => {
                        const prompt = buildPrompt(product as ProductInfo, profile as UserProfile);

                        // Each financial goal should appear in the prompt
                        for (const goal of profile.financialGoals) {
                            expect(prompt).toContain(goal);
                        }

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should include monthly budget when provided', () => {
            fc.assert(
                fc.property(
                    productInfoArbitrary,
                    userProfileArbitrary.filter((p) => p.monthlyBudget !== undefined && p.monthlyBudget > 0),
                    (product, profile) => {
                        const prompt = buildPrompt(product as ProductInfo, profile as UserProfile);
                        expect(prompt).toContain('Monthly Budget');
                        expect(prompt).toContain(String(profile.monthlyBudget));

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should include savings goal when provided', () => {
            fc.assert(
                fc.property(
                    productInfoArbitrary,
                    userProfileArbitrary.filter((p) => p.savingsGoal !== undefined && p.savingsGoal > 0),
                    (product, profile) => {
                        const prompt = buildPrompt(product as ProductInfo, profile as UserProfile);
                        expect(prompt).toContain('Savings Goal');
                        expect(prompt).toContain(String(profile.savingsGoal));

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should include product details in prompt', () => {
            fc.assert(
                fc.property(productInfoArbitrary, (product) => {
                    const prompt = buildPrompt(product as ProductInfo);

                    expect(prompt).toContain(product.name);
                    expect(prompt).toContain(String(product.price));
                    expect(prompt).toContain(product.currency);

                    return true;
                }),
                { numRuns: 100 }
            );
        });
    });

    // Unit tests
    describe('Unit Tests', () => {
        it('should include urgency indicators in prompt', () => {
            const product: ProductInfo = {
                name: 'Test Product',
                price: 100,
                currency: 'USD',
                url: 'http://test.com',
                urgencyIndicators: ['Only 3 left!', 'Sale ends soon'],
            };

            const prompt = buildPrompt(product);
            expect(prompt).toContain('Only 3 left!');
            expect(prompt).toContain('Sale ends soon');
        });

        it('should include original price for discount detection', () => {
            const product: ProductInfo = {
                name: 'Test Product',
                price: 50,
                currency: 'USD',
                originalPrice: 100,
                url: 'http://test.com',
                urgencyIndicators: [],
            };

            const prompt = buildPrompt(product);
            expect(prompt).toContain('Original Price');
            expect(prompt).toContain('100');
        });

        it('should calculate opportunity cost in parsed response', () => {
            const product: ProductInfo = {
                name: 'Test',
                price: 100,
                currency: 'USD',
                url: 'http://test.com',
                urgencyIndicators: [],
            };

            const aiResponse = {
                isEssential: false,
                essentialityScore: 0.3,
                reasoning: 'Not essential',
                warnings: [],
                personalizedMessage: 'Consider waiting',
                suggestedAction: 'cooldown',
            };

            const result = parseAIResponse(JSON.stringify(aiResponse), product);

            expect(result.opportunityCost.amount).toBe(100);
            expect(result.opportunityCost.projections.years20).toBeGreaterThan(100);
        });
    });
});
