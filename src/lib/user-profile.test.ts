// Feature: second-thought, Property 8: User Profile Persistence Round-Trip
// Validates: Requirements 6.2

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock Supabase for testing - must be hoisted
vi.mock('./supabase', () => ({
    supabase: {
        from: vi.fn(),
    },
}));

// Import after mocking
import { UserProfileManager } from './user-profile';
import { supabase } from './supabase';

// Arbitrary for generating valid user profiles
const userProfileArbitrary = fc.record({
    savingsGoal: fc.option(fc.integer({ min: 0, max: 1000000 }), { nil: undefined }),
    monthlyBudget: fc.option(fc.integer({ min: 0, max: 100000 }), { nil: undefined }),
    financialGoals: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }),
    spendingThreshold: fc.integer({ min: 1, max: 10000 }),
    coolDownEnabled: fc.boolean(),
});

describe('User Profile Manager', () => {
    let manager: UserProfileManager;
    const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        manager = new UserProfileManager();
    });

    // Property 8: User Profile Persistence Round-Trip
    describe('Property 8: Persistence Round-Trip', () => {
        it('should preserve all fields when creating and retrieving a profile', async () => {
            await fc.assert(
                fc.asyncProperty(userProfileArbitrary, async (profileInput) => {
                    const mockId = 'test-uuid-123';
                    const now = new Date().toISOString();

                    // Mock the create response
                    const dbResponse = {
                        id: mockId,
                        savings_goal: profileInput.savingsGoal ?? null,
                        monthly_budget: profileInput.monthlyBudget ?? null,
                        financial_goals: profileInput.financialGoals,
                        spending_threshold: profileInput.spendingThreshold,
                        cooldown_enabled: profileInput.coolDownEnabled,
                        created_at: now,
                        updated_at: now,
                    };

                    mockFrom.mockReturnValue({
                        insert: vi.fn().mockReturnValue({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({ data: dbResponse, error: null }),
                            }),
                        }),
                    });

                    const created = await manager.create(profileInput);

                    // Verify round-trip preserves data
                    if (profileInput.savingsGoal !== undefined) {
                        expect(created.savingsGoal).toBe(profileInput.savingsGoal);
                    }
                    if (profileInput.monthlyBudget !== undefined) {
                        expect(created.monthlyBudget).toBe(profileInput.monthlyBudget);
                    }
                    expect(created.financialGoals).toEqual(profileInput.financialGoals);
                    expect(created.spendingThreshold).toBe(profileInput.spendingThreshold);
                    expect(created.coolDownEnabled).toBe(profileInput.coolDownEnabled);
                    expect(created.id).toBe(mockId);
                }),
                { numRuns: 100 }
            );
        });

        it('should preserve all fields when updating a profile', async () => {
            await fc.assert(
                fc.asyncProperty(userProfileArbitrary, async (profileInput) => {
                    const mockId = 'test-uuid-456';
                    const now = new Date().toISOString();

                    const dbResponse = {
                        id: mockId,
                        savings_goal: profileInput.savingsGoal ?? null,
                        monthly_budget: profileInput.monthlyBudget ?? null,
                        financial_goals: profileInput.financialGoals,
                        spending_threshold: profileInput.spendingThreshold,
                        cooldown_enabled: profileInput.coolDownEnabled,
                        created_at: now,
                        updated_at: now,
                    };

                    mockFrom.mockReturnValue({
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                select: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({ data: dbResponse, error: null }),
                                }),
                            }),
                        }),
                    });

                    const updated = await manager.update(mockId, profileInput);

                    // Verify update preserves data
                    if (profileInput.savingsGoal !== undefined) {
                        expect(updated.savingsGoal).toBe(profileInput.savingsGoal);
                    }
                    if (profileInput.monthlyBudget !== undefined) {
                        expect(updated.monthlyBudget).toBe(profileInput.monthlyBudget);
                    }
                    expect(updated.financialGoals).toEqual(profileInput.financialGoals);
                    expect(updated.spendingThreshold).toBe(profileInput.spendingThreshold);
                    expect(updated.coolDownEnabled).toBe(profileInput.coolDownEnabled);
                }),
                { numRuns: 100 }
            );
        });
    });

    // Unit tests
    describe('Unit Tests', () => {
        it('should return null for non-existent profile', async () => {
            mockFrom.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
                    }),
                }),
            });

            const result = await manager.get('non-existent-id');
            expect(result).toBeNull();
        });

        it('should throw error on create failure', async () => {
            mockFrom.mockReturnValue({
                insert: vi.fn().mockReturnValue({
                    select: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
                    }),
                }),
            });

            await expect(manager.create({})).rejects.toThrow('Failed to create user profile');
        });

        it('should convert dates correctly', async () => {
            const now = '2026-01-15T12:00:00.000Z';
            const dbResponse = {
                id: 'test-id',
                savings_goal: 5000,
                monthly_budget: 3000,
                financial_goals: ['Save for vacation'],
                spending_threshold: 50,
                cooldown_enabled: true,
                created_at: now,
                updated_at: now,
            };

            mockFrom.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: dbResponse, error: null }),
                    }),
                }),
            });

            const profile = await manager.get('test-id');
            expect(profile?.createdAt).toBeInstanceOf(Date);
            expect(profile?.updatedAt).toBeInstanceOf(Date);
        });
    });
});
