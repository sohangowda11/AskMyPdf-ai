import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, MessageSquare, History, FileUp, Home, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../hooks/useApp';
import ConversationList from './ConversationList';

export default function Sidebar() {
  const navigate = useNavigate();
  const { state, newAnalysis, uploadDocument, startMultiPDFChat, clearAllHistory, dispatch } = useApp();
  const fileInputRef = useRef(null);

  const handleAddPDF = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadDocument(file);
      } catch (err) {
        // Error is handled in context
      }
      // Reset input so same file can be uploaded again if needed
      e.target.value = '';
    }
  };

  return (
    <div className="w-full h-full bg-white dark:bg-[#0a0a0f] border-r border-slate-100 dark:border-slate-800/40 flex flex-col relative transition-colors duration-300">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={onFileChange} 
        className="hidden" 
        accept=".pdf"
      />

      {/* Brand */}
      <div className="p-8 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center text-white">
            <Sparkles size={18} />
          </div>
          <h1 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">AskMyPDF</h1>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="px-6 space-y-2">
        <button 
          onClick={newAnalysis}
          className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${
            !state.activeDocument 
              ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20 shadow-sm' 
              : 'text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#151821]'
          }`}
        >
          <MessageSquare size={18} />
          <span className="text-sm font-bold tracking-tight">New Chat</span>
        </button>

        <button 
           onClick={handleAddPDF}
           disabled={state.isUploading}
           className="w-full flex items-center gap-4 px-5 py-4 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-50/50 dark:bg-[#151821] hover:bg-slate-100 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileUp size={18} className="group-hover:text-orange-500 transition-colors" />
          <span className="text-sm font-bold tracking-tight">
            {state.isUploading ? 'Uploading...' : 'Add PDF'}
          </span>
        </button>

        <button 
           onClick={() => dispatch({ type: 'TOGGLE_SELECTION_MODE' })}
           className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group ${
             state.selectionMode 
               ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' 
               : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-50/50 dark:bg-[#151821] hover:bg-slate-100 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60'
           }`}
        >
          <Sparkles size={18} className={state.selectionMode ? 'text-white' : 'group-hover:text-orange-500'} />
          <span className="text-sm font-bold tracking-tight">
            {state.selectionMode ? 'Selecting PDFs...' : 'Multiple PDF'}
          </span>
        </button>

        <AnimatePresence>
          {state.selectedConvIds.length >= 2 && (
            <motion.button 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              onClick={() => startMultiPDFChat(navigate)}
              className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-orange-600 text-white rounded-2xl shadow-xl shadow-orange-600/20 font-black text-xs uppercase tracking-widest hover:bg-orange-700 transition-all mt-4"
            >
               <Sparkles size={16} />
               Start Multi-PDF Chat
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* History Section */}
      <div className="flex-1 overflow-hidden flex flex-col mt-8">
         <div className="px-8 pb-3 flex items-center justify-between border-b border-slate-50 dark:border-slate-800/20 mb-4">
            <div className="flex items-center gap-3">
               <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">History</span>
               {state.selectedConvIds.length > 0 && (
                 <span className="bg-orange-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black">
                   {state.selectedConvIds.length} SELECTED
                 </span>
               )}
            </div>
            
            <div className="flex items-center gap-2">
               <button 
                 onClick={() => {
                   if (window.confirm('Are you sure you want to delete all documents and history?')) {
                     clearAllHistory();
                   }
                 }}
                 title="Clear All History"
                 className="p-1 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-300 hover:text-red-500 transition-all rounded-md"
               >
                 <Trash2 size={12} />
               </button>
               <History size={10} className="text-slate-300" />
            </div>
         </div>
        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
           <ConversationList />
        </div>
      </div>
    </div>
  );
}
