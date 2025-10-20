import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const { helpRequestIds, callerId } = await request.json();

        if (!helpRequestIds || !Array.isArray(helpRequestIds)) {
            return NextResponse.json(
                { error: 'helpRequestIds array is required' },
                { status: 400 }
            );
        }

        // Check for resolved requests
        const resolvedRequests = await prisma.helpRequest.findMany({
            where: {
                id: { in: helpRequestIds },
                status: 'RESOLVED',
                ...(callerId && { callerId }),
            },
            select: {
                id: true,
                question: true,
                answer: true,
                resolvedBy: true,
                updatedAt: true,
                callerId: true,
            },
        });

        return NextResponse.json({
            resolvedRequests,
            hasUpdates: resolvedRequests.length > 0,
        });

    } catch (error) {
        console.error('Error checking for help request updates:', error);
        return NextResponse.json(
            { error: 'Failed to check for updates' },
            { status: 500 }
        );
    }
}