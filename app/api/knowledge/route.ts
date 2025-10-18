import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createKnowledgeSchema, knowledgeQuerySchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)

        // Build query object with only non-null values
        const queryParams: any = {}

        const page = searchParams.get('page')
        if (page) queryParams.page = page

        const limit = searchParams.get('limit')
        if (limit) queryParams.limit = limit

        const search = searchParams.get('search')
        if (search) queryParams.search = search

        const query = knowledgeQuerySchema.parse(queryParams)

        const skip = (query.page - 1) * query.limit

        // Build where clause
        const where: any = {}

        if (query.search) {
            where.OR = [
                { question: { contains: query.search, mode: 'insensitive' } },
                { answer: { contains: query.search, mode: 'insensitive' } },
            ]
        }

        const [knowledgeEntries, total] = await Promise.all([
            prisma.knowledgeBase.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: query.limit,
            }),
            prisma.knowledgeBase.count({ where }),
        ])

        return NextResponse.json({
            items: knowledgeEntries,
            total,
            page: query.page,
            limit: query.limit,
            totalPages: Math.ceil(total / query.limit),
        })
    } catch (error) {
        console.error('Error fetching knowledge base:', error)

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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const validatedData = createKnowledgeSchema.parse(body)

        const knowledgeEntry = await prisma.knowledgeBase.create({
            data: {
                ...validatedData,
                source: validatedData.source || 'manual',
            },
        })

        // Log the knowledge base entry creation
        await prisma.systemLog.create({
            data: {
                level: 'info',
                event: 'KB_ENTRY_CREATED',
                message: `Knowledge base entry created: ${validatedData.question.substring(0, 50)}...`,
                metadata: {
                    entryId: knowledgeEntry.id,
                    source: knowledgeEntry.source,
                },
            },
        })

        return NextResponse.json(knowledgeEntry, { status: 201 })
    } catch (error) {
        console.error('Error creating knowledge base entry:', error)

        if (error instanceof Error && error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Invalid request data', details: error.message },
                { status: 400 }
            )
        }

        // Handle unique constraint violation
        if (error instanceof Error && error.message.includes('Unique constraint')) {
            return NextResponse.json(
                { error: 'A knowledge base entry with this question already exists' },
                { status: 409 }
            )
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}