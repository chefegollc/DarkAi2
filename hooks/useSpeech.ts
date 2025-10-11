import { useState, useRef, useCallback } from 'react';

interface UseSpeechOptions {
    onTranscript: (transcript: string) => void;
}

// Check for SpeechRecognition API and its vendor prefixes
// FIX: Cast window to `any` to access vendor-prefixed/experimental APIs.
const SpeechRecognitionApi = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useSpeech = ({ onTranscript }: UseSpeechOptions) => {
    const [isListening, setIsListening] = useState(false);
    const [isTTSEnabled, setIsTTSEnabled] = useState(false);
    
    // Check for both APIs' support once
    const isRecognitionSupported = !!SpeechRecognitionApi;
    const isSynthesisSupported = 'speechSynthesis' in window;
    const isSupported = isRecognitionSupported && isSynthesisSupported;

    // FIX: The `SpeechRecognitionApi` constant above shadows the global type.
    // Use `any` to avoid type/value name collision and work around missing global types.
    const recognitionRef = useRef<any | null>(null);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    const startListening = useCallback(() => {
        if (isListening || !isRecognitionSupported) return;

        recognitionRef.current = new SpeechRecognitionApi();
        const recognition = recognitionRef.current;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => console.error('Speech recognition error:', event.error);
        
        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                onTranscript(finalTranscript);
                // Stop after a final result to act like a "push-to-talk"
                stopListening(); 
            }
        };
        
        recognition.start();

    }, [isListening, isRecognitionSupported, onTranscript, stopListening]);

    const speak = useCallback((text: string) => {
        if (!isTTSEnabled || !isSynthesisSupported) return;

        // Cancel any ongoing speech before starting a new one
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    }, [isTTSEnabled, isSynthesisSupported]);
    
    const toggleTTS = useCallback(() => {
        setIsTTSEnabled(prev => {
            if (prev) {
                window.speechSynthesis.cancel();
            }
            return !prev;
        });
    }, []);

    return {
        isListening,
        startListening,
        stopListening,
        isTTSEnabled,
        toggleTTS,
        speak,
        isSupported
    };
};