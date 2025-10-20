import { NextRequest, NextResponse } from 'next/server';
import { voiceAgent } from '@/lib/voice-agent';

export async function POST(request: NextRequest) {
    try {
        const { text } = await request.json();

        if (!text) {
            return NextResponse.json(
                { error: 'Text is required' },
                { status: 400 }
            );
        }

        // Generate speech using ElevenLabs
        const audioBuffer = await voiceAgent.synthesizeSpeech(text);

        // Handle empty buffer (quota exceeded case)
        if (audioBuffer.length === 0) {
            return NextResponse.json(
                {
                    error: 'TTS quota exceeded',
                    message: 'Audio synthesis temporarily unavailable',
                    fallback: true
                },
                { status: 503 }
            );
        }

        // Return audio as response
        return new NextResponse(new Uint8Array(audioBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.length.toString(),
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error) {
        console.error('Error in TTS API:', error);
        return NextResponse.json(
            { error: 'Failed to synthesize speech' },
            { status: 500 }
        );
    }
}