import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveHelpRequestSchema } from '@/lib/validations'
import { RequestStatus } from '@prisma/client'
import { createWebhookSender } from '@/lib/webhook'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await request.json()
        const validatedData = resolveHelpRequestSchema.parse(body)
        const { id } = await params

        // Check if help request exists and is pending
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

        // Start a transaction to update help request and optionally add to knowledge base
        const result = await prisma.$transaction(async (tx) => {
            // Update help request
            const updatedRequest = await tx.helpRequest.update({
                where: { id },
                data: {
                    status: RequestStatus.RESOLVED,
                    answer: validatedData.answer,
                    resolvedBy: validatedData.resolvedBy,
                },
            })

            // Add to knowledge base if requested
            if (validatedData.learn) {
                await tx.knowledgeBase.upsert({
                    where: { question: existingRequest.question },
                    update: {
                        answer: validatedData.answer,
                        source: 'supervisor',
                    },
                    create: {
                        question: existingRequest.question,
                        answer: validatedData.answer,
                        source: 'supervisor',
                    },
                })
            }

            // Log the resolution
            await tx.systemLog.create({
                data: {
                    level: 'info',
                    event: 'HELP_REQUEST_RESOLVED',
                    message: `Help request resolved by ${validatedData.resolvedBy}`,
                    metadata: {
                        requestId: id,
                        resolvedBy: validatedData.resolvedBy,
                        addedToKnowledgeBase: validatedData.learn,
                        resolutionTime: Date.now() - existingRequest.createdAt.getTime(),
                    },
                },
            })

            return updatedRequest
        })

        // Send webhook notification to agent
        const webhookSender = createWebhookSender()
        if (webhookSender) {
            try {
                const webhookSuccess = await webhookSender.sendWebhook({
                    requestId: id,
                    answer: validatedData.answer,
                    callerId: existingRequest.callerId || undefined,
                    callerPhone: existingRequest.callerPhone || undefined,
                    resolvedBy: validatedData.resolvedBy,
                    timestamp: new Date().toISOString(),
                })

                if (!webhookSuccess) {
                    console.warn(`Failed to send webhook for request ${id}`)
                    // Log webhook failure but don't fail the request
                    await prisma.systemLog.create({
                        data: {
                            level: 'warn',
                            event: 'WEBHOOK_FAILED',
                            message: `Failed to send webhook notification for resolved request`,
                            metadata: {
                                requestId: id,
                                resolvedBy: validatedData.resolvedBy,
                            },
                        },
                    })
                }
            } catch (error) {
                console.error('Error sending webhook:', error)
            }
        }

        return NextResponse.json({
            id: result.id,
            status: result.status,
            answer: result.answer,
            resolvedBy: result.resolvedBy,
            updatedAt: result.updatedAt,
        })
    } catch (error) {
        console.error('Error resolving help request:', error)

        if (error instanceof Error && error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.message },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}