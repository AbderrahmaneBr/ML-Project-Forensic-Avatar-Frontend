import { useCallback, useEffect, useRef, useState } from 'react'

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const pendingTextRef = useRef<string>('')
  const isProcessingRef = useRef(false)

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

  const processText = useCallback(() => {
    if (isProcessingRef.current || !pendingTextRef.current.trim()) return

    // Find complete sentences to speak
    const text = pendingTextRef.current
    const sentenceMatch = text.match(/^(.*?[.!?])\s*/s)

    if (!sentenceMatch) return

    const sentence = sentenceMatch[1].trim()
    pendingTextRef.current = text.slice(sentenceMatch[0].length)

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
        // Small pause between sentences for natural flow
        setTimeout(processText, 100)
      } else {
        setIsSpeaking(false)
      }
    }

    utterance.onerror = (event) => {
      console.warn('Speech synthesis error:', event.error)
      isProcessingRef.current = false
      if (pendingTextRef.current.trim()) {
        processText()
      } else {
        setIsSpeaking(false)
      }
    }

    utteranceRef.current = utterance
    speechSynthesis.speak(utterance)
  }, [getBestVoice])

  const speak = useCallback(
    (text: string) => {
      pendingTextRef.current = text
      processText()
    },
    [processText]
  )

  const speakToken = useCallback(
    (token: string) => {
      pendingTextRef.current += token

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
    setIsSpeaking(false)
  }, [])

  const flush = useCallback(() => {
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
