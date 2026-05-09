import React, { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { User, Sparkles, Volume2, Square } from 'lucide-react';

const ChatMessage = memo(({ message }) => {
  const isAi = message.role === 'assistant';
  const [displayText, setDisplayText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  useEffect(() => {
    return () => {
      if (isSpeaking) window.speechSynthesis.cancel();
    };
  }, [isSpeaking]);

  useEffect(() => {
    if (isAi && !message.isOld) {
      setIsStreaming(true);
      let index = 0;
      const text = message.content || "";
      
      const stream = () => {
        if (index < text.length) {
          setDisplayText(text.slice(0, index + 1));
          index++;
          requestAnimationFrame(() => setTimeout(stream, 5));
        } else {
          setIsStreaming(false);
          message.isOld = true;
        }
      };
      
      stream();
    } else {
      setDisplayText(message.content || "");
    }
  }, [message, isAi]);

  const formatContent = (text) => {
    if (!text) return "";
    
    // Aggressive cleaning of markdown artifacts
    let clean = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/##\s+(.*?)/g, '$1')
      .replace(/###\s+(.*?)/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/SUGGESTIONS:.*$/s, '');

    const lines = clean.split('\n').filter(line => line.trim() !== '');
    
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      const isDocHeader = trimmed.startsWith('### [DOCUMENT');
      const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*');
      const content = isBullet ? trimmed.replace(/^[•\-*]\s*/, '') : trimmed;
      const isIntro = trimmed.endsWith(':') && trimmed.length < 120;

      if (isDocHeader) {
        return (
          <div key={idx} className="flex items-center gap-3 my-4 first:mt-0 pb-1 border-b border-orange-500/10 gpu-accelerated">
            <div className="px-2 py-0.5 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded">Source</div>
            <p className="text-[13px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">
              {trimmed.replace('### ', '')}
            </p>
          </div>
        );
      }

      if (isIntro) {
        return (
          <p key={idx} className="text-[14px] leading-[1.7] font-black text-slate-800 dark:text-slate-200 mb-2 mt-4 first:mt-0">
            {content}
          </p>
        );
      }

      if (isBullet) {
        return (
          <div key={idx} className="flex gap-3 items-start my-2 pl-1 group/bullet">
            <div className="w-1 h-1 bg-orange-500 rounded-full mt-[8px] flex-shrink-0 group-hover/bullet:scale-150 transition-transform" />
            <p className="text-[14px] leading-[1.7] font-medium text-slate-700 dark:text-slate-300">
              {content}
            </p>
          </div>
        );
      }

      return (
        <p key={idx} className="text-[14px] leading-[1.7] font-medium text-slate-700 dark:text-slate-300 mb-4 last:mb-0">
          {content}
        </p>
      );
    });
  };

  return (
    <motion.div
      className={`flex items-start gap-4 ${isAi ? '' : 'flex-row-reverse'} gpu-accelerated`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Real Avatar System */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border shadow-sm transition-colors ${
        isAi 
        ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20' 
        : 'bg-white dark:bg-[#1b1f2a] border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500'
      }`}>
        {isAi ? <Sparkles size={16} /> : <User size={18} />}
      </div>

      {/* Structured Content Bubble */}
      <div className={`${isAi ? 'max-w-[75%]' : 'max-w-[65%]'} group ${isAi ? 'text-left' : 'text-right'}`}>
        <div className={`px-5 py-4 rounded-[24px] transition-all duration-500 ${
          isAi 
          ? 'bg-slate-50/50 dark:bg-[#1b1f2a] border border-slate-100 dark:border-slate-800/60 rounded-tl-none hover:border-orange-500/20' 
          : 'bg-orange-600 text-white rounded-tr-none shadow-lg shadow-orange-900/10 hover:shadow-orange-900/20'
        }`}>
          {isAi ? (
            <div className="space-y-0.5">
              {formatContent(displayText)}
              {isStreaming && <span className="inline-block w-1.5 h-4 bg-orange-500 ml-1 animate-pulse" />}
            </div>
          ) : (
            <p className="text-[14px] font-bold leading-relaxed">{message.content}</p>
          )}
        </div>

        {/* Voice and Actions */}
        {isAi && !isStreaming && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap items-center gap-2 mt-3 px-1"
          >
            <button
              onClick={toggleSpeech}
              className={`p-1.5 rounded-lg transition-colors ${
                isSpeaking 
                ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' 
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
              }`}
              title={isSpeaking ? "Stop Speaking" : "Listen to Answer"}
            >
              {isSpeaking ? <Square size={14} className="fill-current" /> : <Volume2 size={14} />}
            </button>
            
            {message.sources && message.sources.length > 0 && (
              <span className="text-[10px] font-black uppercase text-slate-400 mr-1 tracking-widest">Sources:</span>
            )}
            {message.sources && message.sources.map((source, i) => (
              <button
                key={`source-${i}`}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('highlight-pdf', { 
                    detail: { 
                      page: source.page, 
                      text: source.text,
                      doc_id: source.doc_id,
                      filename: source.filename,
                      shouldScroll: true
                    } 
                  }));
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-[#151821] border border-orange-500/20 text-orange-600 dark:text-orange-500 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all shadow-sm"
              >
                {source.filename ? `${source.filename} • ` : ''}Page {source.page}
              </button>
            ))}
          </motion.div>
        )}

        {/* Smart Follow-Ups */}
        {isAi && !isStreaming && message.suggestions && message.suggestions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex flex-col gap-2"
          >
            {message.suggestions.map((suggestion, idx) => (
              <button
                key={`sugg-${idx}`}
                onClick={() => {
                   window.dispatchEvent(new CustomEvent('send-suggestion', { detail: suggestion }));
                }}
                className="self-start text-left bg-slate-50 dark:bg-[#151821] border border-slate-100 dark:border-slate-800/60 text-[12px] font-bold text-slate-600 dark:text-slate-400 px-4 py-2 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:border-orange-200 dark:hover:border-orange-500/30 hover:text-orange-600 dark:hover:text-orange-400 transition-all shadow-sm"
              >
                {suggestion}
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

export default ChatMessage;
