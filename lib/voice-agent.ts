import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@deepgram/sdk';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { prisma } from '@/lib/prisma';

// Initialize AI services
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);
const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVEN_API_KEY!,
});

export interface VoiceAgentConfig {
    confidenceThreshold: number;
    agentName: string;
}

export interface KnowledgeQuery {
    question: string;
    callerId?: string;
}

export interface KnowledgeResponse {
    answer?: string;
    confidence: number;
    source: 'knowledge_base' | 'llm_generated' | 'none';
    questionMatched?: string;
}

export interface HelpRequestData {
    question: string;
    callerId?: string;
    callerPhone?: string;
    confidence: number;
}

export class VoiceReceptionistAgent {
    private config: VoiceAgentConfig;
    private knowledgeBaseContent: string = '';
    private lastKnowledgeUpdate: number = 0;
    private knowledgeRefreshInterval: number = 60000; // 1 minute
    private pendingHelpRequests: any[] = [];
    private lastHelpRequestsUpdate: number = 0;
    private helpRequestsRefreshInterval: number = 45000; // 45 seconds
    private activeHelpRequests: Map<string, string[]> = new Map(); // callerId -> helpRequestIds
    private lastUpdateCheck: number = 0;
    private updateCheckInterval: number = 30000; // 30 seconds

    constructor(config?: Partial<VoiceAgentConfig>) {
        this.config = {
            confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.7'),
            agentName: process.env.AGENT_NAME || 'AI Voice Receptionist',
            ...config,
        };
    }

    async loadKnowledgeBase(forceRefresh: boolean = false): Promise<string> {
        const currentTime = Date.now();

        if (forceRefresh ||
            !this.knowledgeBaseContent ||
            currentTime - this.lastKnowledgeUpdate > this.knowledgeRefreshInterval) {

            try {
                const knowledgeEntries = await prisma.knowledgeBase.findMany({
                    orderBy: { createdAt: 'desc' },
                    take: 100,
                });

                if (knowledgeEntries.length === 0) {
                    this.knowledgeBaseContent = 'KNOWLEDGE BASE: Empty';
                } else {
                    let knowledgeText = 'KNOWLEDGE BASE:\n\n';
                    for (const entry of knowledgeEntries) {
                        knowledgeText += `Q: ${entry.question}\n`;
                        knowledgeText += `A: ${entry.answer}\n\n`;
                    }
                    this.knowledgeBaseContent = knowledgeText;
                }

                this.lastKnowledgeUpdate = currentTime;
                console.log(`📚 ${forceRefresh ? 'Refreshed' : 'Loaded'} ${knowledgeEntries.length} knowledge base entries`);

                return this.knowledgeBaseContent;

                // } else {
                //     console.error('Knowledge base API returned status:', response.status);
                //     return this.knowledgeBaseContent || 'KNOWLEDGE BASE: API Error';
                // }
            } catch (error) {
                console.error('Error loading knowledge base:', error);
                return this.knowledgeBaseContent || 'KNOWLEDGE BASE: Error loading';
            }
        }

        return this.knowledgeBaseContent;
    }

    async loadPendingHelpRequests(forceRefresh: boolean = false): Promise<any[]> {
        const currentTime = Date.now();

        if (forceRefresh ||
            !this.pendingHelpRequests.length ||
            currentTime - this.lastHelpRequestsUpdate > this.helpRequestsRefreshInterval) {

            try {
                const requests = await prisma.helpRequest.findMany({
                    where: { status: 'PENDING' },
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                });

                this.pendingHelpRequests = requests;
                this.lastHelpRequestsUpdate = currentTime;
                console.log(`📋 Loaded ${requests.length} pending help requests`);

                return requests;
            } catch (error) {
                console.error('Error loading pending help requests:', error);
                return this.pendingHelpRequests;
            }
        }

        return this.pendingHelpRequests;
    }

