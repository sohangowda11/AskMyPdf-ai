import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Zap, HelpCircle, Loader2, Lightbulb, Sparkles } from 'lucide-react';
import { useApp } from '../../hooks/useApp';

const SUGGESTIONS = [
  { id: 'summarize', label: 'Give me a quick summary', icon: <FileText size={14} />, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  { id: 'explain_simply', label: 'Explain in simple words', icon: <Lightbulb size={14} />, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' }
];

export default function SuggestionChips({ onSelect }) {
  const { state, requestSummary, requestAdvancedTool, requestExplainSimply } = useApp();
  const { isGenerating } = state;

  const handleAction = async (item) => {
    if (isGenerating) return;
    
    if (item.id === 'summarize') {
      await requestSummary();
    } else if (item.id === 'explain_simply') {
      await requestExplainSimply();
    } else {
      await requestAdvancedTool(item.id);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="flex items-center gap-2 mb-0.5 opacity-40 px-1">
        <Sparkles size={11} className="text-orange-500" />
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Suggested for you</span>
      </div>
      
      {/* Horizontal Scroll Track */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory">
        {SUGGESTIONS.map((item) => {
          const isLoading = state.isSending || state.isGeneratingQuiz;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => handleAction(item)}
              disabled={isLoading}
              whileHover={{ y: isLoading ? 0 : -1 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
              className={`flex-shrink-0 snap-start flex items-center gap-2.5 px-3.5 py-2 bg-slate-50 dark:bg-[#1b1f2a] border border-slate-100 dark:border-slate-800/60 text-[11px] font-bold text-slate-600 dark:text-slate-400 rounded-xl transition-all shadow-sm ${
                isLoading 
                  ? 'opacity-60 cursor-not-allowed' 
                  : `hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:border-orange-200 dark:hover:border-orange-500/30 hover:text-orange-600 dark:hover:text-orange-400`
              }`}
            >
              <span className="opacity-70">{item.icon}</span>
              <span className="whitespace-nowrap">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
