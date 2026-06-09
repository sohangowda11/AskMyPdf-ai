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
    
    // Remove the trailing suggestions part from the display text
    let clean = text.replace(/SUGGESTIONS:.*$/s, '');

    const lines = clean.split('\n');
    
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed && idx !== lines.length - 1) return <div key={idx} className="h-2" />;

      const isDocHeader = trimmed.startsWith('### [SOURCE');
      const isHeading1 = trimmed.startsWith('# ');
      const isHeading2 = trimmed.startsWith('## ');
      const isHeading3 = trimmed.startsWith('### ') && !isDocHeader;
      const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*');
      
      // Handle Bolding within lines
      const renderLineWithBold = (str) => {
        const parts = str.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-black text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
          }
          return part;
        });
      };

      if (isDocHeader) {
        return (
          <div key={idx} className="flex items-center gap-3 my-4 first:mt-0 pb-1 border-b border-orange-500/10 gpu-accelerated">
            <div className="px-2 py-0.5 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded">Source</div>
            <p className="text-[12px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">
              {trimmed.replace('### ', '')}
            </p>
          </div>
        );
      }

      if (isHeading1 || isHeading2 || isHeading3) {
        const level = isHeading1 ? 'text-xl' : isHeading2 ? 'text-lg' : 'text-md';
        return (
          <p key={idx} className={`${level} font-black text-slate-900 dark:text-slate-100 mb-2 mt-6 first:mt-0 uppercase tracking-tight`}>
            {trimmed.replace(/^#+\s+/, '')}
          </p>
        );
      }

      if (isBullet) {
        const content = trimmed.replace(/^[•\-*]\s*/, '');
        return (
          <div key={idx} className="flex gap-3 items-start my-2 pl-1 group/bullet">
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-[7px] flex-shrink-0 group-hover/bullet:scale-125 transition-transform" />
            <p className="text-[14px] leading-[1.7] font-medium text-slate-700 dark:text-slate-300">
              {renderLineWithBold(content)}
            </p>
          </div>
        );
      }

      return (
        <p key={idx} className="text-[14px] leading-[1.7] font-medium text-slate-700 dark:text-slate-300 mb-3 last:mb-0">
          {renderLineWithBold(trimmed)}
        </p>
      );
    });
  };

  return (
    <motion.div
      className={`flex items-start gap-4 mb-8 ${isAi ? '' : 'flex-row-reverse'} gpu-accelerated`}
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
      <div className={`${isAi ? 'max-w-[85%]' : 'max-w-[75%]'} group ${isAi ? 'text-left' : 'text-right'} w-full`}>
        <div className={`px-5 py-4 rounded-[24px] shadow-sm ${
          isAi 
          ? 'bg-slate-50/50 dark:bg-[#1b1f2a] border border-slate-100 dark:border-slate-800/60 rounded-tl-none' 
          : 'bg-orange-600 text-white rounded-tr-none shadow-orange-900/10'
        } break-words overflow-visible`}>
          {isAi ? (
            <div className="space-y-0.5 w-full">
              {formatContent(String(displayText))}
              {isStreaming && <span className="inline-block w-1.5 h-4 bg-orange-500 ml-1 animate-pulse" />}
            </div>
          ) : (
            <p className="text-[14px] font-bold leading-relaxed break-words">{typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}</p>
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

        {/* Smart Follow-Ups (Horizontal Chips) */}
        {isAi && !isStreaming && message.suggestions && message.suggestions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar"
          >
            {message.suggestions.map((suggestion, idx) => (
              <button
                key={`sugg-${idx}`}
                onClick={() => {
                   window.dispatchEvent(new CustomEvent('send-suggestion', { detail: suggestion }));
                }}
                className="flex-shrink-0 bg-white dark:bg-[#151821] border border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-slate-600 dark:text-slate-400 px-4 py-2 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:border-orange-200 dark:hover:border-orange-500/30 hover:text-orange-600 dark:hover:text-orange-400 transition-all shadow-sm"
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
