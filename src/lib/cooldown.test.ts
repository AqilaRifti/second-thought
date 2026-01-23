// Feature: second-thought, Property 6: Cool-Down Persistence Round-Trip
// Feature: second-thought, Property 7: Cool-Down State Retrieval
// Validates: Requirements 5.2, 5.3

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock Supabase for testing
vi.mock('./supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

import { CoolDownManager, COOLDOWN_DURATION_MS } from './cooldown';
import { supabase } from './supabase';
import type { ProductInfo, AnalysisResult } from './types';

// Arbitraries for generating test data
const productInfoArbitrary = fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    price: fc.integer({ min: 1, max: 100000 }),
    currency: fc.constantFrom('USD', 'EUR', 'GBP'),
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

describe('Cool-Down Manager', () => {
    let manager: CoolDownManager;
    const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        manager = new CoolDownManager();
    });

    // Property 6: Cool-Down Persistence Round-Trip
    describe('Property 6: Persistence Round-Trip', () => {
        it('should preserve productInfo and analysisResult when starting and checking a cool-down', async () => {
            await fc.assert(
                fc.asyncProperty(
                    productInfoArbitrary,
                    analysisResultArbitrary,
                    async (productInfo, analysisResult) => {
                        const mockId = 'cooldown-uuid-123';
                        const userId = 'user-uuid-456';
                        const now = new Date();
                        const expiresAt = new Date(now.getTime() + COOLDOWN_DURATION_MS);

                        const dbResponse = {
                            id: mockId,
                            user_id: userId,
                            product_url: productInfo.url,
                            product_info: productInfo,
                            analysis_result: analysisResult,
                            started_at: now.toISOString(),
                            expires_at: expiresAt.toISOString(),
                            status: 'active',
                            created_at: now.toISOString(),
                        };

                        // Mock insert
                        mockFrom.mockReturnValue({
                            insert: vi.fn().mockReturnValue({
                                select: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({ data: dbResponse, error: null }),
                                }),
                            }),
                        });

                        const created = await manager.start(
                            userId,
                            productInfo as ProductInfo,
                            analysisResult as AnalysisResult
                        );

                        // Verify round-trip preserves data
                        expect(created.productInfo.name).toBe(productInfo.name);
                        expect(created.productInfo.price).toBe(productInfo.price);
                        expect(created.productInfo.url).toBe(productInfo.url);
                        expect(created.analysisResult.isEssential).toBe(analysisResult.isEssential);
                        expect(created.analysisResult.reasoning).toBe(analysisResult.reasoning);
                        expect(created.id).toBe(mockId);
                        expect(created.userId).toBe(userId);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Property 7: Cool-Down State Retrieval
    describe('Property 7: State Retrieval', () => {
        it('should return active cool-down with correct remaining time', async () => {
            await fc.assert(
                fc.asyncProperty(
                    productInfoArbitrary,
                    fc.integer({ min: 1, max: 23 }), // hours remaining
                    async (productInfo, hoursRemaining) => {
                        const mockId = 'cooldown-uuid-789';
                        const userId = 'user-uuid-abc';
                        const now = new Date();
                        const expiresAt = new Date(now.getTime() + hoursRemaining * 60 * 60 * 1000);

                        const dbResponse = {
                            id: mockId,
                            user_id: userId,
                            product_url: productInfo.url,
                            product_info: productInfo,
                            analysis_result: { isEssential: false, reasoning: 'test' },
                            started_at: new Date(now.getTime() - (24 - hoursRemaining) * 60 * 60 * 1000).toISOString(),
                            expires_at: expiresAt.toISOString(),
                            status: 'active',
                            created_at: now.toISOString(),
                        };

                        // Mock update for expireOldCooldowns
                        mockFrom.mockReturnValueOnce({
                            update: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    lt: vi.fn().mockResolvedValue({ error: null }),
                                }),
                            }),
                        });

                        // Mock select for check
                        mockFrom.mockReturnValueOnce({
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    eq: vi.fn().mockReturnValue({
                                        eq: vi.fn().mockReturnValue({
                                            single: vi.fn().mockResolvedValue({ data: dbResponse, error: null }),
                                        }),
                                    }),
                                }),
                            }),
                        });

                        const coolDown = await manager.check(userId, productInfo.url);

                        // Verify state retrieval
                        expect(coolDown).not.toBeNull();
                        expect(coolDown!.status).toBe('active');
                        expect(coolDown!.expiresAt.getTime()).toBeGreaterThan(Date.now());

                        // Verify remaining time calculation
                        const remaining = manager.getRemainingTime(coolDown!);
                        expect(remaining).toBeGreaterThan(0);
                        expect(remaining).toBeLessThanOrEqual(hoursRemaining * 60 * 60 * 1000 + 1000); // +1s tolerance
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Unit tests
    describe('Unit Tests', () => {
        it('should format remaining time correctly', () => {
            const now = new Date();

            // 5 hours remaining
            const coolDown5h = {
                id: '1',
                userId: 'user',
                productUrl: 'http://test.com',
                productInfo: {} as ProductInfo,
                analysisResult: {} as AnalysisResult,
                startedAt: now,
                expiresAt: new Date(now.getTime() + 5 * 60 * 60 * 1000 + 30 * 60 * 1000),
                status: 'active' as const,
            };
            expect(manager.formatRemainingTime(coolDown5h)).toMatch(/5h \d+m remaining/);

            // ~30 minutes remaining (allow for timing variance)
            const coolDown30m = {
                ...coolDown5h,
                expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
            };
            expect(manager.formatRemainingTime(coolDown30m)).toMatch(/\d+m remaining/);

            // Expired
            const coolDownExpired = {
                ...coolDown5h,
                expiresAt: new Date(now.getTime() - 1000),
            };
            expect(manager.formatRemainingTime(coolDownExpired)).toBe('Expired');
        });

        it('should return null for non-existent cool-down', async () => {
            // Mock update for expireOldCooldowns
            mockFrom.mockReturnValueOnce({
                update: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        lt: vi.fn().mockResolvedValue({ error: null }),
                    }),
                }),
            });

            // Mock select returning no data
            mockFrom.mockReturnValueOnce({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
                            }),
                        }),
                    }),
                }),
            });

            const result = await manager.check('user-id', 'http://nonexistent.com');
            expect(result).toBeNull();
        });

        it('should throw error on start failure', async () => {
            mockFrom.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
                    }),
                }),
            });

            await expect(
                manager.start('user-id', { url: 'http://test.com' } as ProductInfo, {} as AnalysisResult)
            ).rejects.toThrow('Failed to start cool-down');
        });
    });
});
