import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { FileText, Pin } from 'lucide-react';
import { useApp } from '../../hooks/useApp';
import ConversationMenu from './ConversationMenu';

const ConversationCard = memo(({ conversation }) => {
  const { state, loadConversation, dispatch } = useApp();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const isActive = state.activeConversation?.conversation_id === conversation.conversation_id;
  const isSelected = state.selectedConvIds.includes(conversation.conversation_id);

  const handleCardClick = (e) => {
    if (isMenuOpen) return;
    
    if (state.selectionMode) {
      dispatch({ type: 'TOGGLE_DOC_SELECTION', payload: conversation.conversation_id });
    } else {
      if (!isActive) loadConversation(conversation);
    }
  };

  const toggleSelection = (e) => {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_DOC_SELECTION', payload: conversation.conversation_id });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ x: 4 }}
      onClick={handleCardClick}
      style={{ zIndex: isMenuOpen ? 50 : 'auto' }}
      className={`group relative p-4 rounded-2xl cursor-pointer transition-all duration-500 border gpu-accelerated ${
        isActive 
          ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20 shadow-[0_4px_20px_rgba(234,88,12,0.05)]' 
          : isSelected
            ? 'bg-slate-50 dark:bg-orange-500/5 border-orange-200 dark:border-orange-500/30'
            : 'bg-white dark:bg-[#0f1117] border-transparent hover:border-slate-100 dark:hover:border-slate-800'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Selection Checkbox */}
        <div className={`absolute left-[-10px] top-1/2 -translate-y-1/2 transition-all z-10 ${
          state.selectionMode ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100 scale-100'
        }`}>
           <button 
             onClick={toggleSelection}
             className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
               isSelected 
                 ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-600/30' 
                 : 'bg-white dark:bg-[#0a0a0f] border-slate-300 dark:border-slate-700 text-transparent'
             }`}
           >
              <div className={`w-2 h-2 rounded-sm bg-white transition-transform ${isSelected ? 'scale-100' : 'scale-0'}`} />
           </button>
        </div>

        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
          isActive 
            ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' 
            : isSelected
              ? 'bg-orange-500 text-white'
              : 'bg-slate-50 dark:bg-[#151821] text-slate-400 dark:text-slate-600'
        }`}>
          <FileText size={18} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-2">
          <h4 className={`text-[13px] font-black truncate leading-tight transition-colors ${
            isActive ? 'text-slate-900 dark:text-orange-400' : 'text-slate-700 dark:text-slate-300'
          }`}>
            {conversation.title || 'Untitled Document'}
          </h4>
          <div className="flex items-center gap-2 mt-1.5">
             <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest truncate">
                {conversation.filename}
             </span>
             {conversation.pinned && (
               <Pin size={8} className="text-orange-500 fill-orange-500" />
             )}
          </div>
        </div>

        {/* Action Menu */}
        <div className="absolute right-3 top-3">
           <ConversationMenu conversation={conversation} onOpenChange={setIsMenuOpen} />
        </div>
      </div>

      {/* Active Indicator */}
      {isActive && (
        <motion.div 
          layoutId="activeIndicator"
          className="absolute left-[-1px] top-4 bottom-4 w-1 bg-orange-600 rounded-r-full shadow-[2px_0_10px_rgba(234,88,12,0.4)]"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
    </motion.div>
  );
});

export default ConversationCard;
