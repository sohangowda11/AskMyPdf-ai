import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Paperclip, ArrowUp, Zap, BookOpen, Sparkles } from 'lucide-react';
import { useApp } from '../../hooks/useApp';

export default function ChatInput({ isDisabled }) {
  const [message, setMessage] = useState('');
  const { state, sendChatMessage, openUtilityTool, generateStudyToolkit } = useApp();
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [message]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || state.isSending || isDisabled) return;
    setMessage('');
    await sendChatMessage(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="relative">
      <form 
        onSubmit={handleSubmit} 
        className="relative flex items-end bg-white dark:bg-[#1b1f2a] border border-slate-100 dark:border-slate-800 rounded-[24px] shadow-[0_4px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] focus-within:border-orange-100 dark:focus-within:border-orange-500/30 focus-within:ring-4 focus-within:ring-orange-50/30 dark:focus-within:ring-orange-500/5 transition-all duration-300 overflow-hidden pl-2"
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          disabled={isDisabled}
          className="flex-1 bg-transparent py-4 text-[13px] font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 outline-none resize-none custom-scrollbar disabled:cursor-not-allowed leading-relaxed transition-[height] duration-200 will-change-[height] gpu-accelerated"
          style={{ minHeight: '52px' }}
        />

        <div className="p-2">
          <motion.button
            type="submit"
            disabled={!message.trim() || state.isSending || isDisabled}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              !message.trim() || state.isSending || isDisabled
              ? 'bg-slate-50 dark:bg-slate-900 text-slate-200 dark:text-slate-800'
              : 'bg-orange-600 text-white shadow-lg shadow-orange-100 dark:shadow-orange-900/10'
            }`}
            whileTap={{ scale: 0.9 }}
          >
            {state.isSending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ArrowUp size={20} />
            )}
          </motion.button>
        </div>
      </form>
      
      <div className="mt-3 flex items-center justify-center gap-2 opacity-30 dark:opacity-20">
         <Zap size={8} className="text-slate-400" />
         <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Verified AI Responses</span>
      </div>
    </div>
  );
}
