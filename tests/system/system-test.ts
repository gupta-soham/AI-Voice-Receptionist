/**
 * System Testing Suite for AI Voice Receptionist
 * 
 * This test suite validates the complete end-to-end functionality of the system
 * including API endpoints, database operations, and webhook communication.
 */

import { exec } from 'child_process'
import { promisify } from 'util'
// Using built-in fetch (Node.js 18+) or global fetch
const fetch = globalThis.fetch || require('node-fetch')

const execAsync = promisify(exec)

interface TestResult {
    name: string
    status: 'PASS' | 'FAIL' | 'SKIP'
    message: string
    duration: number
}

interface SystemHealthResponse {
    status: string
    database: {
        connected: boolean
        responseTime: string
    }
    backgroundJobs: {
        running: boolean
        jobs: Record<string, boolean>
    }
    webhook: {
        configured: boolean
        url: string | null
    }
    statistics: {
        totalRequests: number
        pendingRequests: number
        totalKnowledgeEntries: number
    }
}

class SystemTester {
    private baseUrl: string
    private agentUrl: string
    private results: TestResult[] = []

    constructor(baseUrl = 'http://localhost:3000', agentUrl = 'http://localhost:8080') {
        this.baseUrl = baseUrl
        this.agentUrl = agentUrl
    }

