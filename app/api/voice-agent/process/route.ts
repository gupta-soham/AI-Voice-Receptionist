import { NextRequest, NextResponse } from 'next/server';
import { voiceAgent } from '@/lib/voice-agent';

export async function POST(request: NextRequest) {
    try {
        const { message, callerId, action } = await request.json();

        if (!message) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Load fresh knowledge base
        const knowledgeBase = await voiceAgent.loadKnowledgeBase();

        // Load pending help requests for duplicate checking
        await voiceAgent.loadPendingHelpRequests();

        // Process the message with LLM (includes checking for updates)
        const result = await voiceAgent.processWithLLM(message, knowledgeBase, callerId);

        // If we have updates, return them immediately
        if (result.hasUpdates && result.resolvedRequests && result.resolvedRequests.length > 0) {
            return NextResponse.json({
                response: result.response,
                shouldEscalate: false,
                confidence: result.confidence,
                hasUpdates: true,
                resolvedRequests: result.resolvedRequests,
            });
        }

        // Handle different confidence levels
        if (result.confidence >= 0.4 && result.confidence < 0.8 && !result.shouldEscalate) {
            // Medium confidence - ask for clarification
            return NextResponse.json({
                response: result.response,
                shouldEscalate: false,
                confidence: result.confidence,
                needsClarification: true,
                escalated: false,
            });
        }

        // If escalation is needed, create help request
        if (result.shouldEscalate && callerId) {
            // Check for duplicates first
            const duplicateCheck = voiceAgent.checkDuplicateRequest(message, callerId);

            if (duplicateCheck.isDuplicate) {
                return NextResponse.json({
                    response: "I see you've asked a similar question recently, and I've already forwarded it to my supervisor. They'll get back to you shortly with an answer. In the meantime, do you have any other questions I can help you with?",
                    shouldEscalate: false,
                    confidence: 0.8,
                    isDuplicate: true,
                    existingRequestId: duplicateCheck.existingRequest?.id,
                });
            }

            // Create new help request
            const requestId = await voiceAgent.createHelpRequest({
                question: message,
                callerId,
                confidence: result.confidence,
            });

            if (requestId) {
                const escalationMessages = [
                    "Let me check with my supervisor and get back to you with that information. Please hold on for just a moment - I'll have an answer for you shortly. In the meantime, do you have any other questions I can help you with?",
                    "I'm going to connect with my supervisor to get you the most accurate information about that. Please give me just a moment, and I'll get back to you. While I'm checking on that, is there anything else I can assist you with?",
                    "Let me reach out to my supervisor for the details on that question. I'll get back to you very soon with a complete answer. In the meantime, feel free to ask me about anything else I can help you with!"
                ];

                const randomMessage = escalationMessages[Math.floor(Math.random() * escalationMessages.length)];

                return NextResponse.json({
                    response: randomMessage,
                    shouldEscalate: true,
                    confidence: result.confidence,
                    helpRequestId: requestId,
                    escalated: true,
                });
            } else {
                return NextResponse.json({
                    response: "I'm having trouble accessing our system right now. Please try calling back in a few minutes, or you can reach us directly at our main number.",
                    shouldEscalate: false,
                    confidence: 0.3,
                    error: 'Failed to create help request',
                });
            }
        }

        // Return normal response
        return NextResponse.json({
            response: result.response,
            shouldEscalate: result.shouldEscalate,
            confidence: result.confidence,
            escalated: false,
        });

    } catch (error) {
        console.error('Error processing voice agent request:', error);
        return NextResponse.json(
            {
                error: 'Failed to process request',
                response: "I'm having trouble processing your request right now. Please try again in a moment.",
                shouldEscalate: true,
                confidence: 0.0,
            },
            { status: 500 }
        );
    }
}

// Handle audio transcription
export async function PUT(request: NextRequest) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;

        if (!audioFile) {
            return NextResponse.json(
                { error: 'Audio file is required' },
                { status: 400 }
            );
        }

        const audioBlob = new Blob([await audioFile.arrayBuffer()], {
            type: audioFile.type
        });

        const transcript = await voiceAgent.transcribeAudio(audioBlob);

        return NextResponse.json({
            transcript,
            success: true,
        });

    } catch (error) {
        console.error('Error transcribing audio:', error);
        return NextResponse.json(
            { error: 'Failed to transcribe audio' },
            { status: 500 }
        );
    }
}