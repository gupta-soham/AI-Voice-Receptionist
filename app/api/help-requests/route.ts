import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createHelpRequestSchema, helpRequestQuerySchema } from '@/lib/validations'
import { RequestStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const validatedData = createHelpRequestSchema.parse(body)

        const helpRequest = await prisma.helpRequest.create({
            data: {
                ...validatedData,
                status: RequestStatus.PENDING,
            },
        })

        // Log the help request creation
        await prisma.systemLog.create({
            data: {
                level: 'info',
                event: 'HELP_REQUEST_CREATED',
                message: `Help request created for question: ${validatedData.question.substring(0, 50)}...`,
                metadata: {
                    requestId: helpRequest.id,
                    callerId: validatedData.callerId,
                    callerPhone: validatedData.callerPhone,
                },
            },
        })

        return NextResponse.json(
            {
                id: helpRequest.id,
                status: helpRequest.status,
                createdAt: helpRequest.createdAt,
            },
            { status: 201 }
        )
    } catch (error) {
        console.error('Error creating help request:', error)

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

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        
        // Build query object with only non-null values
        const queryParams: any = {}
        
        const status = searchParams.get('status')
        if (status) queryParams.status = status
        
        const page = searchParams.get('page')
        if (page) queryParams.page = page
        
        const limit = searchParams.get('limit')
        if (limit) queryParams.limit = limit
        
        const search = searchParams.get('search')
        if (search) queryParams.search = search
        
        const query = helpRequestQuerySchema.parse(queryParams)

        const skip = (query.page - 1) * query.limit

        // Build where clause
        const where: any = {}

        if (query.status) {
            where.status = query.status
        }

        if (query.search) {
            where.OR = [
                { question: { contains: query.search, mode: 'insensitive' } },
                { answer: { contains: query.search, mode: 'insensitive' } },
                { callerId: { contains: query.search, mode: 'insensitive' } },
                { callerPhone: { contains: query.search, mode: 'insensitive' } },
            ]
        }

        const [helpRequests, total] = await Promise.all([
            prisma.helpRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: query.limit,
            }),
            prisma.helpRequest.count({ where }),
        ])

        return NextResponse.json({
            items: helpRequests,
            total,
            page: query.page,
            limit: query.limit,
            totalPages: Math.ceil(total / query.limit),
        })
    } catch (error) {
        console.error('Error fetching help requests:', error)

        if (error instanceof Error && error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Invalid query parameters', details: error.message },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}