    checkDuplicateRequest(question: string, callerId: string): {
        isDuplicate: boolean;
        existingRequest?: any;
        similarityScore?: number;
    } {
        const questionLower = question.toLowerCase();
        const questionWords = new Set(questionLower.split(' '));

        for (const request of this.pendingHelpRequests) {
            const existingQuestion = request.question?.toLowerCase() || '';
            const existingCaller = request.callerId || '';
            const existingWords = new Set(existingQuestion.split(' '));

            // Check for same caller with similar question
            if (existingCaller === callerId) {
                const commonWords = new Set([...questionWords].filter(x => existingWords.has(x)));
                if (commonWords.size >= 2) {
                    const similarity = commonWords.size / new Set([...questionWords, ...existingWords]).size;
                    return {
                        isDuplicate: true,
                        existingRequest: request,
                        similarityScore: similarity,
                    };
                }
            }

            // Check for very similar questions from any caller
            const commonWords = new Set([...questionWords].filter(x => existingWords.has(x)));
            const similarity = commonWords.size / new Set([...questionWords, ...existingWords]).size;
            if (similarity > 0.7) {
                return {
                    isDuplicate: true,
                    existingRequest: request,
                    similarityScore: similarity,
                };
            }
        }

        return { isDuplicate: false };
    }

    async createHelpRequest(data: HelpRequestData): Promise<string | null> {
        try {
            const helpRequest = await prisma.helpRequest.create({
                data: {
                    question: data.question,
                    callerId: data.callerId,
                    callerPhone: data.callerPhone,
                    status: 'PENDING',
                    metadata: {
                        agent: this.config.agentName,
                        escalatedAt: Date.now(),
                        confidence: data.confidence,
                    },
                },
            });

            // Track this help request for the caller
            if (data.callerId) {
                const existingRequests = this.activeHelpRequests.get(data.callerId) || [];
                existingRequests.push(helpRequest.id);
                this.activeHelpRequests.set(data.callerId, existingRequests);
            }

            console.log(`📝 Created help request ${helpRequest.id} for caller ${data.callerId}`);
            return helpRequest.id;
        } catch (error) {
            console.error('Error creating help request:', error);
            return null;
        }
    }

