export enum RequestStatus {
    PENDING = 'PENDING',
    RESOLVED = 'RESOLVED',
    UNRESOLVED = 'UNRESOLVED',
}

export interface HelpRequest {
    id: string
    callerId?: string
    callerPhone?: string
    question: string
    status: RequestStatus
    answer?: string
    createdAt: Date
    updatedAt: Date
    timeoutAt?: Date
    resolvedBy?: string
    metadata?: any
}

export interface KnowledgeBase {
    id: string
    question: string
    answer: string
    source?: string
    createdAt: Date
    updatedAt: Date
}

export interface SystemLog {
    id: string
    level: string
    event: string
    message: string
    metadata?: any
    createdAt: Date
}

export interface VoiceAgentConfig {
    livekitUrl: string
    livekitApiKey: string
    livekitApiSecret: string
    nextjsApiUrl: string
    confidenceThreshold: number
    webhookPort: number
}

export interface KnowledgeQuery {
    question: string
    callerId?: string
}

export interface KnowledgeResponse {
    answer?: string
    confidence: number
    source: 'knowledge_base' | 'llm_generated'
}

export interface ErrorRecoveryStrategy {
    maxRetries: number
    backoffMultiplier: number
    fallbackResponse: string
    escalateOnFailure: boolean
}

export interface FeatureFlags {
    enableRealTimeUpdates: boolean
    enableKnowledgeBaseLearning: boolean
    enableAdvancedLogging: boolean
    enableMetricsCollection: boolean
    maxConcurrentCalls: number
    webhookRetryAttempts: number
}