import cron from 'node-cron'
import { prisma } from './prisma'
import { RequestStatus } from '@prisma/client'

export class BackgroundJobs {
    private jobs: Map<string, cron.ScheduledTask> = new Map()

    start() {
        console.log('🚀 Starting background jobs...')

        // Timeout job - runs every minute
        const timeoutJob = cron.schedule('* * * * *', async () => {
            await this.handleTimeouts()
        }, {
            scheduled: false,
            name: 'timeout-handler'
        })

        // Health monitoring job - runs every 5 minutes
        const healthJob = cron.schedule('*/5 * * * *', async () => {
            await this.performHealthCheck()
        }, {
            scheduled: false,
            name: 'health-monitor'
        })

        // Database cleanup job - runs daily at 2 AM
        const cleanupJob = cron.schedule('0 2 * * *', async () => {
            await this.performDatabaseCleanup()
        }, {
            scheduled: false,
            name: 'database-cleanup'
        })

        this.jobs.set('timeout-handler', timeoutJob)
        this.jobs.set('health-monitor', healthJob)
        this.jobs.set('database-cleanup', cleanupJob)

        // Start all jobs
        this.jobs.forEach((job, name) => {
            job.start()
            console.log(`✅ Started job: ${name}`)
        })

        console.log('🎯 All background jobs started successfully')
    }

    stop() {
        console.log('🛑 Stopping background jobs...')

        this.jobs.forEach((job, name) => {
            job.stop()
            console.log(`⏹️  Stopped job: ${name}`)
        })

        this.jobs.clear()
        console.log('✅ All background jobs stopped')
    }

    private async handleTimeouts() {
        try {
            const timeoutMinutes = parseInt(process.env.REQUEST_TIMEOUT_MINUTES || '5')
            const timeoutThreshold = new Date(Date.now() - timeoutMinutes * 60 * 1000)

            // Find pending requests that have timed out
            const timedOutRequests = await prisma.helpRequest.findMany({
                where: {
                    status: RequestStatus.PENDING,
                    createdAt: {
                        lt: timeoutThreshold,
                    },
                },
            })

            if (timedOutRequests.length > 0) {
                console.log(`⏰ Found ${timedOutRequests.length} timed out requests`)

                // Update all timed out requests
                const updateResult = await prisma.helpRequest.updateMany({
                    where: {
                        id: {
                            in: timedOutRequests.map(req => req.id),
                        },
                    },
                    data: {
                        status: RequestStatus.UNRESOLVED,
                        timeoutAt: new Date(),
                    },
                })

                // Log each timeout
                for (const request of timedOutRequests) {
                    await prisma.systemLog.create({
                        data: {
                            level: 'warn',
                            event: 'HELP_REQUEST_TIMEOUT',
                            message: `Help request automatically timed out after ${timeoutMinutes} minutes`,
                            metadata: {
                                requestId: request.id,
                                callerId: request.callerId,
                                originalCreatedAt: request.createdAt,
                                timeoutDuration: timeoutMinutes * 60 * 1000,
                            },
                        },
                    })
                }

                console.log(`✅ Updated ${updateResult.count} requests to UNRESOLVED status`)
            }
        } catch (error) {
            console.error('❌ Error in timeout handler:', error)

            // Log the error
            await prisma.systemLog.create({
                data: {
                    level: 'error',
                    event: 'JOB_ERROR',
                    message: 'Error in timeout handler job',
                    metadata: {
                        error: error instanceof Error ? error.message : 'Unknown error',
                        jobName: 'timeout-handler',
                    },
                },
            }).catch(logError => {
                console.error('Failed to log timeout handler error:', logError)
            })
        }
    }

    private async performHealthCheck() {
        try {
            console.log('🏥 Performing health check...')

            // Check database connectivity
            await prisma.$queryRaw`SELECT 1`

            // Get system statistics
            const stats = await this.getSystemStats()

            // Log health check
            await prisma.systemLog.create({
                data: {
                    level: 'info',
                    event: 'HEALTH_CHECK',
                    message: 'System health check completed successfully',
                    metadata: stats,
                },
            })

            console.log('✅ Health check completed:', stats)
        } catch (error) {
            console.error('❌ Health check failed:', error)

            await prisma.systemLog.create({
                data: {
                    level: 'error',
                    event: 'HEALTH_CHECK_FAILED',
                    message: 'System health check failed',
                    metadata: {
                        error: error instanceof Error ? error.message : 'Unknown error',
                    },
                },
            }).catch(logError => {
                console.error('Failed to log health check error:', logError)
            })
        }
    }

    private async getSystemStats() {
        const [
            totalRequests,
            pendingRequests,
            resolvedRequests,
            unresolvedRequests,
            totalKnowledgeEntries,
            recentLogs,
        ] = await Promise.all([
            prisma.helpRequest.count(),
            prisma.helpRequest.count({ where: { status: RequestStatus.PENDING } }),
            prisma.helpRequest.count({ where: { status: RequestStatus.RESOLVED } }),
            prisma.helpRequest.count({ where: { status: RequestStatus.UNRESOLVED } }),
            prisma.knowledgeBase.count(),
            prisma.systemLog.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                    },
                },
            }),
        ])

        return {
            requests: {
                total: totalRequests,
                pending: pendingRequests,
                resolved: resolvedRequests,
                unresolved: unresolvedRequests,
            },
            knowledgeBase: {
                totalEntries: totalKnowledgeEntries,
            },
            logs: {
                last24Hours: recentLogs,
            },
            timestamp: new Date().toISOString(),
        }
    }

    private async performDatabaseCleanup() {
        try {
            console.log('🧹 Performing database cleanup...')

            const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || '30')
            const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

            // Clean up old system logs
            const deletedLogs = await prisma.systemLog.deleteMany({
                where: {
                    createdAt: {
                        lt: cutoffDate,
                    },
                    level: {
                        in: ['info'], // Only delete info logs, keep warnings and errors longer
                    },
                },
            })

            // Log cleanup results
            await prisma.systemLog.create({
                data: {
                    level: 'info',
                    event: 'DATABASE_CLEANUP',
                    message: `Database cleanup completed, deleted ${deletedLogs.count} old log entries`,
                    metadata: {
                        deletedLogs: deletedLogs.count,
                        retentionDays,
                        cutoffDate: cutoffDate.toISOString(),
                    },
                },
            })

            console.log(`✅ Database cleanup completed, deleted ${deletedLogs.count} old logs`)
        } catch (error) {
            console.error('❌ Database cleanup failed:', error)

            await prisma.systemLog.create({
                data: {
                    level: 'error',
                    event: 'DATABASE_CLEANUP_FAILED',
                    message: 'Database cleanup job failed',
                    metadata: {
                        error: error instanceof Error ? error.message : 'Unknown error',
                    },
                },
            }).catch(logError => {
                console.error('Failed to log cleanup error:', logError)
            })
        }
    }

    getJobStatus() {
        const status: Record<string, boolean> = {}
        this.jobs.forEach((job, name) => {
            // Check if job is scheduled (node-cron doesn't expose running status directly)
            status[name] = true // Assume scheduled jobs are active
        })
        return status
    }
}

// Singleton instance
let backgroundJobs: BackgroundJobs | null = null

export function getBackgroundJobs(): BackgroundJobs {
    if (!backgroundJobs) {
        backgroundJobs = new BackgroundJobs()
    }
    return backgroundJobs
}

// Auto-start jobs in production
if (process.env.NODE_ENV === 'production') {
    getBackgroundJobs().start()
}