    async checkForUpdates(callerId: string): Promise<{
        hasUpdates: boolean;
        resolvedRequests: any[];
    }> {
        const currentTime = Date.now();

        // Only check for updates every 30 seconds to avoid excessive API calls
        if (currentTime - this.lastUpdateCheck < this.updateCheckInterval) {
            return { hasUpdates: false, resolvedRequests: [] };
        }

        const helpRequestIds = this.activeHelpRequests.get(callerId) || [];
        if (helpRequestIds.length === 0) {
            return { hasUpdates: false, resolvedRequests: [] };
        }

        try {
            const response = await fetch('/api/voice-agent/check-updates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ helpRequestIds, callerId }),
            });

            if (!response.ok) {
                console.error('Failed to check for updates');
                return { hasUpdates: false, resolvedRequests: [] };
            }

            const result = await response.json();
            this.lastUpdateCheck = currentTime;

            // Remove resolved requests from active tracking
            if (result.resolvedRequests.length > 0) {
                const resolvedIds = result.resolvedRequests.map((r: any) => r.id);
                const remainingRequests = helpRequestIds.filter(id => !resolvedIds.includes(id));

                if (remainingRequests.length === 0) {
                    this.activeHelpRequests.delete(callerId);
                } else {
                    this.activeHelpRequests.set(callerId, remainingRequests);
                }

                console.log(`🔄 Found ${result.resolvedRequests.length} resolved requests for caller ${callerId}`);
            }

            return result;
        } catch (error) {
            console.error('Error checking for updates:', error);
            return { hasUpdates: false, resolvedRequests: [] };
        }
    }

    private fuzzyMatchKnowledge(message: string, knowledgeBase: string): {
        match: boolean;
        confidence: number;
        answer?: string;
        question?: string;
    } {
        const messageLower = message.toLowerCase();
        const lines = knowledgeBase.split('\n');

        // Common question patterns
        const patterns = [
            { keywords: ['hours', 'open', 'close', 'when', 'timings', 'timing', 'time'], question: 'business hours' },
            { keywords: ['price', 'cost', 'how much'], question: 'prices' },
            { keywords: ['services', 'offer', 'do you do'], question: 'services' },
            { keywords: ['appointment', 'book', 'schedule'], question: 'appointment' },
            { keywords: ['location', 'where', 'address'], question: 'location' },
            { keywords: ['parking', 'park'], question: 'parking' },
            { keywords: ['cancel', 'cancellation'], question: 'cancellation' },
            { keywords: ['payment', 'pay', 'accept'], question: 'payment' },
        ];

        for (const pattern of patterns) {
            const matchCount = pattern.keywords.filter(keyword =>
                messageLower.includes(keyword)
            ).length;

            if (matchCount > 0) {

                // Parse all Q&A pairs first
                const qaPairs: { question: string; answer: string }[] = [];
                let currentQuestion = '';
                let currentAnswer = '';
                let inAnswer = false;

                for (const line of lines) {
                    if (line.startsWith('Q: ')) {
                        // Save previous pair if exists
                        if (currentQuestion && currentAnswer) {
                            qaPairs.push({ question: currentQuestion.toLowerCase(), answer: currentAnswer });
                        }
                        currentQuestion = line.substring(3);
                        currentAnswer = '';
                        inAnswer = false;
                    } else if (line.startsWith('A: ')) {
                        currentAnswer = line.substring(3);
                        inAnswer = true;
                    } else if (inAnswer && line.trim()) {
                        currentAnswer += ' ' + line.trim();
                    }
                }

                // Save last pair
                if (currentQuestion && currentAnswer) {
                    qaPairs.push({ question: currentQuestion.toLowerCase(), answer: currentAnswer });
                }

                // Now find the best match
                for (const pair of qaPairs) {
                    if (pair.question.includes(pattern.question) ||
                        pattern.keywords.some(keyword => pair.question.includes(keyword))) {
                        return {
                            match: true,
                            confidence: Math.min(0.9, 0.6 + (matchCount * 0.1)),
                            answer: pair.answer,
                            question: pair.question
                        };
                    }
                }
            }
        }

        return { match: false, confidence: 0 };
    }

    async processWithLLM(
        message: string,
        knowledgeBase: string,
        callerId?: string
    ): Promise<{
        response: string;
        shouldEscalate: boolean;
        confidence: number;
        hasUpdates?: boolean;
        resolvedRequests?: any[];
    }> {
        try {
            // Check for updates on help requests if we have a caller ID
            let updateInfo: { hasUpdates: boolean; resolvedRequests: any[] } = { hasUpdates: false, resolvedRequests: [] };
            if (callerId) {
                updateInfo = await this.checkForUpdates(callerId);

                // If we have resolved requests, provide them to the caller
                if (updateInfo.hasUpdates && updateInfo.resolvedRequests.length > 0) {
                    const resolvedRequest = updateInfo.resolvedRequests[0]; // Get the first resolved request
                    return {
                        response: `Great news! I have an answer to your earlier question: "${resolvedRequest.question}"\n\n${resolvedRequest.answer}\n\nIs there anything else I can help you with today?`,
                        shouldEscalate: false,
                        confidence: 0.9,
                        hasUpdates: true,
                        resolvedRequests: updateInfo.resolvedRequests,
                    };
                }
            }

            // Try fuzzy matching first for common questions
            const fuzzyMatch = this.fuzzyMatchKnowledge(message, knowledgeBase);
            if (fuzzyMatch.match && fuzzyMatch.answer) {
                console.log('✅ Fuzzy match found:', fuzzyMatch.question);
                return {
                    response: fuzzyMatch.answer,
                    shouldEscalate: false,
                    confidence: fuzzyMatch.confidence,
                    hasUpdates: updateInfo.hasUpdates,
                    resolvedRequests: updateInfo.resolvedRequests,
                };
            }

            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

            console.log('📚 Knowledge Base Content Length:', knowledgeBase.length);
            console.log('📚 Knowledge Base Preview:', knowledgeBase.substring(0, 500) + '...');

            const prompt = `You are ${this.config.agentName}, a helpful and professional AI voice receptionist.

${knowledgeBase}

INSTRUCTIONS:
1. For greetings (hello, hi, good morning, etc.) - respond warmly and ask how you can help (confidence: 0.9, shouldEscalate: false)

2. For questions about our services - CAREFULLY check the KNOWLEDGE BASE above:
   - Look for EXACT or VERY SIMILAR questions
   - Match key concepts even if wording differs
   - Example: "hours", "open", "when are you open" should match "business hours"

3. CONFIDENCE LEVELS:
   - HIGH (0.8-0.9): Found exact or very close match in knowledge base → provide answer, shouldEscalate: false
   - MEDIUM (0.4-0.7): Question is unclear or ambiguous → ask for clarification, shouldEscalate: false
   - LOW (0.1-0.3): Cannot find answer in knowledge base → escalate to supervisor, shouldEscalate: true

4. For MEDIUM confidence, ask the user to rephrase:
   "I want to make sure I give you the right information. Could you rephrase your question or provide more details about what you're looking for?"

5. Keep responses conversational and professional
6. Do NOT make up information not in the knowledge base
7. ALWAYS check the knowledge base thoroughly before deciding confidence

User message: "${message}"

Respond with ONLY a valid JSON object:
{
  "response": "your response to the user",
  "confidence": 0.0-1.0,
  "shouldEscalate": true/false,
  "reasoning": "brief explanation of your decision"
}`;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            try {
                console.log('🤖 Raw LLM Response:', responseText);

                // Try to extract JSON from the response if it's wrapped in markdown
                let jsonText = responseText;
                if (responseText.includes('```json')) {
                    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
                    if (jsonMatch) {
                        jsonText = jsonMatch[1];
                    }
                } else if (responseText.includes('```')) {
                    const jsonMatch = responseText.match(/```\s*([\s\S]*?)\s*```/);
                    if (jsonMatch) {
                        jsonText = jsonMatch[1];
                    }
                }

                const parsed = JSON.parse(jsonText);
                console.log('✅ Parsed LLM Response:', parsed);

                return {
                    response: parsed.response || "I'm here to help you. How can I assist you today?",
                    shouldEscalate: parsed.shouldEscalate || parsed.confidence < this.config.confidenceThreshold,
                    confidence: parsed.confidence || 0.5,
                    hasUpdates: updateInfo.hasUpdates,
                    resolvedRequests: updateInfo.resolvedRequests,
                };
            } catch (parseError) {
                // Fallback if JSON parsing fails
                console.warn('❌ Failed to parse LLM response as JSON:', responseText);
                console.warn('Parse error:', parseError);
                return {
                    response: responseText || "I'm here to help you. How can I assist you today?",
                    shouldEscalate: true,
                    confidence: 0.3,
                    hasUpdates: updateInfo.hasUpdates,
                    resolvedRequests: updateInfo.resolvedRequests,
                };
            }
        } catch (error) {
            console.error('Error processing with LLM:', error);
            return {
                response: "I'm having trouble processing your request right now. Let me connect you with a supervisor.",
                shouldEscalate: true,
                confidence: 0.0,
            };
        }
    }

    async transcribeAudio(audioBlob: Blob): Promise<string> {
        try {
            const arrayBuffer = await audioBlob.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const { result } = await deepgram.listen.prerecorded.transcribeFile(
                buffer,
                {
                    model: 'nova-2',
                    language: 'en-US',
                    smart_format: true,
                    punctuate: true,
                }
            );

            const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
            return transcript || '';
        } catch (error) {
            console.error('Error transcribing audio:', error);
            throw new Error('Failed to transcribe audio');
        }
    }

    async synthesizeSpeech(text: string): Promise<Buffer> {
        try {
            console.log('🔊 Synthesizing speech for:', text);

            const audioStream = await elevenlabs.textToSpeech.stream('JBFqnCBsd6RMkjVDRZzb', {
                text,
                modelId: 'eleven_flash_v2_5',
                outputFormat: 'mp3_44100_128',
            });

            // Convert stream to buffer
            const chunks: Uint8Array[] = [];
            const reader = audioStream.getReader();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }
            } finally {
                reader.releaseLock();
            }

            // Combine all chunks into a single buffer
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;

            for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }

            console.log('✅ TTS synthesis complete, audio size:', result.length, 'bytes');
            return Buffer.from(result);
        } catch (error) {
            console.error('❌ Error synthesizing speech:', error);

            // Check if it's a quota exceeded error
            if (error instanceof Error && error.message.includes('quota_exceeded')) {
                console.warn('⚠️ ElevenLabs quota exceeded, returning empty audio buffer');
                // Return a minimal empty audio buffer to prevent breaking the flow
                return Buffer.alloc(0);
            }

            throw new Error('Failed to synthesize speech');
        }
    }
}

// Export singleton instance
export const voiceAgent = new VoiceReceptionistAgent();