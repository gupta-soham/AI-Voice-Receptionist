'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VoiceInput } from '@/components/ui/voice-input'
import { toast } from 'sonner'

export default function TestPage() {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<
    Array<{
      type: 'user' | 'agent'
      message: string
      timestamp: Date
    }>
  >([])

  const handleSendMessage = async (inputMessage?: string) => {
    const messageToSend = inputMessage || message
    if (!messageToSend.trim()) return

    setIsProcessing(true)
    const userMessage = messageToSend
    setMessage('')

    // Add user message to history
    const newUserMessage = {
      type: 'user' as const,
      message: userMessage,
      timestamp: new Date(),
    }
    setConversationHistory(prev => [...prev, newUserMessage])

    try {
      // Test the voice agent API
      const response = await fetch('/api/voice-agent/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          callerId: 'test-user',
        }),
      })

      if (response.ok) {
        const result = await response.json()

        // Add agent response to history
        const newAgentMessage = {
          type: 'agent' as const,
          message: result.response,
          timestamp: new Date(),
        }
        setConversationHistory(prev => [...prev, newAgentMessage])

        // Test TTS
        try {
          const ttsResponse = await fetch('/api/voice-agent/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: result.response }),
          })

          if (ttsResponse.ok) {
            const audioBuffer = await ttsResponse.arrayBuffer()
            const audio = new Audio()
            audio.src = URL.createObjectURL(
              new Blob([audioBuffer], { type: 'audio/mpeg' })
            )

            // Play audio with user interaction
            audio
              .play()
              .then(() => {
                toast.success('🔊 TTS audio played successfully')
              })
              .catch(error => {
                toast.error('TTS playback failed', {
                  description: error.message,
                })
              })
          } else if (ttsResponse.status === 503) {
            // Handle quota exceeded gracefully
            const errorData = await ttsResponse.json()
            toast.warning('⚠️ TTS temporarily unavailable', {
              description: errorData.message,
            })
          } else {
            toast.error('TTS API failed', {
              description: `Status: ${ttsResponse.status}`,
            })
          }
        } catch (ttsError) {
          toast.error('TTS error occurred', {
            description:
              ttsError instanceof Error ? ttsError.message : 'Unknown error',
          })
        }

        // Show escalation info
        if (result.escalated) {
          const escalationMessage = {
            type: 'agent' as const,
            message: "📝 I've forwarded your question to my supervisor.",
            timestamp: new Date(),
          }
          setConversationHistory(prev => [...prev, escalationMessage])
          toast.info('Question escalated to supervisor', {
            description: 'Your question has been forwarded for human review',
          })
        }

        setResponse(JSON.stringify(result, null, 2))
        toast.success('Message processed successfully')
      } else {
        const errorMsg = `Error: ${response.status}`
        setResponse(errorMsg)
        toast.error('API request failed', {
          description: `Status: ${response.status}`,
        })
      }
    } catch (error) {
      const errorMsg = `Error: ${error}`
      setResponse(errorMsg)
      toast.error('Request failed', {
        description:
          error instanceof Error ? error.message : 'Unknown error occurred',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const testQuestions = [
    'Hello',
    'What are your business hours?',
    'What services do you offer?',
    'How can I contact you?',
    'Do you have parking?',
    'What are your prices?',
  ]

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Voice Agent Test Interface</h1>
        <p className="text-gray-600">
          Test the voice agent API endpoints directly
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Voice Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Voice Input</CardTitle>
          </CardHeader>
          <CardContent>
            <VoiceInput
              onTranscript={text => handleSendMessage(text)}
              isProcessing={isProcessing}
              className="py-4"
            />
          </CardContent>
        </Card>

        {/* Text Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Text Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={3}
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={!message.trim() || isProcessing}
              className="w-full"
            >
              {isProcessing ? 'Processing...' : 'Send Message'}
            </Button>

            <div className="space-y-2">
              <p className="text-sm font-medium">Quick Test Questions:</p>
              <div className="grid grid-cols-2 gap-2">
                {testQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setMessage(question)}
                    disabled={isProcessing}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Section */}
        <Card>
          <CardHeader>
            <CardTitle>API Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
              {response || 'No response yet...'}
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversation History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {conversationHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
