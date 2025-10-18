import { NextRequest, NextResponse } from 'next/server'
import { getBackgroundJobs } from '@/lib/jobs'

export async function GET() {
    try {
        const backgroundJobs = getBackgroundJobs()
        const jobStatus = backgroundJobs.getJobStatus()

        return NextResponse.json({
            jobs: jobStatus,
            allRunning: Object.values(jobStatus).every(status => status),
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('Error getting job status:', error)

        return NextResponse.json(
            { error: 'Failed to get job status' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { action } = body

        const backgroundJobs = getBackgroundJobs()

        if (action === 'start') {
            backgroundJobs.start()
            return NextResponse.json({ message: 'Background jobs started' })
        } else if (action === 'stop') {
            backgroundJobs.stop()
            return NextResponse.json({ message: 'Background jobs stopped' })
        } else {
            return NextResponse.json(
                { error: 'Invalid action. Use "start" or "stop"' },
                { status: 400 }
            )
        }
    } catch (error) {
        console.error('Error controlling jobs:', error)

        return NextResponse.json(
            { error: 'Failed to control jobs' },
            { status: 500 }
        )
    }
}