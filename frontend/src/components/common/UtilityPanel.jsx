import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, BookOpen, ChevronDown, Loader2 } from 'lucide-react';
import { useApp } from '../../hooks/useApp';

export default function UtilityPanel() {
  const { state, closeUtilityPanel } = useApp();
  const { isOpen, activeTool, data, isLoading } = state.utilityPanel;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="fixed right-4 md:right-6 top-20 md:top-24 bottom-4 md:bottom-24 w-[calc(100%-2rem)] md:w-[380px] z-[100] flex flex-col pointer-events-auto transition-all duration-500"
    >
      <div className="flex-1 bg-white dark:bg-[#0f1117] border border-slate-100 dark:border-slate-800 rounded-[32px] shadow-[0_30px_100px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-slate-50 dark:border-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white">
              {activeTool === 'study' ? <BookOpen size={20} /> : <Sparkles size={20} />}
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                {activeTool === 'study' ? 'Study Mode' : 'AI Assistant'}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Advanced Analysis</p>
            </div>
          </div>
          <button 
            onClick={closeUtilityPanel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <Loader2 size={32} className="animate-spin text-orange-600 mb-4" />
              <p className="text-xs font-black uppercase tracking-widest">Analyzing PDF...</p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {formatToolOutput(data)}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
               <Sparkles size={40} className="mb-4" />
               <p className="text-xs font-black uppercase tracking-widest">Select a tool to begin</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function formatToolOutput(data) {
  // If data is just a string, we might want to split it by sections
  const sections = data.split('\n\n');
  
  return sections.map((section, idx) => {
    const lines = section.split('\n');
    const title = lines[0].replace(':', '');
    const content = lines.slice(1);

    return (
      <div key={idx} className="bg-slate-50 dark:bg-[#151821] border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
        <details className="group" open={idx === 0}>
          <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
            <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">{title}</span>
            <ChevronDown size={14} className="text-slate-400 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="px-4 pb-4 space-y-2">
            {content.map((line, lidx) => (
              <div key={lidx} className="flex gap-3 items-start">
                <div className="w-1 h-1 bg-orange-500 rounded-full mt-1.5 flex-shrink-0" />
                <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-400 font-medium">
                  {line.replace(/^[•\-*]\s*/, '')}
                </p>
              </div>
            ))}
          </div>
        </details>
      </div>
    );
  });
}
