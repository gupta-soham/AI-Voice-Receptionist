import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBackgroundJobs } from '@/lib/jobs'

export async function GET() {
    try {
        const startTime = Date.now()

        // Test database connectivity
        await prisma.$queryRaw`SELECT 1`
        const dbResponseTime = Date.now() - startTime

        // Get background job status
        const backgroundJobs = getBackgroundJobs()
        const jobStatus = backgroundJobs.getJobStatus()

        // Get system statistics
        const [
            totalRequests,
            pendingRequests,
            totalKnowledgeEntries,
        ] = await Promise.all([
            prisma.helpRequest.count(),
            prisma.helpRequest.count({ where: { status: 'PENDING' } }),
            prisma.knowledgeBase.count(),
        ])

        // Check if webhook URL is configured
        const webhookConfigured = !!(process.env.AGENT_WEBHOOK_URL && process.env.WEBHOOK_SECRET)

        const healthData = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            uptime: process.uptime(),
            database: {
                connected: true,
                responseTime: `${dbResponseTime}ms`,
            },
            backgroundJobs: {
                running: Object.values(jobStatus).every(status => status),
                jobs: jobStatus,
            },
            webhook: {
                configured: webhookConfigured,
                url: webhookConfigured ? process.env.AGENT_WEBHOOK_URL : null,
            },
            statistics: {
                totalRequests,
                pendingRequests,
                totalKnowledgeEntries,
            },
            environment: {
                nodeEnv: process.env.NODE_ENV,
                aiProvider: process.env.AI_PROVIDER || 'openai',
                confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.7'),
                requestTimeoutMinutes: parseInt(process.env.REQUEST_TIMEOUT_MINUTES || '5'),
            },
        }

        return NextResponse.json(healthData)
    } catch (error) {
        console.error('Health check failed:', error)

        const errorData = {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
            database: {
                connected: false,
            },
        }

        return NextResponse.json(errorData, { status: 503 })
    }
}