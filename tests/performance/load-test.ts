/**
 * Performance and Load Testing Suite
 * 
 * Tests system performance under various load conditions
 */

// Using built-in fetch (Node.js 18+) or global fetch
const fetch = globalThis.fetch || require('node-fetch')

interface PerformanceMetrics {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    averageResponseTime: number
    minResponseTime: number
    maxResponseTime: number
    requestsPerSecond: number
    testDuration: number
}

interface LoadTestConfig {
    baseUrl: string
    concurrentUsers: number
    requestsPerUser: number
    rampUpTime: number // seconds
    testDuration: number // seconds
}

class LoadTester {
    private config: LoadTestConfig
    private metrics: PerformanceMetrics

    constructor(config: LoadTestConfig) {
        this.config = config
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            minResponseTime: Infinity,
            maxResponseTime: 0,
            requestsPerSecond: 0,
            testDuration: 0
        }
    }

    private async makeRequest(endpoint: string, method: string = 'GET', body?: any): Promise<number> {
        const startTime = Date.now()

        try {
            const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
                method,
                headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : {},
                body: body ? JSON.stringify(body) : undefined
            })

            const responseTime = Date.now() - startTime

            if (response.ok) {
                this.metrics.successfulRequests++
            } else {
                this.metrics.failedRequests++
            }

            return responseTime
        } catch (error) {
            this.metrics.failedRequests++
            return Date.now() - startTime
        }
    }

    private updateMetrics(responseTime: number): void {
        this.metrics.totalRequests++
        this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime)
        this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime)
    }

    async testHealthEndpointLoad(): Promise<void> {
        console.log('🔥 Testing Health Endpoint Load...')

        const startTime = Date.now()
        const responseTimes: number[] = []
        const promises: Promise<void>[] = []

        for (let user = 0; user < this.config.concurrentUsers; user++) {
            const userPromise = (async () => {
                // Ramp up delay
                await new Promise(resolve => setTimeout(resolve, (user * this.config.rampUpTime * 1000) / this.config.concurrentUsers))

                for (let req = 0; req < this.config.requestsPerUser; req++) {
                    const responseTime = await this.makeRequest('/api/health')
                    responseTimes.push(responseTime)
                    this.updateMetrics(responseTime)

                    // Small delay between requests from same user
                    await new Promise(resolve => setTimeout(resolve, 100))
                }
            })()

            promises.push(userPromise)
        }

        await Promise.all(promises)

        const testDuration = (Date.now() - startTime) / 1000
        this.metrics.testDuration = testDuration
        this.metrics.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        this.metrics.requestsPerSecond = this.metrics.totalRequests / testDuration

        console.log(`✅ Health endpoint load test completed in ${testDuration.toFixed(2)}s`)
    }

    async testKnowledgeBaseLoad(): Promise<void> {
        console.log('📚 Testing Knowledge Base Load...')

        const startTime = Date.now()
        const responseTimes: number[] = []
        const promises: Promise<void>[] = []

        // First, create some test data
        const testEntries = []
        for (let i = 0; i < 10; i++) {
            const entry = {
                question: `Load test question ${i}`,
                answer: `Load test answer ${i}`,
                source: 'load_test'
            }

            const responseTime = await this.makeRequest('/api/knowledge', 'POST', entry)
            responseTimes.push(responseTime)
            this.updateMetrics(responseTime)

            const response = await fetch(`${this.config.baseUrl}/api/knowledge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry)
            })

            if (response.ok) {
                const created = await response.json()
                testEntries.push(created)
            }
        }

        // Now test concurrent reads
        for (let user = 0; user < this.config.concurrentUsers; user++) {
            const userPromise = (async () => {
                await new Promise(resolve => setTimeout(resolve, (user * this.config.rampUpTime * 1000) / this.config.concurrentUsers))

                for (let req = 0; req < this.config.requestsPerUser; req++) {
                    const responseTime = await this.makeRequest('/api/knowledge?search=load test')
                    responseTimes.push(responseTime)
                    this.updateMetrics(responseTime)

                    await new Promise(resolve => setTimeout(resolve, 50))
                }
            })()

            promises.push(userPromise)
        }

        await Promise.all(promises)

        // Clean up test data
        for (const entry of testEntries) {
            await this.makeRequest(`/api/knowledge/${entry.id}`, 'DELETE')
        }

        const testDuration = (Date.now() - startTime) / 1000
        this.metrics.testDuration += testDuration
        this.metrics.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        this.metrics.requestsPerSecond = this.metrics.totalRequests / this.metrics.testDuration

        console.log(`✅ Knowledge base load test completed in ${testDuration.toFixed(2)}s`)
    }

    async testHelpRequestLoad(): Promise<void> {
        console.log('🆘 Testing Help Request Load...')

        const startTime = Date.now()
        const responseTimes: number[] = []
        const promises: Promise<void>[] = []
        const createdRequests: any[] = []

        for (let user = 0; user < this.config.concurrentUsers; user++) {
            const userPromise = (async () => {
                await new Promise(resolve => setTimeout(resolve, (user * this.config.rampUpTime * 1000) / this.config.concurrentUsers))

                for (let req = 0; req < this.config.requestsPerUser; req++) {
                    const request = {
                        callerId: `load-test-user-${user}-req-${req}`,
                        question: `Load test question from user ${user}, request ${req}`,
                        metadata: { loadTest: true, user, request: req }
                    }

                    const responseTime = await this.makeRequest('/api/help-requests', 'POST', request)
                    responseTimes.push(responseTime)
                    this.updateMetrics(responseTime)

                    // Store created request for cleanup
                    try {
                        const response = await fetch(`${this.config.baseUrl}/api/help-requests`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(request)
                        })

                        if (response.ok) {
                            const created = await response.json()
                            createdRequests.push(created)
                        }
                    } catch (error) {
                        // Ignore cleanup errors
                    }

                    await new Promise(resolve => setTimeout(resolve, 200))
                }
            })()

            promises.push(userPromise)
        }

        await Promise.all(promises)

        // Test concurrent resolution
        console.log('🔧 Testing concurrent request resolution...')
        const resolutionPromises = createdRequests.slice(0, Math.min(10, createdRequests.length)).map(async (request) => {
            const responseTime = await this.makeRequest(`/api/help-requests/${request.id}/resolve`, 'POST', {
                answer: 'Load test resolution answer',
                addToKnowledgeBase: false
            })
            responseTimes.push(responseTime)
            this.updateMetrics(responseTime)
        })

        await Promise.all(resolutionPromises)

        const testDuration = (Date.now() - startTime) / 1000
        this.metrics.testDuration += testDuration
        this.metrics.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        this.metrics.requestsPerSecond = this.metrics.totalRequests / this.metrics.testDuration

        console.log(`✅ Help request load test completed in ${testDuration.toFixed(2)}s`)
    }

    async runLoadTests(): Promise<void> {
        console.log('🚀 Starting Performance Load Tests...')
        console.log(`Configuration: ${this.config.concurrentUsers} users, ${this.config.requestsPerUser} requests/user`)
        console.log(`Ramp-up time: ${this.config.rampUpTime}s\n`)

        // Reset metrics
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            minResponseTime: Infinity,
            maxResponseTime: 0,
            requestsPerSecond: 0,
            testDuration: 0
        }

        await this.testHealthEndpointLoad()
        await this.testKnowledgeBaseLoad()
        await this.testHelpRequestLoad()

        this.printResults()
    }

    private printResults(): void {
        console.log('\n📊 Performance Test Results')
        console.log('='.repeat(50))
        console.log(`Total Requests: ${this.metrics.totalRequests}`)
        console.log(`Successful: ${this.metrics.successfulRequests} (${((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2)}%)`)
        console.log(`Failed: ${this.metrics.failedRequests} (${((this.metrics.failedRequests / this.metrics.totalRequests) * 100).toFixed(2)}%)`)
        console.log(`Average Response Time: ${this.metrics.averageResponseTime.toFixed(2)}ms`)
        console.log(`Min Response Time: ${this.metrics.minResponseTime === Infinity ? 'N/A' : this.metrics.minResponseTime.toFixed(2) + 'ms'}`)
        console.log(`Max Response Time: ${this.metrics.maxResponseTime.toFixed(2)}ms`)
        console.log(`Requests/Second: ${this.metrics.requestsPerSecond.toFixed(2)}`)
        console.log(`Total Test Duration: ${this.metrics.testDuration.toFixed(2)}s`)
        console.log('='.repeat(50))

        // Performance thresholds
        const avgResponseThreshold = 1000 // 1 second
        const successRateThreshold = 95 // 95%
        const rpsThreshold = 10 // 10 requests per second

        const successRate = (this.metrics.successfulRequests / this.metrics.totalRequests) * 100

        console.log('\n🎯 Performance Analysis:')

        if (this.metrics.averageResponseTime <= avgResponseThreshold) {
            console.log(`✅ Average response time (${this.metrics.averageResponseTime.toFixed(2)}ms) is within acceptable range`)
        } else {
            console.log(`❌ Average response time (${this.metrics.averageResponseTime.toFixed(2)}ms) exceeds threshold (${avgResponseThreshold}ms)`)
        }

        if (successRate >= successRateThreshold) {
            console.log(`✅ Success rate (${successRate.toFixed(2)}%) meets requirements`)
        } else {
            console.log(`❌ Success rate (${successRate.toFixed(2)}%) below threshold (${successRateThreshold}%)`)
        }

        if (this.metrics.requestsPerSecond >= rpsThreshold) {
            console.log(`✅ Throughput (${this.metrics.requestsPerSecond.toFixed(2)} RPS) meets requirements`)
        } else {
            console.log(`⚠️  Throughput (${this.metrics.requestsPerSecond.toFixed(2)} RPS) below optimal threshold (${rpsThreshold} RPS)`)
        }
    }
}

// Run load tests if this file is executed directly
if (require.main === module) {
    const config: LoadTestConfig = {
        baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
        concurrentUsers: parseInt(process.env.CONCURRENT_USERS || '5'),
        requestsPerUser: parseInt(process.env.REQUESTS_PER_USER || '10'),
        rampUpTime: parseInt(process.env.RAMP_UP_TIME || '5'),
        testDuration: parseInt(process.env.TEST_DURATION || '30')
    }

    const tester = new LoadTester(config)
    tester.runLoadTests().catch(error => {
        console.error('Load test failed:', error)
        process.exit(1)
    })
}

export { LoadTester }
export type { LoadTestConfig, PerformanceMetrics }