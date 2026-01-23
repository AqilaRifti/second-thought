// Cool-Down Manager
// Manages 24-hour waiting periods for non-essential purchases

import { supabase, DbCooldown } from './supabase';
import type { CoolDown, ProductInfo, AnalysisResult } from './types';

const COOLDOWN_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Convert database format to application format
function dbToCoolDown(db: DbCooldown): CoolDown {
    return {
        id: db.id,
        userId: db.user_id,
        productUrl: db.product_url,
        productInfo: db.product_info as unknown as ProductInfo,
        analysisResult: db.analysis_result as unknown as AnalysisResult,
        startedAt: new Date(db.started_at),
        expiresAt: new Date(db.expires_at),
        status: db.status,
    };
}

export class CoolDownManager {
    async start(
        userId: string,
        product: ProductInfo,
        analysis: AnalysisResult
    ): Promise<CoolDown> {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + COOLDOWN_DURATION_MS);

        const { data, error } = await supabase
            .from('cooldowns')
            .insert({
                user_id: userId,
                product_url: product.url,
                product_info: product,
                analysis_result: analysis,
                started_at: now.toISOString(),
                expires_at: expiresAt.toISOString(),
                status: 'active',
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to start cool-down: ${error.message}`);
        }

        return dbToCoolDown(data as DbCooldown);
    }

    async check(userId: string, productUrl: string): Promise<CoolDown | null> {
        // First, expire any old cooldowns
        await this.expireOldCooldowns();

        const { data, error } = await supabase
            .from('cooldowns')
            .select('*')
            .eq('user_id', userId)
            .eq('product_url', productUrl)
            .eq('status', 'active')
            .single();

        if (error || !data) {
            return null;
        }

        return dbToCoolDown(data as DbCooldown);
    }

    async cancel(coolDownId: string): Promise<void> {
        const { error } = await supabase
            .from('cooldowns')
            .update({ status: 'cancelled' })
            .eq('id', coolDownId);

        if (error) {
            throw new Error(`Failed to cancel cool-down: ${error.message}`);
        }
    }

    async getActive(userId: string): Promise<CoolDown[]> {
        // First, expire any old cooldowns
        await this.expireOldCooldowns();

        const { data, error } = await supabase
            .from('cooldowns')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('expires_at', { ascending: true });

        if (error) {
            throw new Error(`Failed to get active cool-downs: ${error.message}`);
        }

        return (data || []).map((d) => dbToCoolDown(d as DbCooldown));
    }

    async getExpired(userId: string): Promise<CoolDown[]> {
        const { data, error } = await supabase
            .from('cooldowns')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'expired')
            .order('expires_at', { ascending: false })
            .limit(10);

        if (error) {
            throw new Error(`Failed to get expired cool-downs: ${error.message}`);
        }

        return (data || []).map((d) => dbToCoolDown(d as DbCooldown));
    }

    private async expireOldCooldowns(): Promise<void> {
        const now = new Date().toISOString();

        await supabase
            .from('cooldowns')
            .update({ status: 'expired' })
            .eq('status', 'active')
            .lt('expires_at', now);
    }

    getRemainingTime(coolDown: CoolDown): number {
        const now = Date.now();
        const expiresAt = coolDown.expiresAt.getTime();
        return Math.max(0, expiresAt - now);
    }

    formatRemainingTime(coolDown: CoolDown): string {
        const remaining = this.getRemainingTime(coolDown);

        if (remaining <= 0) {
            return 'Expired';
        }

        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m remaining`;
        }
        return `${minutes}m remaining`;
    }
}

// Singleton instance
export const coolDownManager = new CoolDownManager();

export { COOLDOWN_DURATION_MS };
