// Feature: second-thought, Property 11: LLM-as-Judge Evaluation Scores Validity
// Validates: Requirements 7.3

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock Opik metrics
vi.mock('opik', () => ({
    AnswerRelevance: class {
        async score() {
            return { value: 0.7, reason: 'Mock relevance' };
        }
    },
    Usefulness: class {
        async score() {
            return { value: 0.8, reason: 'Mock usefulness' };
        }
    },
    BaseMetric: class {
        public readonly name: string;
        public readonly trackMetric: boolean;
        constructor(name: string, trackMetric: boolean) {
            this.name = name;
            this.trackMetric = trackMetric;
        }
    },
}));

import { evaluateIntervention, EmpathyMetric, AccuracyMetric, ActionabilityMetric } from './evaluations';
import type { ProductInfo, AnalysisResult, UserProfile } from './types';

// Arbitraries
const productInfoArbitrary = fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    price: fc.integer({ min: 1, max: 100000 }),
    currency: fc.constantFrom('USD', 'EUR', 'GBP'),
    originalPrice: fc.option(fc.integer({ min: 1, max: 100000 }), { nil: undefined }),
    category: fc.option(
        fc.constantFrom('food', 'medicine', 'luxury', 'entertainment', 'electronics', 'clothing'),
        { nil: undefined }
    ),
    url: fc.constant('http://test.com/product'),
    urgencyIndicators: fc.array(fc.string(), { maxLength: 3 }),
});

const analysisResultArbitrary = fc
    .tuple(
        fc.boolean(),
        fc.integer({ min: 0, max: 100 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.constantFrom('proceed', 'cooldown', 'skip'),
        fc.integer({ min: 1, max: 100000 })
    )
    .map(([isEssential, scorePercent, reasoning, message, action, price]) => ({
        isEssential,
        essentialityScore: scorePercent / 100,
        reasoning,
        warnings: [],
        opportunityCost: {
            amount: price,
            projections: {
                years5: Math.round(price * Math.pow(1.07, 5)),
                years10: Math.round(price * Math.pow(1.07, 10)),
                years20: Math.round(price * Math.pow(1.07, 20)),
            },
            comparisonText: 'test',
        },
        personalizedMessage: message,
        suggestedAction: action as 'proceed' | 'cooldown' | 'skip',
    }));

const userProfileArbitrary = fc.record({
    id: fc.uuid(),
    savingsGoal: fc.option(fc.integer({ min: 0, max: 1000000 }), { nil: undefined }),
    monthlyBudget: fc.option(fc.integer({ min: 0, max: 100000 }), { nil: undefined }),
    financialGoals: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }),
    spendingThreshold: fc.integer({ min: 1, max: 10000 }),
    coolDownEnabled: fc.boolean(),
    createdAt: fc.date(),
    updatedAt: fc.date(),
});

