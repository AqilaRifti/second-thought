// API Route: /api/analyze
// Analyzes a product and returns purchase insights

import { NextRequest, NextResponse } from 'next/server';
import { analyzePurchase } from '@/lib/cerebras';
import { analyzePricing } from '@/lib/pricing-analyzer';
import { userProfileManager } from '@/lib/user-profile';
import type { ProductInfo, AnalysisResult } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { product, userId } = body as { product: ProductInfo; userId?: string };

        if (!product || !product.name || !product.price) {
            return NextResponse.json(
                { error: 'Invalid product data. Name and price are required.' },
                { status: 400 }
            );
        }

        // Get or create user profile if userId provided
        let userProfile = undefined;
        if (userId) {
            userProfile = await userProfileManager.getOrCreate(userId);
        }

        // Analyze pricing patterns
        const pricingWarnings = analyzePricing(product);

        // Get AI analysis
        const startTime = Date.now();
        const analysis = await analyzePurchase(product, userProfile);
        const latencyMs = Date.now() - startTime;

        // Merge pricing warnings with AI warnings
        const result: AnalysisResult = {
            ...analysis,
            warnings: [...analysis.warnings, ...pricingWarnings],
        };

        return NextResponse.json({
            success: true,
            analysis: result,
            metadata: {
                latencyMs,
                hasUserProfile: !!userProfile,
            },
        });
    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze product' },
            { status: 500 }
        );
    }
}
