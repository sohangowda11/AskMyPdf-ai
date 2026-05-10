import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Moon, Sun, Lightbulb, Mic } from 'lucide-react';
import { useApp } from '../../hooks/useApp';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import SuggestionChips from './SuggestionChips';
import StudyToolkitRight from './StudyToolkit/StudyToolkitRight';
import VoiceMode from './VoiceMode/VoiceMode';

export default function DedicatedChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { state, loadConversation, sendChatMessage, generateStudyToolkit, requestExplainSimply, setVoiceModeOpen, setStudyToolkitOpen, dispatch } = useApp();
  const messagesEndRef = useRef(null);

  const isDark = state.theme === 'dark';

  const toggleTheme = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  // Initial load if arriving directly
  useEffect(() => {
    if (conversationId && (!state.activeConversation || state.activeConversation.conversation_id !== conversationId)) {
      // Find the conversation from history and load it
      const conv = state.conversations.find(c => c.conversation_id === conversationId);
      if (conv) {
        loadConversation(conv);
      }
    }
  }, [conversationId, state.conversations, state.activeConversation, loadConversation]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages, state.isSending]);

  // Handle smart suggestions
  useEffect(() => {
    const handleSendSuggestion = (e) => {
      sendChatMessage(e.detail);
    };
    window.addEventListener('send-suggestion', handleSendSuggestion);
    return () => window.removeEventListener('send-suggestion', handleSendSuggestion);
  }, [sendChatMessage]);

  const isRightPanelOpen = state.studyToolkit.isOpen || state.voiceMode.isOpen;

  return (
    <div className={`flex flex-col h-screen w-full transition-colors duration-500 overflow-hidden ${state.theme === 'dark' ? 'bg-[#0a0c10] text-white' : 'bg-white text-slate-900'}`}>
      {/* Header */}
      <header className="h-16 flex-shrink-0 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#0f1117] flex items-center justify-between px-8 z-30">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-[12px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Workspace</span>
          </button>
          
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
          
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
              {state.isMultiPDFMode ? (
                <div className="flex items-center gap-4 overflow-x-auto max-w-[600px] no-scrollbar">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Multi-PDF Workspace</span>
                    <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full w-fit">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                      <span className="text-[9px] font-black text-orange-500 uppercase tracking-[0.1em] whitespace-nowrap">{state.activeDocuments.length} PDFs Synchronized</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {state.activeDocuments.map((doc) => (
                      <div key={doc.doc_id} className="relative group/chip">
                        <button
                          onClick={() => {
                              dispatch({ type: 'SET_ACTIVE_DOCUMENT', payload: doc });
                              dispatch({ type: 'SET_PDF_URL', payload: `/uploads/${doc.filename}` });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border flex items-center gap-2 ${
                            state.activeDocument?.doc_id === doc.doc_id
                              ? 'bg-orange-600 text-white border-orange-500 shadow-lg shadow-orange-600/20'
                              : 'bg-slate-50 dark:bg-[#1b1f2a] text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-orange-500/30'
                          }`}
                        >
                          {doc.filename}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const newDocs = state.activeDocuments.filter(d => d.doc_id !== doc.doc_id);
                            if (newDocs.length >= 1) {
                              dispatch({ type: 'SET_ACTIVE_DOCUMENTS', payload: newDocs });
                              if (state.activeDocument?.doc_id === doc.doc_id) {
                                dispatch({ type: 'SET_ACTIVE_DOCUMENT', payload: newDocs[0] });
                                dispatch({ type: 'SET_PDF_URL', payload: `/uploads/${newDocs[0].filename}` });
                              }
                            }
                          }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/chip:opacity-100 transition-opacity scale-75 hover:scale-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
             ) : (
               <h2 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                 {state.activeDocument?.filename || 'Analyzing...'}
               </h2>
             )}
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center gap-4">
          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-9 h-9 bg-slate-50 dark:bg-[#151821] border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-orange-500 transition-all"
          >
            <AnimatePresence mode="wait">
              {isDark ? (
                <motion.div key="moon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Moon size={16} />
                </motion.div>
              ) : (
                <motion.div key="sun" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Sun size={16} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </header>

      {/* Main Workspace Partition */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Floating Left Side Triggers */}
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-4 hidden lg:flex">
          <AnimatePresence>
            {!isRightPanelOpen && (
              <>
                <motion.button
                  key="study-toolkit-trigger"
                  onClick={() => generateStudyToolkit()}
                  initial={{ x: -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -40, opacity: 0 }}
                  whileHover={{ x: 0, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-4 px-6 py-4 bg-orange-600 text-white rounded-r-3xl shadow-2xl shadow-orange-600/30 group transition-all"
                >
                  <div className="flex flex-col items-start">
                     <span className="text-[9px] font-black uppercase tracking-[0.3em] text-orange-200 mb-0.5 group-hover:translate-x-1 transition-transform">Instant Analysis</span>
                     <span className="text-[12px] font-black uppercase tracking-widest">Study Toolkit</span>
                  </div>
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white backdrop-blur-md group-hover:rotate-12 transition-transform">
                     <Sparkles size={18} />
                  </div>
                </motion.button>

                <motion.button
                  key="explain-simply-trigger"
                  onClick={() => requestExplainSimply()}
                  initial={{ x: -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -40, opacity: 0 }}
                  whileHover={{ x: 0, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-4 px-6 py-4 bg-slate-800 dark:bg-[#1b1f2a] text-white rounded-r-3xl shadow-2xl border border-white/5 group transition-all"
                >
                  <div className="flex flex-col items-start">
                     <span className="text-[9px] font-black uppercase tracking-[0.3em] text-orange-500 mb-0.5 group-hover:translate-x-1 transition-transform">Teacher Mode</span>
                     <span className="text-[12px] font-black uppercase tracking-widest">Explain Simply</span>
                  </div>
                  <div className="w-10 h-10 bg-orange-600/20 rounded-xl flex items-center justify-center text-orange-500 backdrop-blur-md group-hover:rotate-12 transition-transform border border-orange-500/20 shadow-[0_0_15px_rgba(234,88,12,0.2)]">
                     <Lightbulb size={18} />
                  </div>
                </motion.button>

                <motion.button
                  key="voice-mode-trigger"
                  onClick={() => setVoiceModeOpen(true)}
                  initial={{ x: -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -40, opacity: 0 }}
                  whileHover={{ x: 0, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-4 px-6 py-4 bg-indigo-600 text-white rounded-r-3xl shadow-2xl shadow-indigo-600/30 group transition-all"
                >
                  <div className="flex flex-col items-start">
                     <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-0.5 group-hover:translate-x-1 transition-transform">Live Conversation</span>
                     <span className="text-[12px] font-black uppercase tracking-widest">Voice Chat</span>
                  </div>
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white backdrop-blur-md group-hover:rotate-12 transition-transform">
                     <Mic size={18} />
                  </div>
                </motion.button>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Chat Section */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <div className="flex-1 overflow-y-auto pt-10 pb-40 px-6 custom-scrollbar scroll-smooth">
            <div className="max-w-4xl mx-auto space-y-12">
              {state.messages.length === 0 && (
                <div className="h-[60vh] flex flex-col items-center justify-center gap-12">
                  <div className="flex flex-col items-center text-center max-w-sm">
                    <div className="w-16 h-16 bg-orange-600 rounded-[28px] flex items-center justify-center text-white shadow-2xl shadow-orange-500/20 mb-8 animate-pulse">
                      <Sparkles size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">AI Study Workspace</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed uppercase tracking-widest">Select a prompt to start analyzing</p>
                  </div>
                  
                  <div className="w-full max-w-2xl px-4">
                    <SuggestionChips />
                  </div>
                </div>
              )}

              {state.messages.map((msg, i) => (
                <ChatMessage key={msg.id || i} message={msg} />
              ))}

              <AnimatePresence>
                {state.isSending && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-4"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border shadow-sm bg-orange-600 border-orange-500 text-white">
                      <Sparkles size={16} />
                    </div>
                    <div className="px-5 py-4 bg-slate-50/50 dark:bg-[#1b1f2a] border border-slate-100 dark:border-slate-800/60 rounded-[24px] rounded-tl-none">
                      <span className="flex gap-1.5">
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!state.isSending && state.messages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{ paddingLeft: '52px' }}
                >
                  <SuggestionChips />
                </motion.div>
              )}

              <div ref={messagesEndRef} className="h-10" />
            </div>
          </div>

          {/* Floating Input Box */}
          <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-white via-white dark:from-[#0a0a0f] dark:via-[#0a0a0f] to-transparent pt-10 pb-8 px-6 z-20 pointer-events-none">
            <div className="max-w-4xl mx-auto pointer-events-auto">
              <ChatInput />
            </div>
          </div>
        </div>

        {/* Right Side Partition (Dynamic) */}
        <AnimatePresence mode="wait">
          {isRightPanelOpen && (
            <motion.div
              key={state.voiceMode.isOpen ? 'voice' : 'toolkit'}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="flex-shrink-0 h-full border-l border-slate-100 dark:border-slate-800/60 overflow-hidden"
            >
              <div className="w-[380px] xl:w-[480px] h-full p-4 pl-0">
                <div className="h-full bg-white dark:bg-[#0d1017]/40 rounded-[32px] border border-slate-200/50 dark:border-white/10 shadow-2xl overflow-hidden backdrop-blur-md">
                   {state.voiceMode.isOpen ? (
                     <VoiceMode onClose={() => setVoiceModeOpen(false)} />
                   ) : (
                     <StudyToolkitRight />
                   )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      </div>
    </div>
  );
}
