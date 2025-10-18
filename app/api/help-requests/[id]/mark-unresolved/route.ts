import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { RequestStatus } from '@prisma/client'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Check if help request exists
        const existingRequest = await prisma.helpRequest.findUnique({
            where: { id },
        })

        if (!existingRequest) {
            return NextResponse.json(
                { error: 'Help request not found' },
                { status: 404 }
            )
        }

        if (existingRequest.status !== RequestStatus.PENDING) {
            return NextResponse.json(
                { error: 'Help request is not pending' },
                { status: 400 }
            )
        }

        // Update help request to unresolved
        const updatedRequest = await prisma.helpRequest.update({
            where: { id },
            data: {
                status: RequestStatus.UNRESOLVED,
                timeoutAt: new Date(),
            },
        })

        // Log the timeout
        await prisma.systemLog.create({
            data: {
                level: 'warn',
                event: 'HELP_REQUEST_TIMEOUT',
                message: `Help request marked as unresolved due to timeout`,
                metadata: {
                    requestId: id,
                    originalCreatedAt: existingRequest.createdAt,
                    timeoutDuration: Date.now() - existingRequest.createdAt.getTime(),
                },
            },
        })

        return NextResponse.json({
            id: updatedRequest.id,
            status: updatedRequest.status,
            timeoutAt: updatedRequest.timeoutAt,
            updatedAt: updatedRequest.updatedAt,
        })
    } catch (error) {
        console.error('Error marking help request as unresolved:', error)

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}