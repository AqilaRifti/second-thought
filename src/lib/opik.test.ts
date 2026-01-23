// Feature: second-thought, Property 10: Opik Trace Completeness
// Validates: Requirements 1.2, 2.3, 7.1, 7.2

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import type { ProductInfo, AnalysisResult } from './types';

// Mock trace calls storage
const traceCalls: Array<{ name: string; input: unknown; output?: unknown; metadata?: unknown }> = [];
const flushCalls: number[] = [];

// Mock Opik module
vi.mock('opik', () => {
    return {
        Opik: class MockOpik {
            trace(params: { name: string; input: unknown; output?: unknown; metadata?: unknown }) {
                traceCalls.push(params);
                return {
                    id: `mock-trace-${traceCalls.length}`,
                    end: vi.fn(),
                };
            }
            async flush() {
                flushCalls.push(Date.now());
            }
        },
    };
});

// Import after mocking
import { OpikTracker } from './opik';

// Arbitraries
const productInfoArbitrary = fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    price: fc.integer({ min: 1, max: 100000 }),
    currency: fc.constantFrom('USD', 'EUR', 'GBP'),
    originalPrice: fc.option(fc.integer({ min: 1, max: 100000 }), { nil: undefined }),
    category: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    url: fc.webUrl(),
    urgencyIndicators: fc.array(fc.string(), { maxLength: 3 }),
});

const analysisResultArbitrary = fc.record({
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
    opportunityCost: fc.record({
        amount: fc.integer({ min: 1, max: 100000 }),
        projections: fc.record({
            years5: fc.integer({ min: 1, max: 200000 }),
            years10: fc.integer({ min: 1, max: 400000 }),
            years20: fc.integer({ min: 1, max: 800000 }),
        }),
        comparisonText: fc.string({ minLength: 1, maxLength: 100 }),
    }),
    personalizedMessage: fc.string({ minLength: 1, maxLength: 200 }),
    suggestedAction: fc.constantFrom('proceed', 'cooldown', 'skip'),
});

