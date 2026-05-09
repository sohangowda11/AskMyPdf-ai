import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Volume2, Sparkles, Loader2, Square as SquareIcon } from 'lucide-react';
import { useApp } from '../../../hooks/useApp';

export default function VoiceMode({ onClose }) {
  const { state, sendChatMessage } = useApp();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [permissionError, setPermissionError] = useState(null);

  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const synthesisRef = useRef(window.speechSynthesis);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setPermissionError("Your browser doesn't support speech recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event) => {
      const current = event.results[event.results.length - 1];
      const text = current[0].transcript;
      setTranscript(text);

      if (current.isFinal) {
        handleSpeechEnd(text);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setPermissionError("Microphone access is required for voice mode.");
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // Initialize Web Audio API for volume visualization
  const startAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      analyserRef.current = analyser;
      audioContextRef.current = audioContext;

      const analyze = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setVolume(average);
        animationFrameRef.current = requestAnimationFrame(analyze);
      };
      analyze();
    } catch (err) {
      console.error("Audio Analysis Error:", err);
    }
  };

  useEffect(() => {
    startAudioAnalysis();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const handleSpeechEnd = async (text) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    try {
      const response = await sendChatMessage(text);
      if (response && response.answer) {
        speakResponse(response.answer);
      }
    } catch (err) {
      console.error("Failed to process voice request:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const speakResponse = (text) => {
    // Clean text for speech
    const cleanText = text.replace(/SUGGESTIONS:.*$/s, '').replace(/[•\-\*]/g, '').trim();
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    synthesisRef.current.cancel();
    synthesisRef.current.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      recognitionRef.current.start();
    }
  };

  const stopConversation = () => {
    synthesisRef.current.cancel();
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsSpeaking(false);
    setIsListening(false);
    setIsProcessing(false);
    setTranscript('');
  };

  // Orb variants based on state
  const orbVariants = {
    idle: {
      scale: [1, 1.05, 1],
      rotate: [0, 90, 180, 270, 360],
      transition: { duration: 8, repeat: Infinity, ease: "linear" }
    },
    listening: {
      scale: 1 + (volume / 100) * 0.5,
      boxShadow: `0 0 ${20 + volume}px rgba(234, 88, 12, 0.6)`,
      transition: { type: 'spring', stiffness: 300, damping: 20 }
    },
    processing: {
      scale: [1, 1.1, 1],
      rotate: [0, 360],
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
    },
    speaking: {
      scale: [1, 1.15, 1.05, 1.1, 1],
      boxShadow: [
        "0 0 20px rgba(234, 88, 12, 0.4)",
        "0 0 50px rgba(234, 88, 12, 0.7)",
        "0 0 20px rgba(234, 88, 12, 0.4)"
      ],
      transition: { duration: 1.5, repeat: Infinity }
    }
  };

  const activeState = isProcessing ? 'processing' : isSpeaking ? 'speaking' : isListening ? 'listening' : 'idle';

  return (
    <div className="h-full flex flex-col items-center justify-between p-8 relative">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center text-orange-500">
            <Volume2 size={20} />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-100">Live AI Voice</h3>
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2">
              {isProcessing ? 'Processing...' : isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Connected'}
              {isProcessing && <Loader2 size={10} className="animate-spin" />}
            </span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Orb Centerpiece */}
      <div className="flex-1 flex flex-col items-center justify-center gap-12 w-full">
        <div className="relative group">
          {/* Outer glow rings */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -inset-16 bg-orange-600/20 rounded-full blur-3xl"
          />
          <motion.div 
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.05, 0.2, 0.05]
            }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute -inset-24 bg-orange-500/10 rounded-full blur-[60px]"
          />

          {/* Core Orb */}
          <motion.div
            variants={orbVariants}
            animate={activeState}
            className={`w-40 h-40 lg:w-48 lg:h-48 rounded-full relative z-10 flex items-center justify-center overflow-hidden border border-white/10 shadow-2xl ${
              isListening ? 'bg-orange-600' : 'bg-slate-900/50 backdrop-blur-3xl'
            }`}
          >
            {/* Internal energy effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 via-transparent to-orange-900/40" />
            
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Sparkles size={48} className="text-white animate-pulse" />
                </motion.div>
              ) : (
                <motion.div
                  key="default"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-2"
                >
                  {isListening ? <Mic size={48} className="text-white" /> : <MicOff size={40} className="text-slate-500" />}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Ripple effects while speaking */}
            {isSpeaking && (
              <motion.div 
                animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 border-2 border-orange-400 rounded-full"
              />
            )}
          </motion.div>
        </div>

        {/* Live Transcription */}
        <div className="max-w-md w-full text-center min-h-[80px]">
          <AnimatePresence mode="wait">
            {transcript ? (
              <motion.p 
                key="transcript"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg lg:text-xl font-bold text-slate-200 leading-relaxed"
              >
                "{transcript}"
              </motion.p>
            ) : (
              <motion.p 
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm font-black uppercase tracking-widest text-slate-500"
              >
                {permissionError ? permissionError : 'Tap the mic to start talking'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full flex flex-col items-center gap-6">
        <div className="flex items-center gap-6">
          {(isSpeaking || isListening || isProcessing) && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={stopConversation}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-800 text-white shadow-xl border border-white/5"
            >
              <SquareIcon size={20} />
            </motion.button>
          )}

          <motion.button
            onClick={() => {
              if (isSpeaking) stopConversation();
              toggleListening();
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            disabled={isProcessing}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all ${
              isListening 
              ? 'bg-red-500 shadow-red-500/40 text-white' 
              : 'bg-orange-600 shadow-orange-600/40 text-white'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isListening ? <Square size={24} className="fill-current" /> : <Mic size={32} />}
          </motion.button>
        </div>

        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
          Powered by Gemini AI Voice
        </p>
      </div>
    </div>
  );
}

function Square({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    </svg>
  );
}
