import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from './hooks/useApp';
import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/Header/Header';
import PDFViewer from './components/PDFViewer/PDFViewer';
import ChatPanel from './components/Chat/ChatPanel';
import Modal from './components/common/Modal';
import Landing from './components/Landing/Landing';
import ErrorBoundary from './components/common/ErrorBoundary';
import { CheckCircle, XCircle, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

function QuizModal() {
  const { state, dispatch } = useApp();
  const [selected, setSelected] = useState({});
  const [showResults, setShowResults] = useState(false);

  if (!state.quizData) return null;

  const handleSelect = (qIndex, oIndex) => {
    if (showResults) return;
    setSelected((prev) => ({ ...prev, [qIndex]: oIndex }));
  };

  const score = state.quizData.reduce((acc, q, i) => {
    return acc + (selected[i] === q.correct ? 1 : 0);
  }, 0);

  return (
    <Modal
      isOpen={state.quizOpen}
      onClose={() => {
        dispatch({ type: 'CLOSE_QUIZ' });
        setShowResults(false);
        setSelected({});
      }}
      title="📝 Document Quiz"
    >
      <div className="space-y-8">
        {state.quizData.map((q, qIndex) => (
          <div key={qIndex} className="space-y-4">
            <p className="text-sm font-black text-slate-900 dark:text-white leading-relaxed">
              {qIndex + 1}. {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((option, oIndex) => {
                const isSelected = selected[qIndex] === oIndex;
                const isCorrect = q.correct === oIndex;
                let borderColor = 'border-slate-100 dark:border-slate-800';
                let bgColor = 'bg-white dark:bg-[#1b1f2a]';
                let textColor = 'text-slate-700 dark:text-slate-300';

                if (showResults) {
                  if (isCorrect) {
                    borderColor = 'border-green-500 bg-green-50 dark:bg-green-500/10';
                    textColor = 'text-green-700 dark:text-green-400';
                  } else if (isSelected) {
                    borderColor = 'border-red-500 bg-red-50 dark:border-red-500/10';
                    textColor = 'text-red-700 dark:text-red-400';
                  }
                } else if (isSelected) {
                  borderColor = 'border-orange-600 bg-orange-50 dark:bg-orange-500/5';
                  textColor = 'text-orange-600 dark:text-orange-400';
                }

                return (
                  <button
                    key={oIndex}
                    onClick={() => handleSelect(qIndex, oIndex)}
                    className={`w-full text-left px-5 py-3.5 rounded-2xl border ${borderColor} ${bgColor} ${textColor} text-[13px] font-bold transition-all flex items-center gap-4`}
                  >
                    <span className="w-7 h-7 rounded-xl border border-inherit flex items-center justify-center text-[10px] font-black opacity-60">
                      {String.fromCharCode(65 + oIndex)}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-8 border-t border-slate-50 dark:border-slate-800">
          {showResults ? (
            <p className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">
              Score: {score}/{state.quizData.length}
            </p>
          ) : (
            <button
              onClick={() => setShowResults(true)}
              disabled={Object.keys(selected).length < state.quizData.length}
              className="px-8 py-3 bg-orange-600 text-white text-[11px] font-black rounded-xl shadow-lg shadow-orange-900/10 disabled:opacity-30 uppercase tracking-[0.2em] transition-all"
            >
              Check Answers
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function NotificationToast() {
  const { state, dispatch } = useApp();
  
  useEffect(() => {
    if (state.notification) {
      const timer = setTimeout(() => {
        dispatch({ type: 'SET_NOTIFICATION', payload: null });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.notification, dispatch]);

  if (!state.notification) return null;

  return (
    <motion.div
      className={`fixed top-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-3xl shadow-3xl flex items-center gap-4 border backdrop-blur-xl ${
        state.notification.type === 'error' 
          ? 'bg-red-500 text-white border-red-600 shadow-red-500/20' 
          : 'bg-white dark:bg-[#1b1f2a] border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100'
      }`}
      initial={{ opacity: 0, y: -40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.9 }}
    >
      <div className={`w-2.5 h-2.5 rounded-full ${state.notification.type === 'error' ? 'bg-white' : 'bg-green-500'} animate-pulse`} />
      <span className="text-[11px] font-black uppercase tracking-[0.2em]">{state.notification.message}</span>
    </motion.div>
  );
}

const ResizeHandle = ({ onDrag, vertical = false }) => (
  <div
    onMouseDown={(e) => {
      const startPos = vertical ? e.clientY : e.clientX;
      const onMouseMove = (moveEvent) => {
        const delta = (vertical ? moveEvent.clientY : moveEvent.clientX) - startPos;
        onDrag(delta);
      };
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'default';
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = vertical ? 'row-resize' : 'col-resize';
    }}
    className={`group relative flex-shrink-0 z-50 ${vertical ? 'h-0.5 w-full' : 'w-0.5 h-full'} cursor-pointer`}
  >
    <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800/40 group-hover:bg-orange-500/40 transition-colors" />
  </div>
);

import { Routes, Route, useNavigate } from 'react-router-dom';
import DedicatedChatPage from './components/Chat/DedicatedChatPage';
import UtilityPanel from './components/common/UtilityPanel';

export default function App() {
  const { state, fetchHistory } = useApp();
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [chatWidth, setChatWidth] = useState(480);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const Workspace = () => (
    <div className="flex-1 flex overflow-hidden">
      <div style={{ width: sidebarWidth }} className="flex-shrink-0 h-full">
         <Sidebar />
      </div>
      <ResizeHandle onDrag={(d) => setSidebarWidth(w => Math.max(240, Math.min(400, w + d)))} />

      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0a0a0f]">
        <Header />
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div className="flex-1 min-w-0"><PDFViewer /></div>
          <ResizeHandle onDrag={(d) => setChatWidth(w => Math.max(380, Math.min(800, w - d)))} />
          <div style={{ width: chatWidth }} className="flex-shrink-0"><ChatPanel /></div>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="h-screen flex overflow-hidden bg-white dark:bg-[#0f1117] transition-colors duration-500">
        <AnimatePresence mode="wait">
          {!state.isWorkspaceActive ? (
            <Landing key="landing" />
          ) : (
            <motion.div 
              key="workspace-container"
              className="flex-1 flex overflow-hidden w-full h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
               <Routes>
                 <Route path="/" element={<Workspace />} />
                 <Route path="/chat/:conversationId" element={<DedicatedChatPage />} />
               </Routes>
               
               <AnimatePresence>
                 {state.utilityPanel.isOpen && <UtilityPanel />}
               </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <QuizModal />
        <NotificationToast />
      </div>
    </ErrorBoundary>
  );
}