describe('Opik Tracker', () => {
    let tracker: OpikTracker;

    beforeEach(() => {
        traceCalls.length = 0;
        flushCalls.length = 0;
        tracker = new OpikTracker();
    });

    // Property 10: Opik Trace Completeness
    describe('Property 10: Trace Completeness', () => {
        it('should create trace with required fields for analysis', () => {
            fc.assert(
                fc.property(
                    productInfoArbitrary,
                    fc.uuid(),
                    fc.uuid(),
                    (product, userId, sessionId) => {
                        const initialCallCount = traceCalls.length;

                        const context = tracker.startAnalysisTrace(
                            product as ProductInfo,
                            userId,
                            sessionId
                        );

                        // Verify trace was created
                        expect(traceCalls.length).toBeGreaterThan(initialCallCount);

                        // Get the latest trace call
                        const traceCall = traceCalls[traceCalls.length - 1];

                        // Verify required fields
                        expect(traceCall.name).toBe('purchase-analysis');
                        expect(traceCall.input).toBeDefined();
                        expect((traceCall.input as Record<string, unknown>).product).toBeDefined();
                        expect(traceCall.metadata).toBeDefined();
                        expect((traceCall.metadata as Record<string, unknown>).userId).toBe(userId);
                        expect((traceCall.metadata as Record<string, unknown>).sessionId).toBe(sessionId);

                        // Verify context returned
                        expect(context.traceId).toBeDefined();
                        expect(context.startTime).toBeGreaterThan(0);

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should include latency in completed trace', async () => {
            await fc.assert(
                fc.asyncProperty(
                    analysisResultArbitrary,
                    fc.uuid(),
                    async (analysis, userId) => {
                        const initialCallCount = traceCalls.length;

                        const context = {
                            traceId: 'test-trace-id',
                            startTime: Date.now() - 100, // 100ms ago
                        };

                        await tracker.completeAnalysisTrace(
                            context,
                            analysis as AnalysisResult,
                            { userId, sessionId: 'test-session' }
                        );

                        // Verify trace completion was called
                        expect(traceCalls.length).toBeGreaterThan(initialCallCount);

                        const traceCall = traceCalls[traceCalls.length - 1];

                        // Verify output contains analysis results
                        expect(traceCall.output).toBeDefined();
                        const output = traceCall.output as Record<string, unknown>;
                        expect(output.isEssential).toBe(analysis.isEssential);
                        expect(output.suggestedAction).toBe(analysis.suggestedAction);

                        // Verify metadata contains latency
                        const metadata = traceCall.metadata as Record<string, unknown>;
                        expect(metadata.latencyMs).toBeGreaterThanOrEqual(0);

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should log user engagement with all required fields', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.uuid(),
                    fc.uuid(),
                    fc.constantFrom('dismissed', 'cooldown_started', 'proceeded'),
                    productInfoArbitrary,
                    analysisResultArbitrary,
                    async (userId, sessionId, action, product, analysis) => {
                        const initialCallCount = traceCalls.length;

                        await tracker.logUserEngagement(
                            userId,
                            sessionId,
                            action as 'dismissed' | 'cooldown_started' | 'proceeded',
                            product as ProductInfo,
                            analysis as AnalysisResult
                        );

                        expect(traceCalls.length).toBeGreaterThan(initialCallCount);

                        const traceCall = traceCalls[traceCalls.length - 1];

                        // Verify engagement trace structure
                        expect(traceCall.name).toBe('user-engagement');
                        const input = traceCall.input as Record<string, unknown>;
                        expect(input.productName).toBe(product.name);
                        const output = traceCall.output as Record<string, unknown>;
                        expect(output.userAction).toBe(action);
                        const metadata = traceCall.metadata as Record<string, unknown>;
                        expect(metadata.userId).toBe(userId);
                        expect(metadata.sessionId).toBe(sessionId);

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should log cooldown events with event type', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.uuid(),
                    fc.constantFrom('started', 'checked', 'expired', 'cancelled'),
                    fc.webUrl(),
                    fc.option(fc.integer({ min: 0, max: 86400000 }), { nil: undefined }),
                    async (userId, eventType, productUrl, remainingTimeMs) => {
                        const initialCallCount = traceCalls.length;

                        await tracker.logCooldownEvent(
                            userId,
                            eventType as 'started' | 'checked' | 'expired' | 'cancelled',
                            productUrl,
                            remainingTimeMs
                        );

                        expect(traceCalls.length).toBeGreaterThan(initialCallCount);

                        const traceCall = traceCalls[traceCalls.length - 1];

                        // Verify cooldown trace structure
                        expect(traceCall.name).toBe('cooldown-event');
                        const input = traceCall.input as Record<string, unknown>;
                        expect(input.eventType).toBe(eventType);
                        expect(input.productUrl).toBe(productUrl);
                        const metadata = traceCall.metadata as Record<string, unknown>;
                        expect(metadata.userId).toBe(userId);

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Unit tests
    describe('Unit Tests', () => {
        it('should flush traces after logging', async () => {
            const initialFlushCount = flushCalls.length;

            await tracker.logProfileUpdate('user-123', ['savingsGoal', 'monthlyBudget']);

            expect(flushCalls.length).toBeGreaterThan(initialFlushCount);
        });

        it('should calculate followedAdvice correctly', async () => {
            const product: ProductInfo = {
                name: 'Test',
                price: 100,
                currency: 'USD',
                url: 'http://test.com',
                urgencyIndicators: [],
            };

            const analysis: AnalysisResult = {
                isEssential: false,
                essentialityScore: 0.3,
                reasoning: 'Not essential',
                warnings: [],
                opportunityCost: {
                    amount: 100,
                    projections: { years5: 140, years10: 197, years20: 387 },
                    comparisonText: 'test',
                },
                personalizedMessage: 'Consider waiting',
                suggestedAction: 'cooldown',
            };

            // User follows advice (cooldown suggested, cooldown started)
            await tracker.logUserEngagement(
                'user-123',
                'session-456',
                'cooldown_started',
                product,
                analysis
            );

            const traceCall = traceCalls[traceCalls.length - 1];
            const output = traceCall.output as Record<string, unknown>;
            expect(output.followedAdvice).toBe(true);
        });
    });
});
