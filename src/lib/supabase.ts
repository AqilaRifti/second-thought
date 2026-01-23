// Supabase client configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Database features will be disabled.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface DbUserProfile {
    id: string;
    savings_goal: number | null;
    monthly_budget: number | null;
    financial_goals: string[];
    spending_threshold: number;
    cooldown_enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface DbCooldown {
    id: string;
    user_id: string;
    product_url: string;
    product_info: Record<string, unknown>;
    analysis_result: Record<string, unknown>;
    started_at: string;
    expires_at: string;
    status: 'active' | 'expired' | 'cancelled';
    created_at: string;
}

export interface DbIntervention {
    id: string;
    user_id: string;
    product_info: Record<string, unknown>;
    analysis_result: Record<string, unknown>;
    user_action: 'dismissed' | 'cooldown_started' | 'proceeded';
    created_at: string;
}
