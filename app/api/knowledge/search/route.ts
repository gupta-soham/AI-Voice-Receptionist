import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const searchSchema = z.object({
    q: z.string().min(1, 'Search query is required'),
    limit: z.coerce.number().min(1).max(10).default(5),
})

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchSchema.parse({
            q: searchParams.get('q'),
            limit: searchParams.get('limit'),
        })

        // Search for knowledge base entries that match the query
        const results = await prisma.knowledgeBase.findMany({
            where: {
                OR: [
                    { question: { contains: query.q, mode: 'insensitive' } },
                    { answer: { contains: query.q, mode: 'insensitive' } },
                ],
            },
            orderBy: [
                // Prioritize exact matches in questions
                { question: 'asc' },
                { createdAt: 'desc' },
            ],
            take: query.limit,
        })

        // Calculate simple relevance scores
        const scoredResults = results.map(entry => {
            let score = 0
            const queryLower = query.q.toLowerCase()
            const questionLower = entry.question.toLowerCase()
            const answerLower = entry.answer.toLowerCase()

            // Exact match in question gets highest score
            if (questionLower.includes(queryLower)) {
                score += 10
            }

            // Partial match in question
            const questionWords = questionLower.split(' ')
            const queryWords = queryLower.split(' ')
            const questionMatches = queryWords.filter(word =>
                questionWords.some(qWord => qWord.includes(word))
            ).length
            score += questionMatches * 3

            // Match in answer
            if (answerLower.includes(queryLower)) {
                score += 2
            }

            return {
                ...entry,
                relevanceScore: score,
            }
        })

        // Sort by relevance score
        scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore)

        return NextResponse.json({
            query: query.q,
            results: scoredResults,
            total: scoredResults.length,
        })
    } catch (error) {
        console.error('Error searching knowledge base:', error)

        if (error instanceof Error && error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Invalid search parameters', details: error.message },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}