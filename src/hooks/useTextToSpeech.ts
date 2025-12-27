import { useCallback, useEffect, useRef, useState } from 'react'

// How long to wait before considering stream "paused" (ms)
const STREAM_PAUSE_THRESHOLD = 250

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const pendingTextRef = useRef<string>('')
  const isProcessingRef = useRef(false)
  // Track when last token was received to detect stream pauses
  const lastTokenTimeRef = useRef<number>(0)
  const streamActiveRef = useRef<boolean>(false)
  // Track if we're in streaming mode (vs reading full text)
  const isStreamingModeRef = useRef<boolean>(false)

  // Load voices when they become available
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices()
      if (voices.length > 0) {
        setAvailableVoices(voices)
        setIsReady(true)
      }
    }

    loadVoices()
    speechSynthesis.addEventListener('voiceschanged', loadVoices)

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices)
    }
  }, [])

  const getBestVoice = useCallback(() => {
    if (availableVoices.length === 0) return null

    // Priority list for natural-sounding MALE voices (neural/enhanced voices first)
    const preferredVoices = [
      // macOS premium male voices
      'Daniel (Enhanced)',
      'Alex',
      'Daniel',
      'Tom',
      'Oliver',
      // Windows neural male voices
      'Microsoft Guy Online (Natural)',
      'Microsoft David Online (Natural)',
      'Microsoft Mark Online (Natural)',
      'Microsoft Ryan Online (Natural)',
      'Microsoft Guy',
      'Microsoft David',
      'Microsoft Mark',
      // Google male voices
      'Google UK English Male',
      'Google US English Male',
    ]

    // Try to find a preferred male voice first
    for (const preferred of preferredVoices) {
      const voice = availableVoices.find(
        (v) => v.name.includes(preferred) || v.voiceURI.includes(preferred)
      )
      if (voice) return voice
    }

    // Look for any English male voice with "natural", "neural", "premium", or "enhanced" in the name
    const enhancedMaleVoice = availableVoices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.toLowerCase().includes('male') ||
          v.name.toLowerCase().includes('guy') ||
          v.name.toLowerCase().includes('david') ||
          v.name.toLowerCase().includes('mark') ||
          v.name.toLowerCase().includes('daniel') ||
          v.name.toLowerCase().includes('james') ||
          v.name.toLowerCase().includes('tom')) &&
        (v.name.toLowerCase().includes('natural') ||
          v.name.toLowerCase().includes('neural') ||
          v.name.toLowerCase().includes('premium') ||
          v.name.toLowerCase().includes('enhanced'))
    )
    if (enhancedMaleVoice) return enhancedMaleVoice

    // Look for any male voice
    const maleVoice = availableVoices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.toLowerCase().includes('male') ||
          v.name.toLowerCase().includes('guy') ||
          v.name.toLowerCase().includes('david') ||
          v.name.toLowerCase().includes('mark') ||
          v.name.toLowerCase().includes('daniel') ||
          v.name.toLowerCase().includes('james') ||
          v.name.toLowerCase().includes('tom') ||
          v.name.toLowerCase().includes('alex') ||
          v.name.toLowerCase().includes('oliver'))
    )
    if (maleVoice) return maleVoice

    // Fallback to any English voice
    const englishVoice = availableVoices.find((v) => v.lang.startsWith('en'))
    if (englishVoice) return englishVoice

    // Last resort
    return availableVoices[0]
  }, [availableVoices])

  // Clean text for TTS - remove punctuation that would be read aloud
  const cleanTextForSpeech = useCallback((text: string): string => {
    return text
      // Remove standalone punctuation and symbols
      .replace(/[*#@$%^&()_+=\[\]{}|\\<>\/~`"]/g, '')
      // Replace multiple dashes/underscores with space
      .replace(/[-_]{2,}/g, ' ')
      // Remove bullet points and list markers
      .replace(/^[\s]*[-•·]\s*/gm, '')
      // Remove markdown formatting
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/__/g, '')
      .replace(/_/g, ' ')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim()
  }, [])

  // Check if stream is still actively sending tokens
  const isStreamActive = useCallback(() => {
    if (!streamActiveRef.current) return false
    const timeSinceLastToken = Date.now() - lastTokenTimeRef.current
    return timeSinceLastToken < STREAM_PAUSE_THRESHOLD
  }, [])

  const processText = useCallback(() => {
    if (isProcessingRef.current || !pendingTextRef.current.trim()) return

    // Find complete sentences to speak
    const text = pendingTextRef.current
    const sentenceMatch = text.match(/^(.*?[.!?])\s*/s)

    let rawSentence: string
    if (sentenceMatch) {
      rawSentence = sentenceMatch[1].trim()
      pendingTextRef.current = text.slice(sentenceMatch[0].length)
    } else if (!isStreamingModeRef.current) {
      // In non-streaming mode, speak whatever text we have even without punctuation
      rawSentence = text.trim()
      pendingTextRef.current = ''
    } else {
      // In streaming mode, wait for complete sentence
      return
    }

    // Clean the sentence for speech
    const sentence = cleanTextForSpeech(rawSentence)

    if (!sentence) {
      if (pendingTextRef.current) {
        processText()
      }
      return
    }

    isProcessingRef.current = true
    setIsSpeaking(true)

    const utterance = new SpeechSynthesisUtterance(sentence)
    const voice = getBestVoice()

    if (voice) {
      utterance.voice = voice
    }

    // Natural speech settings
    utterance.rate = 0.95 // Slightly slower for clarity
    utterance.pitch = 1.0 // Natural pitch
    utterance.volume = 1.0

    utterance.onend = () => {
      isProcessingRef.current = false
      if (pendingTextRef.current.trim()) {
        // In streaming mode, check if stream is still active before speaking next sentence
        // In non-streaming mode (speak/flush), always continue to the end
        if (!isStreamingModeRef.current || isStreamActive()) {
          // Continue speaking
          setTimeout(processText, 100)
        } else {
          // Stream paused - stop speaking and wait for more tokens
          setIsSpeaking(false)
        }
      } else {
        setIsSpeaking(false)
        isStreamingModeRef.current = false
      }
    }

    utterance.onerror = (event) => {
      console.warn('Speech synthesis error:', event.error)
      isProcessingRef.current = false
      if (pendingTextRef.current.trim()) {
        // In non-streaming mode, always try to continue
        if (!isStreamingModeRef.current || isStreamActive()) {
          processText()
        } else {
          setIsSpeaking(false)
        }
      } else {
        setIsSpeaking(false)
      }
    }

    utteranceRef.current = utterance
    speechSynthesis.speak(utterance)
  }, [getBestVoice, cleanTextForSpeech, isStreamActive])

  const speak = useCallback(
    (text: string) => {
      // Stop any current speech first
      speechSynthesis.cancel()
      // For non-streaming speech, mark as non-streaming so all text gets spoken
      isStreamingModeRef.current = false
      streamActiveRef.current = true
      lastTokenTimeRef.current = Date.now()
      isProcessingRef.current = false
      pendingTextRef.current = text
      // Ensure text ends with punctuation for proper processing
      if (!pendingTextRef.current.match(/[.!?]\s*$/)) {
        pendingTextRef.current += '.'
      }
      processText()
    },
    [processText]
  )

  const speakToken = useCallback(
    (token: string) => {
      pendingTextRef.current += token
      lastTokenTimeRef.current = Date.now()
      streamActiveRef.current = true
      isStreamingModeRef.current = true

      // Start processing if we have a complete sentence and aren't already speaking
      if (!isProcessingRef.current && pendingTextRef.current.match(/[.!?]\s*$/)) {
        processText()
      }
    },
    [processText]
  )

  const stop = useCallback(() => {
    speechSynthesis.cancel()
    pendingTextRef.current = ''
    isProcessingRef.current = false
    streamActiveRef.current = false
    isStreamingModeRef.current = false
    lastTokenTimeRef.current = 0
    setIsSpeaking(false)
  }, [])

  const flush = useCallback(() => {
    // Switch to non-streaming mode so all remaining text will be spoken
    isStreamingModeRef.current = false
    streamActiveRef.current = true
    lastTokenTimeRef.current = Date.now()
    // Add a period if text doesn't end with punctuation to force processing
    if (pendingTextRef.current.trim() && !pendingTextRef.current.match(/[.!?]\s*$/)) {
      pendingTextRef.current += '.'
    }
    if (!isProcessingRef.current) {
      processText()
    }
  }, [processText])

  const pause = useCallback(() => {
    speechSynthesis.pause()
  }, [])

  const resume = useCallback(() => {
    speechSynthesis.resume()
  }, [])

  return {
    speak,
    speakToken,
    stop,
    flush,
    pause,
    resume,
    isSpeaking,
    isReady,
    availableVoices,
  }
}
