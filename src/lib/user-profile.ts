// User Profile Manager
import { supabase, DbUserProfile } from './supabase';
import type { UserProfile } from './types';

// Convert database format to application format
function dbToUserProfile(db: DbUserProfile): UserProfile {
    return {
        id: db.id,
        savingsGoal: db.savings_goal ?? undefined,
        monthlyBudget: db.monthly_budget ?? undefined,
        financialGoals: db.financial_goals || [],
        spendingThreshold: db.spending_threshold,
        coolDownEnabled: db.cooldown_enabled,
        createdAt: new Date(db.created_at),
        updatedAt: new Date(db.updated_at),
    };
}

// Convert application format to database format
function userProfileToDb(profile: Partial<UserProfile>): Partial<DbUserProfile> {
    const db: Partial<DbUserProfile> = {};

    if (profile.savingsGoal !== undefined) db.savings_goal = profile.savingsGoal;
    if (profile.monthlyBudget !== undefined) db.monthly_budget = profile.monthlyBudget;
    if (profile.financialGoals !== undefined) db.financial_goals = profile.financialGoals;
    if (profile.spendingThreshold !== undefined) db.spending_threshold = profile.spendingThreshold;
    if (profile.coolDownEnabled !== undefined) db.cooldown_enabled = profile.coolDownEnabled;

    return db;
}

export class UserProfileManager {
    async get(userId: string): Promise<UserProfile | null> {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !data) {
            return null;
        }

        return dbToUserProfile(data as DbUserProfile);
    }

    async create(profile: Partial<UserProfile> & { id?: string } = {}): Promise<UserProfile> {
        const dbProfile: Partial<DbUserProfile> = userProfileToDb(profile);

        // If an ID is provided, use it
        if (profile.id) {
            dbProfile.id = profile.id;
        }

        const { data, error } = await supabase
            .from('user_profiles')
            .insert(dbProfile)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create user profile: ${error.message}`);
        }

        return dbToUserProfile(data as DbUserProfile);
    }

    async update(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
        const dbUpdates = userProfileToDb(updates);

        const { data, error } = await supabase
            .from('user_profiles')
            .update(dbUpdates)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update user profile: ${error.message}`);
        }

        return dbToUserProfile(data as DbUserProfile);
    }

    async getOrCreate(userId?: string): Promise<UserProfile> {
        if (userId) {
            const existing = await this.get(userId);
            if (existing) return existing;
            // Create with the specific ID
            return this.create({ id: userId });
        }
        return this.create();
    }
}

// Singleton instance
export const userProfileManager = new UserProfileManager();
