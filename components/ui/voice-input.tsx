'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Volume2 } from 'lucide-react'
import { toast } from 'sonner'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  isProcessing: boolean
  className?: string
}

// Define types for speech recognition
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionResult {
  0: SpeechRecognitionAlternative
  isFinal: boolean
  length: number
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult
  length: number
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any)
    | null
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any)
    | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  start(): void
  stop(): void
}

export function VoiceInput({
  onTranscript,
  isProcessing,
  className,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    // Check if speech recognition is supported
    if (typeof window !== 'undefined') {
      try {
        const SpeechRecognition =
          (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition
        setIsSupported(
          !!SpeechRecognition && !!navigator.mediaDevices?.getUserMedia
        )
      } catch (error) {
        console.warn('Speech recognition check failed:', error)
        setIsSupported(false)
      }
    }
  }, [])

  const startListening = async () => {
    if (!isSupported || isProcessing) return

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up audio analysis for visual feedback
      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext
      const audioContext = new AudioContextClass()
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(stream)

      analyser.fftSize = 256
      microphone.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser
      microphoneRef.current = microphone

      // Start audio level monitoring
      const monitorAudioLevel = () => {
        if (!analyserRef.current) return

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)

        // Calculate average audio level
        const average =
          dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
        setAudioLevel(average / 255) // Normalize to 0-1

        animationRef.current = requestAnimationFrame(monitorAudioLevel)
      }
      monitorAudioLevel()

      // Set up speech recognition
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognitionClass() as SpeechRecognition

      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          }
        }

        if (finalTranscript.trim()) {
          onTranscript(finalTranscript.trim())
          stopListening()
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        toast.error('Speech recognition error', {
          description: `Error: ${event.error}`,
        })
        stopListening()
      }

      recognition.onend = () => {
        if (isListening && !isProcessing) {
          // Restart recognition if it stops unexpectedly
          setTimeout(() => {
            if (recognitionRef.current && isListening) {
              recognitionRef.current.start()
            }
          }, 100)
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (error) {
      toast.error('Could not access microphone', {
        description: 'Please check permissions and try again',
      })
    }
  }

  const stopListening = () => {
    setIsListening(false)
    setAudioLevel(0)

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    microphoneRef.current = null
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [])

  // Stop listening when processing starts
  useEffect(() => {
    if (isProcessing && isListening) {
      stopListening()
    }
  }, [isProcessing, isListening])

  if (!isSupported) {
    return (
      <div className={`text-center p-4 text-gray-500 ${className}`}>
        <MicOff className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm mb-3">
          Speech recognition not supported in this browser
        </p>
        <Button
          onClick={() => onTranscript('Hello, this is a demo voice input!')}
          disabled={isProcessing}
          variant="outline"
          size="sm"
        >
          Demo Voice Input
        </Button>
      </div>
    )
  }

  return (
    <div className={`text-center space-y-4 ${className}`}>
      <div className="relative">
        <Button
          onClick={toggleListening}
          disabled={isProcessing}
          size="lg"
          className={`w-16 h-16 rounded-full transition-all duration-200 ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isListening ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </Button>

        {/* Audio level indicator */}
        {isListening && (
          <div
            className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping"
            style={{
              transform: `scale(${1 + audioLevel * 0.5})`,
              opacity: audioLevel * 0.7 + 0.3,
            }}
          />
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          {isListening ? (
            <span className="text-red-600 flex items-center justify-center gap-2">
              <Volume2 className="w-4 h-4" />
              Listening... Speak now
            </span>
          ) : (
            <span className="text-gray-600">Click to start voice input</span>
          )}
        </p>

        {isListening && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full transition-all duration-100"
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
        )}
      </div>

      {isProcessing && (
        <p className="text-xs text-gray-500">
          Voice input disabled during processing
        </p>
      )}
    </div>
  )
}

// Extend Window interface for speech recognition
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor
    webkitSpeechRecognition: SpeechRecognitionConstructor
    AudioContext: typeof AudioContext
    webkitAudioContext: typeof AudioContext
  }
}