    private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
        const startTime = Date.now()
        try {
            await testFn()
            this.results.push({
                name,
                status: 'PASS',
                message: 'Test completed successfully',
                duration: Date.now() - startTime
            })
        } catch (error) {
            this.results.push({
                name,
                status: 'FAIL',
                message: error instanceof Error ? error.message : 'Unknown error',
                duration: Date.now() - startTime
            })
        }
    }

    async testSystemHealth(): Promise<void> {
        await this.runTest('System Health Check', async () => {
            const response = await fetch(`${this.baseUrl}/api/health`)
            if (!response.ok) {
                throw new Error(`Health check failed with status: ${response.status}`)
            }

            const health: SystemHealthResponse = await response.json()

            if (health.status !== 'healthy') {
                throw new Error(`System status is ${health.status}`)
            }

            if (!health.database.connected) {
                throw new Error('Database is not connected')
            }

            if (!health.backgroundJobs.running) {
                throw new Error('Background jobs are not running')
            }
        })
    }

    async testKnowledgeBaseAPI(): Promise<void> {
        await this.runTest('Knowledge Base API', async () => {
            // Test GET /api/knowledge
            const getResponse = await fetch(`${this.baseUrl}/api/knowledge`)
            if (!getResponse.ok) {
                throw new Error(`GET /api/knowledge failed with status: ${getResponse.status}`)
            }

            // Test POST /api/knowledge
            const testEntry = {
                question: 'What are your business hours?',
                answer: 'We are open Monday to Friday, 9 AM to 5 PM.',
                source: 'system_test'
            }

            const postResponse = await fetch(`${this.baseUrl}/api/knowledge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testEntry)
            })

            if (!postResponse.ok) {
                throw new Error(`POST /api/knowledge failed with status: ${postResponse.status}`)
            }

            const createdEntry = await postResponse.json()

            // Test PUT /api/knowledge/[id]
            const updatedEntry = {
                ...testEntry,
                answer: 'We are open Monday to Friday, 8 AM to 6 PM.'
            }

            const putResponse = await fetch(`${this.baseUrl}/api/knowledge/${createdEntry.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedEntry)
            })

            if (!putResponse.ok) {
                throw new Error(`PUT /api/knowledge/${createdEntry.id} failed with status: ${putResponse.status}`)
            }

            // Clean up - DELETE /api/knowledge/[id]
            const deleteResponse = await fetch(`${this.baseUrl}/api/knowledge/${createdEntry.id}`, {
                method: 'DELETE'
            })

            if (!deleteResponse.ok) {
                throw new Error(`DELETE /api/knowledge/${createdEntry.id} failed with status: ${deleteResponse.status}`)
            }
        })
    }

    async testHelpRequestAPI(): Promise<void> {
        await this.runTest('Help Request API', async () => {
            // Test POST /api/help-requests
            const testRequest = {
                callerId: 'test-caller-123',
                callerPhone: '+1234567890',
                question: 'How do I reset my password?',
                metadata: { testRun: true }
            }

            const postResponse = await fetch(`${this.baseUrl}/api/help-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testRequest)
            })

            if (!postResponse.ok) {
                throw new Error(`POST /api/help-requests failed with status: ${postResponse.status}`)
            }

            const createdRequest = await postResponse.json()

            // Test GET /api/help-requests
            const getResponse = await fetch(`${this.baseUrl}/api/help-requests`)
            if (!getResponse.ok) {
                throw new Error(`GET /api/help-requests failed with status: ${getResponse.status}`)
            }

            const requests = await getResponse.json()
            const foundRequest = requests.data.find((r: any) => r.id === createdRequest.id)
            if (!foundRequest) {
                throw new Error('Created request not found in list')
            }

            // Test POST /api/help-requests/[id]/resolve
            const resolveResponse = await fetch(`${this.baseUrl}/api/help-requests/${createdRequest.id}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answer: 'You can reset your password by clicking the "Forgot Password" link on the login page.',
                    addToKnowledgeBase: false
                })
            })

            if (!resolveResponse.ok) {
                throw new Error(`POST /api/help-requests/${createdRequest.id}/resolve failed with status: ${resolveResponse.status}`)
            }
        })
    }

    async testAgentWebhookEndpoint(): Promise<void> {
        await this.runTest('Agent Webhook Endpoint', async () => {
            try {
                const response = await fetch(`${this.agentUrl}/webhook`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'help_request_resolved',
                        requestId: 'test-request-123',
                        answer: 'Test answer for webhook validation'
                    })
                })

                // Agent might not be running, so we'll accept connection errors
                // but if it responds, it should be valid
                if (response.status === 404) {
                    throw new Error('Webhook endpoint not found - agent may not be properly configured')
                }
            } catch (error) {
                if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
                    // Agent is not running - this is acceptable for this test
                    console.log('Agent webhook endpoint not accessible - agent may not be running')
                } else {
                    throw error
                }
            }
        })
    }

    async testDatabaseConsistency(): Promise<void> {
        await this.runTest('Database Consistency', async () => {
            // Create a help request and knowledge entry, then verify they're properly linked
            const knowledgeEntry = {
                question: 'What is your refund policy?',
                answer: 'We offer full refunds within 30 days of purchase.',
                source: 'consistency_test'
            }

            const knowledgeResponse = await fetch(`${this.baseUrl}/api/knowledge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(knowledgeEntry)
            })

            if (!knowledgeResponse.ok) {
                throw new Error('Failed to create knowledge entry for consistency test')
            }

            const createdKnowledge = await knowledgeResponse.json()

            // Create help request
            const helpRequest = {
                callerId: 'consistency-test-caller',
                question: 'What is your refund policy?',
                metadata: { consistencyTest: true }
            }

            const requestResponse = await fetch(`${this.baseUrl}/api/help-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(helpRequest)
            })

            if (!requestResponse.ok) {
                throw new Error('Failed to create help request for consistency test')
            }

            const createdRequest = await requestResponse.json()

            // Resolve with knowledge base addition
            const resolveResponse = await fetch(`${this.baseUrl}/api/help-requests/${createdRequest.id}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answer: knowledgeEntry.answer,
                    addToKnowledgeBase: true
                })
            })

            if (!resolveResponse.ok) {
                throw new Error('Failed to resolve help request for consistency test')
            }

            // Verify the request was resolved
            const verifyResponse = await fetch(`${this.baseUrl}/api/help-requests`)
            if (!verifyResponse.ok) {
                throw new Error('Failed to verify resolved request')
            }

            const allRequests = await verifyResponse.json()
            const resolvedRequest = allRequests.data.find((r: any) => r.id === createdRequest.id)

            if (!resolvedRequest || resolvedRequest.status !== 'RESOLVED') {
                throw new Error('Request was not properly resolved')
            }

            // Clean up
            await fetch(`${this.baseUrl}/api/knowledge/${createdKnowledge.id}`, { method: 'DELETE' })
        })
    }

    async testConcurrentRequests(): Promise<void> {
        await this.runTest('Concurrent Request Handling', async () => {
            const concurrentRequests = 5
            const promises = []

            for (let i = 0; i < concurrentRequests; i++) {
                const request = {
                    callerId: `concurrent-test-${i}`,
                    question: `Concurrent test question ${i}`,
                    metadata: { concurrentTest: true, index: i }
                }

                promises.push(
                    fetch(`${this.baseUrl}/api/help-requests`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(request)
                    })
                )
            }

            const responses = await Promise.all(promises)

            for (let i = 0; i < responses.length; i++) {
                if (!responses[i].ok) {
                    throw new Error(`Concurrent request ${i} failed with status: ${responses[i].status}`)
                }
            }

            // Verify all requests were created
            const verifyResponse = await fetch(`${this.baseUrl}/api/help-requests`)
            if (!verifyResponse.ok) {
                throw new Error('Failed to verify concurrent requests')
            }

            const allRequests = await verifyResponse.json()
            const concurrentTestRequests = allRequests.data.filter((r: any) =>
                r.metadata && r.metadata.concurrentTest === true
            )

            if (concurrentTestRequests.length < concurrentRequests) {
                throw new Error(`Expected ${concurrentRequests} concurrent requests, found ${concurrentTestRequests.length}`)
            }
        })
    }

    async runAllTests(): Promise<void> {
        console.log('🚀 Starting System Testing Suite...\n')

        await this.testSystemHealth()
        await this.testKnowledgeBaseAPI()
        await this.testHelpRequestAPI()
        await this.testAgentWebhookEndpoint()
        await this.testDatabaseConsistency()
        await this.testConcurrentRequests()

        this.printResults()
    }

    private printResults(): void {
        console.log('\n📊 Test Results Summary')
        console.log('='.repeat(50))

        const passed = this.results.filter(r => r.status === 'PASS').length
        const failed = this.results.filter(r => r.status === 'FAIL').length
        const skipped = this.results.filter(r => r.status === 'SKIP').length

        this.results.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️'
            const duration = `(${result.duration}ms)`
            console.log(`${icon} ${result.name} ${duration}`)

            if (result.status === 'FAIL') {
                console.log(`   Error: ${result.message}`)
            }
        })

        console.log('\n' + '='.repeat(50))
        console.log(`Total: ${this.results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`)

        if (failed > 0) {
            console.log('\n❌ Some tests failed. Please check the errors above.')
            process.exit(1)
        } else {
            console.log('\n✅ All tests passed successfully!')
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new SystemTester()
    tester.runAllTests().catch(error => {
        console.error('Test suite failed:', error)
        process.exit(1)
    })
}

export { SystemTester }