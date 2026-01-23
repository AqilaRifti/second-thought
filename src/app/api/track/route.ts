// API Route: /api/track
// Tracks user engagement events for Opik observability

import { NextRequest, NextResponse } from 'next/server';
import { opikTracker } from '@/lib/opik';
import type { ProductInfo, AnalysisResult } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { eventType, userId, sessionId, data } = body as {
            eventType: 'engagement' | 'cooldown' | 'profile';
            userId: string;
            sessionId?: string;
            data: Record<string, unknown>;
        };

        if (!eventType || !userId) {
            return NextResponse.json(
                { error: 'eventType and userId are required' },
                { status: 400 }
            );
        }

        switch (eventType) {
            case 'engagement':
                await opikTracker.logUserEngagement(
                    userId,
                    sessionId || 'unknown',
                    data.action as 'dismissed' | 'cooldown_started' | 'proceeded',
                    data.product as ProductInfo,
                    data.analysis as AnalysisResult
                );
                break;

            case 'cooldown':
                await opikTracker.logCooldownEvent(
                    userId,
                    data.event as 'started' | 'checked' | 'expired' | 'cancelled',
                    data.productUrl as string,
                    data.remainingTimeMs as number | undefined
                );
                break;

            case 'profile':
                await opikTracker.logProfileUpdate(
                    userId,
                    data.updatedFields as string[]
                );
                break;

            default:
                return NextResponse.json(
                    { error: 'Invalid event type' },
                    { status: 400 }
                );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Track event error:', error);
        return NextResponse.json(
            { error: 'Failed to track event' },
            { status: 500 }
        );
    }
}