describe('Evaluation Metrics', () => {
    // Property 11: LLM-as-Judge Evaluation Scores Validity
    describe('Property 11: Evaluation Scores Validity', () => {
        it('should return empathy scores between 0 and 1', async () => {
            const metric = new EmpathyMetric();

            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    fc.string({ minLength: 1, maxLength: 100 }),
                    fc.integer({ min: 1, max: 100000 }),
                    fc.string({ minLength: 1, maxLength: 200 }),
                    async (userGoals, productName, price, message) => {
                        const result = await metric.score({
                            userGoals,
                            productName,
                            price,
                            personalizedMessage: message,
                        });

                        expect(result.value).toBeGreaterThanOrEqual(0);
                        expect(result.value).toBeLessThanOrEqual(1);
                        expect(result.name).toBe('empathy');
                        expect(result.reason).toBeTruthy();

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return accuracy scores between 0 and 1', async () => {
            const metric = new AccuracyMetric();

            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 1, max: 100000 }),
                    fc.boolean(),
                    fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
                    async (price, isEssential, category) => {
                        // Calculate correct opportunity cost
                        const opportunityCost20yr = price * Math.pow(1.07, 20);

                        const result = await metric.score({
                            productPrice: price,
                            opportunityCost20yr,
                            isEssential,
                            category,
                        });

                        expect(result.value).toBeGreaterThanOrEqual(0);
                        expect(result.value).toBeLessThanOrEqual(1);
                        expect(result.name).toBe('accuracy');
                        expect(result.reason).toBeTruthy();

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return actionability scores between 0 and 1', async () => {
            const metric = new ActionabilityMetric();

            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('proceed', 'cooldown', 'skip'),
                    fc.string({ minLength: 1, maxLength: 200 }),
                    fc.integer({ min: 0, max: 5 }),
                    async (action, reasoning, warningCount) => {
                        const result = await metric.score({
                            suggestedAction: action as 'proceed' | 'cooldown' | 'skip',
                            reasoning,
                            warningCount,
                        });

                        expect(result.value).toBeGreaterThanOrEqual(0);
                        expect(result.value).toBeLessThanOrEqual(1);
                        expect(result.name).toBe('actionability');
                        expect(result.reason).toBeTruthy();

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return all evaluation scores between 0 and 1', async () => {
            await fc.assert(
                fc.asyncProperty(
                    productInfoArbitrary,
                    analysisResultArbitrary,
                    fc.option(userProfileArbitrary, { nil: undefined }),
                    async (product, analysis, profile) => {
                        const result = await evaluateIntervention(
                            product as ProductInfo,
                            analysis as AnalysisResult,
                            profile as UserProfile | undefined
                        );

                        // All scores should be between 0 and 1
                        expect(result.empathyScore).toBeGreaterThanOrEqual(0);
                        expect(result.empathyScore).toBeLessThanOrEqual(1);

                        expect(result.accuracyScore).toBeGreaterThanOrEqual(0);
                        expect(result.accuracyScore).toBeLessThanOrEqual(1);

                        expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
                        expect(result.relevanceScore).toBeLessThanOrEqual(1);

                        expect(result.actionabilityScore).toBeGreaterThanOrEqual(0);
                        expect(result.actionabilityScore).toBeLessThanOrEqual(1);

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Unit tests
    describe('Unit Tests', () => {
        it('should give higher empathy score for supportive messages', async () => {
            const metric = new EmpathyMetric();

            const supportiveResult = await metric.score({
                userGoals: 'Save for vacation',
                productName: 'Expensive Watch',
                price: 500,
                personalizedMessage: 'I understand your goal to save for vacation. Consider if this helps you reach your dream.',
            });

            const neutralResult = await metric.score({
                userGoals: 'Save for vacation',
                productName: 'Expensive Watch',
                price: 500,
                personalizedMessage: 'This is a watch.',
            });

            expect(supportiveResult.value).toBeGreaterThan(neutralResult.value);
        });

        it('should detect inaccurate opportunity cost calculations', async () => {
            const metric = new AccuracyMetric();

            // Correct calculation
            const correctResult = await metric.score({
                productPrice: 100,
                opportunityCost20yr: 100 * Math.pow(1.07, 20), // ~387
                isEssential: false,
                category: 'electronics',
            });

            // Incorrect calculation (way off)
            const incorrectResult = await metric.score({
                productPrice: 100,
                opportunityCost20yr: 1000, // Should be ~387
                isEssential: false,
                category: 'electronics',
            });

            expect(correctResult.value).toBeGreaterThan(incorrectResult.value);
        });

        it('should give higher actionability for detailed reasoning', async () => {
            const metric = new ActionabilityMetric();

            const detailedResult = await metric.score({
                suggestedAction: 'cooldown',
                reasoning: 'This purchase is not essential and could impact your savings goal significantly.',
                warningCount: 2,
            });

            const vagueResult = await metric.score({
                suggestedAction: 'cooldown',
                reasoning: 'Wait.',
                warningCount: 2,
            });

            expect(detailedResult.value).toBeGreaterThan(vagueResult.value);
        });
    });
});
