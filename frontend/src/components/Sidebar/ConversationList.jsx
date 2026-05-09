import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, History } from 'lucide-react';
import { useApp } from '../../hooks/useApp';
import ConversationCard from './ConversationCard';

export default function ConversationList() {
  const { state } = useApp();
  const [search, setSearch] = React.useState('');

  const filtered = state.conversations.filter(c => 
    c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.filename?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="px-4 mb-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search size={14} className="text-slate-300 dark:text-slate-600 group-focus-within:text-orange-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Find documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50/50 dark:bg-[#151821] border border-slate-100 dark:border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-orange-200 dark:focus:border-orange-500/30 focus:ring-4 focus:ring-orange-50 dark:focus:ring-orange-500/5 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
          />
        </div>
      </div>

      <div className="flex-1 space-y-2 px-2 pb-10">
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            filtered.map((conv) => (
              <ConversationCard key={conv.conversation_id} conversation={conv} />
            ))
          ) : (
            <motion.div 
              className="flex flex-col items-center justify-center py-12 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
               <div className="w-10 h-10 bg-slate-50 dark:bg-[#151821] rounded-xl flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
                  <History size={18} className="text-slate-200 dark:text-slate-700" />
               </div>
               <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">No matching history</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
