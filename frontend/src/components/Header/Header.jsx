import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Home, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../hooks/useApp';

export default function Header() {
  const { state, dispatch, goHome } = useApp();
  const navigate = useNavigate();
  const isDark = state.theme === 'dark';

  const toggleTheme = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  return (
    <header className="h-20 bg-white dark:bg-[#0a0a0f] border-b border-slate-50 dark:border-slate-800/40 px-8 flex items-center justify-between sticky top-0 z-[100] transition-colors duration-300">
      {/* Left: Active Document */}
      <div className="flex-1 flex items-center gap-3 min-w-0">
         <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)] flex-shrink-0" />
         <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest truncate max-w-[200px]">
           {state.activeDocument?.filename || 'Analyzing...'}
         </h2>
      </div>

      {/* Center: Spacer */}
      <div className="flex-[2]" />

      {/* Right: Actions */}
      <div className="flex-1 flex items-center justify-end gap-4">
        <motion.button
          onClick={goHome}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Go to Home"
          className="w-11 h-11 bg-slate-50 dark:bg-[#151821] border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-orange-500 transition-all"
        >
          <Home size={20} />
        </motion.button>

        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-11 h-11 bg-slate-50 dark:bg-[#151821] border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-orange-500 transition-all"
        >
          <AnimatePresence mode="wait">
            {isDark ? (
              <motion.div key="moon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Moon size={20} />
              </motion.div>
            ) : (
              <motion.div key="sun" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Sun size={20} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </header>
  );
}
