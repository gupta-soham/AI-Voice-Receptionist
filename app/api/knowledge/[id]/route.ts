import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateKnowledgeSchema } from '@/lib/validations'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const knowledgeEntry = await prisma.knowledgeBase.findUnique({
            where: { id },
        })

        if (!knowledgeEntry) {
            return NextResponse.json(
                { error: 'Knowledge base entry not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(knowledgeEntry)
    } catch (error) {
        console.error('Error fetching knowledge base entry:', error)

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await request.json()
        const validatedData = updateKnowledgeSchema.parse(body)
        const { id } = await params

        // Check if entry exists
        const existingEntry = await prisma.knowledgeBase.findUnique({
            where: { id },
        })

        if (!existingEntry) {
            return NextResponse.json(
                { error: 'Knowledge base entry not found' },
                { status: 404 }
            )
        }

        const updatedEntry = await prisma.knowledgeBase.update({
            where: { id },
            data: validatedData,
        })

        // Log the update
        await prisma.systemLog.create({
            data: {
                level: 'info',
                event: 'KB_ENTRY_UPDATED',
                message: `Knowledge base entry updated: ${updatedEntry.question.substring(0, 50)}...`,
                metadata: {
                    entryId: id,
                    updatedFields: Object.keys(validatedData),
                },
            },
        })

        return NextResponse.json(updatedEntry)
    } catch (error) {
        console.error('Error updating knowledge base entry:', error)

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

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Check if entry exists
        const existingEntry = await prisma.knowledgeBase.findUnique({
            where: { id },
        })

        if (!existingEntry) {
            return NextResponse.json(
                { error: 'Knowledge base entry not found' },
                { status: 404 }
            )
        }

        await prisma.knowledgeBase.delete({
            where: { id },
        })

        // Log the deletion
        await prisma.systemLog.create({
            data: {
                level: 'info',
                event: 'KB_ENTRY_DELETED',
                message: `Knowledge base entry deleted: ${existingEntry.question.substring(0, 50)}...`,
                metadata: {
                    entryId: id,
                    deletedQuestion: existingEntry.question,
                },
            },
        })

        return NextResponse.json({ message: 'Knowledge base entry deleted successfully' })
    } catch (error) {
        console.error('Error deleting knowledge base entry:', error)

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}