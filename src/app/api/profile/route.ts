// API Route: /api/profile
// Manages user profiles

import { NextRequest, NextResponse } from 'next/server';
import { userProfileManager } from '@/lib/user-profile';
import type { UserProfile } from '@/lib/types';

// GET /api/profile?userId=xxx
export async function GET(request: NextRequest) {
    try {
        const userId = request.nextUrl.searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'userId is required' },
                { status: 400 }
            );
        }

        const profile = await userProfileManager.get(userId);

        if (!profile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, profile });
    } catch (error) {
        console.error('Get profile error:', error);
        return NextResponse.json(
            { error: 'Failed to get profile' },
            { status: 500 }
        );
    }
}

// POST /api/profile
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, ...profileData } = body as Partial<UserProfile> & { userId?: string };

        let profile;

        if (userId) {
            // Update existing profile
            const existing = await userProfileManager.get(userId);
            if (existing) {
                profile = await userProfileManager.update(userId, profileData);
            } else {
                profile = await userProfileManager.create(profileData);
            }
        } else {
            // Create new profile
            profile = await userProfileManager.create(profileData);
        }

        return NextResponse.json({ success: true, profile });
    } catch (error) {
        console.error('Create/update profile error:', error);
        return NextResponse.json(
            { error: 'Failed to save profile' },
            { status: 500 }
        );
    }
}
