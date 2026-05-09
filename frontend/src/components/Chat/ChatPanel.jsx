import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../hooks/useApp';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import SuggestionChips from './SuggestionChips';

export default function ChatPanel() {
  const { state, sendChatMessage } = useApp();
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  // Initial scroll and new message scroll
  useEffect(() => {
    if (isAutoScrolling) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.messages, state.isSending]);

  // MutationObserver for continuous smooth streaming scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleUserScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Precision check for bottom to prevent jumpiness
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 50;
      setIsAutoScrolling(isAtBottom);
    };

    container.addEventListener('scroll', handleUserScroll, { passive: true });

    const observer = new MutationObserver(() => {
      if (isAutoScrolling) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }); // auto for snappier stream
      }
    });

    observer.observe(container, { 
      childList: true, 
      subtree: true, 
      characterData: true 
    });

    return () => {
      observer.disconnect();
      container.removeEventListener('scroll', handleUserScroll);
    };
  }, [isAutoScrolling]);

  useEffect(() => {
    const handleSendSuggestion = (e) => {
      sendChatMessage(e.detail);
    };
    window.addEventListener('send-suggestion', handleSendSuggestion);
    return () => window.removeEventListener('send-suggestion', handleSendSuggestion);
  }, [sendChatMessage]);

  const handleSuggestionClick = (suggestion) => {
    sendChatMessage(suggestion);
  };

  return (
    <div className="w-full bg-white dark:bg-[#0f1117] flex flex-col h-full relative z-10 overflow-hidden transition-colors duration-300">


      {/* Spacious Message Stream */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pt-10 pb-44 px-6 md:px-10 custom-scrollbar bg-white dark:bg-[#0f1117] gpu-accelerated"
      >
        {state.messages.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto opacity-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h4 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2 tracking-tight uppercase tracking-[0.2em]">Ready for Analysis</h4>
            <p className="text-[12px] text-slate-500 font-bold leading-relaxed">
              Upload a document or select an action to begin.
            </p>
          </motion.div>
        )}

        <div className="space-y-12 max-w-3xl mx-auto">
          {state.messages.map((msg, i) => (
            <ChatMessage key={msg.id || i} message={msg} />
          ))}
          
          <AnimatePresence>
            {state.isGeneratingQuiz && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-4"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border shadow-sm bg-orange-600 border-orange-500 text-white">
                  <Sparkles size={16} />
                </div>
                <div className="max-w-[75%]">
                   <div className="px-5 py-4 rounded-[24px] rounded-tl-none bg-slate-50/50 dark:bg-[#1b1f2a] border border-slate-100 dark:border-slate-800/60 shadow-sm relative overflow-hidden group">
                      {/* Shimmer Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 dark:via-white/[0.02] to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                      
                      <div className="flex flex-col gap-1">
                         <p className="text-[14px] font-bold text-slate-700 dark:text-slate-300">
                           Analyzing PDF and generating questions...
                         </p>
                         <div className="flex gap-1.5 mt-1 opacity-40">
                            <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" />
                         </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {state.isSending && (
            <motion.div 
              className="flex items-center gap-3 pl-2 opacity-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex gap-2">
                 <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                 <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                 <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} className="h-10" />
        </div>
      </div>

      {/* Floating Entry Hub */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white dark:from-[#0f1117] via-white/90 dark:via-[#0f1117]/90 to-transparent z-30 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto flex flex-col gap-4">
          <AnimatePresence>
            {!state.isGeneratingQuiz && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                 <SuggestionChips onSelect={handleSuggestionClick} />
              </motion.div>
            )}
          </AnimatePresence>
          <ChatInput isDisabled={ state.isSending || !state.activeDocument} />
        </div>
      </div>
    </div>
  );
}
