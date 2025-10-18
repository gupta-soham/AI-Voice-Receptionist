import { z } from 'zod'
import { RequestStatus } from '@prisma/client'

export const createHelpRequestSchema = z.object({
    callerId: z.string().optional(),
    callerPhone: z.string().optional(),
    question: z.string().min(1, 'Question is required'),
    metadata: z.record(z.any()).optional(),
})

export const resolveHelpRequestSchema = z.object({
    answer: z.string().min(1, 'Answer is required'),
    resolvedBy: z.string().min(1, 'Resolver ID is required'),
    learn: z.boolean().default(false),
})

export const helpRequestQuerySchema = z.object({
    status: z.nativeEnum(RequestStatus).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    search: z.string().optional(),
})

export const createKnowledgeSchema = z.object({
    question: z.string().min(1, 'Question is required'),
    answer: z.string().min(1, 'Answer is required'),
    source: z.string().optional(),
})

export const updateKnowledgeSchema = z.object({
    question: z.string().min(1, 'Question is required').optional(),
    answer: z.string().min(1, 'Answer is required').optional(),
    source: z.string().optional(),
})

export const knowledgeQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    search: z.string().optional(),
})

export type CreateHelpRequestInput = z.infer<typeof createHelpRequestSchema>
export type ResolveHelpRequestInput = z.infer<typeof resolveHelpRequestSchema>
export type HelpRequestQuery = z.infer<typeof helpRequestQuerySchema>
export type CreateKnowledgeInput = z.infer<typeof createKnowledgeSchema>
export type UpdateKnowledgeInput = z.infer<typeof updateKnowledgeSchema>
export type KnowledgeQuery = z.infer<typeof knowledgeQuerySchema>