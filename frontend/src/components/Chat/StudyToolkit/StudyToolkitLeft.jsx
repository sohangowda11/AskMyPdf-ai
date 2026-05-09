import React from 'react';
import { motion } from 'framer-motion';
import { Book, HelpCircle, FileText, Zap, Lightbulb } from 'lucide-react';
import { useApp } from '../../../hooks/useApp';

const TOOLS = [
  { id: 'keyConcepts', label: 'Key Concepts', icon: <Book size={16} /> },
  { id: 'flashcards', label: 'Flashcards', icon: <Zap size={16} /> },
  { id: 'miniQuiz', label: 'Mini Quiz', icon: <HelpCircle size={16} /> },
  { id: 'revisionNotes', label: 'Revision Notes', icon: <FileText size={16} /> },
  { id: 'definitions', label: 'Definitions', icon: <Lightbulb size={16} /> },
];

export default function StudyToolkitLeft() {
  const { state } = useApp();
  const { isOpen, data } = state.studyToolkit;

  if (!isOpen) return null;

  const scrollToSection = (id) => {
    const el = document.getElementById(`toolkit-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <motion.div
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="hidden xl:flex flex-col gap-3 w-64 fixed left-12 top-1/2 -translate-y-1/2 z-10"
    >
      <div className="bg-white/5 dark:bg-[#0f1117]/40 backdrop-blur-xl border border-slate-200/10 dark:border-white/5 rounded-3xl p-6 shadow-2xl">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 px-2">Toolkit Tools</h3>
        <div className="space-y-1">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => scrollToSection(tool.id)}
              disabled={!data}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left ${
                data 
                ? 'text-slate-600 dark:text-slate-400 hover:bg-orange-500/10 hover:text-orange-500' 
                : 'opacity-30 cursor-not-allowed text-slate-500'
              }`}
            >
              <span className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl">{tool.icon}</span>
              <span className="text-[12px] font-bold">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
