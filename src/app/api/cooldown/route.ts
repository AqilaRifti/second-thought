// API Route: /api/cooldown
// Manages cool-down periods

import { NextRequest, NextResponse } from 'next/server';
import { coolDownManager } from '@/lib/cooldown';
import { userProfileManager } from '@/lib/user-profile';
import type { ProductInfo, AnalysisResult } from '@/lib/types';

// GET /api/cooldown?userId=xxx&productUrl=xxx
export async function GET(request: NextRequest) {
    try {
        const userId = request.nextUrl.searchParams.get('userId');
        const productUrl = request.nextUrl.searchParams.get('productUrl');

        if (!userId) {
            return NextResponse.json(
                { error: 'userId is required' },
                { status: 400 }
            );
        }

        if (productUrl) {
            // Check specific product
            const coolDown = await coolDownManager.check(userId, productUrl);

            if (!coolDown) {
                return NextResponse.json({ success: true, coolDown: null });
            }

            return NextResponse.json({
                success: true,
                coolDown: {
                    ...coolDown,
                    remainingTime: coolDownManager.getRemainingTime(coolDown),
                    formattedTime: coolDownManager.formatRemainingTime(coolDown),
                },
            });
        } else {
            // Get all active cool-downs
            const coolDowns = await coolDownManager.getActive(userId);

            return NextResponse.json({
                success: true,
                coolDowns: coolDowns.map((cd) => ({
                    ...cd,
                    remainingTime: coolDownManager.getRemainingTime(cd),
                    formattedTime: coolDownManager.formatRemainingTime(cd),
                })),
            });
        }
    } catch (error) {
        console.error('Get cooldown error:', error);
        return NextResponse.json(
            { error: 'Failed to get cool-down' },
            { status: 500 }
        );
    }
}

// POST /api/cooldown
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, product, analysis } = body as {
            userId: string;
            product: ProductInfo;
            analysis: AnalysisResult;
        };

        if (!userId || !product || !analysis) {
            return NextResponse.json(
                { error: 'userId, product, and analysis are required' },
                { status: 400 }
            );
        }

        // Ensure user profile exists before creating cooldown
        await userProfileManager.getOrCreate(userId);

        const coolDown = await coolDownManager.start(userId, product, analysis);

        return NextResponse.json({
            success: true,
            coolDown: {
                ...coolDown,
                remainingTime: coolDownManager.getRemainingTime(coolDown),
                formattedTime: coolDownManager.formatRemainingTime(coolDown),
            },
        });
    } catch (error) {
        console.error('Start cooldown error:', error);
        return NextResponse.json(
            { error: 'Failed to start cool-down' },
            { status: 500 }
        );
    }
}

// DELETE /api/cooldown?id=xxx
export async function DELETE(request: NextRequest) {
    try {
        const coolDownId = request.nextUrl.searchParams.get('id');

        if (!coolDownId) {
            return NextResponse.json(
                { error: 'id is required' },
                { status: 400 }
            );
        }

        await coolDownManager.cancel(coolDownId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Cancel cooldown error:', error);
        return NextResponse.json(
            { error: 'Failed to cancel cool-down' },
            { status: 500 }
        );
    }
}
