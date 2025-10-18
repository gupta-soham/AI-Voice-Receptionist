import crypto from 'crypto'

export interface WebhookPayload {
    requestId: string
    answer: string
    callerId?: string
    callerPhone?: string
    resolvedBy: string
    timestamp: string
}

export class WebhookSender {
    private readonly webhookUrl: string
    private readonly secret: string
    private readonly maxRetries: number
    private readonly baseDelay: number

    constructor(
        webhookUrl: string,
        secret: string,
        maxRetries: number = 3,
        baseDelay: number = 1000
    ) {
        this.webhookUrl = webhookUrl
        this.secret = secret
        this.maxRetries = maxRetries
        this.baseDelay = baseDelay
    }

    private generateSignature(payload: string): string {
        return crypto
            .createHmac('sha256', this.secret)
            .update(payload)
            .digest('hex')
    }

    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    async sendWebhook(payload: WebhookPayload): Promise<boolean> {
        const payloadString = JSON.stringify(payload)
        const signature = this.generateSignature(payloadString)

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`Sending webhook (attempt ${attempt}/${this.maxRetries}) to ${this.webhookUrl}`)

                const response = await fetch(this.webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Webhook-Signature': `sha256=${signature}`,
                        'X-Webhook-Timestamp': payload.timestamp,
                        'User-Agent': 'AI-Voice-Receptionist-Webhook/1.0',
                    },
                    body: payloadString,
                    signal: AbortSignal.timeout(10000), // 10 second timeout
                })

                if (response.ok) {
                    console.log(`Webhook sent successfully to ${this.webhookUrl}`)
                    return true
                } else {
                    console.warn(`Webhook failed with status ${response.status}: ${response.statusText}`)

                    // Don't retry for client errors (4xx)
                    if (response.status >= 400 && response.status < 500) {
                        console.error(`Client error, not retrying: ${response.status}`)
                        return false
                    }
                }
            } catch (error) {
                console.error(`Webhook attempt ${attempt} failed:`, error)

                // Don't retry for certain errors
                if (error instanceof TypeError && error.message.includes('fetch')) {
                    console.error('Network error, not retrying')
                    return false
                }
            }

            // Wait before retrying (exponential backoff)
            if (attempt < this.maxRetries) {
                const delayMs = this.baseDelay * Math.pow(2, attempt - 1)
                console.log(`Waiting ${delayMs}ms before retry...`)
                await this.delay(delayMs)
            }
        }

        console.error(`All webhook attempts failed for ${this.webhookUrl}`)
        return false
    }
}

export function createWebhookSender(): WebhookSender | null {
    const webhookUrl = process.env.AGENT_WEBHOOK_URL
    const webhookSecret = process.env.WEBHOOK_SECRET

    if (!webhookUrl || !webhookSecret) {
        console.warn('Webhook URL or secret not configured, webhooks disabled')
        return null
    }

    return new WebhookSender(webhookUrl, webhookSecret)
}