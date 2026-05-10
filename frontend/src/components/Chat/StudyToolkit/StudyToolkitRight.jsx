import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, Sparkles, BookOpen, AlertCircle, Zap, RefreshCw, 
  Layers, HelpCircle, FileText, X, Copy, ExternalLink, 
  Check, PlayCircle, MessageSquare
} from 'lucide-react';
import { useApp } from '../../../hooks/useApp';

export default function StudyToolkitRight() {
  const { state, generateStudyToolkit, dispatch } = useApp();
  const { isOpen, isLoading, data, error } = state.studyToolkit;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="h-full w-full"
        >
          <div className="h-full bg-white dark:bg-[#0a0a0f] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/10">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Study Toolkit</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest opacity-60">Intelligence Active</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => generateStudyToolkit()}
                  disabled={isLoading}
                  className={`p-2 rounded-xl transition-all ${isLoading ? 'opacity-50' : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-orange-500'}`}
                  title="Refresh Insights"
                >
                  <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={() => dispatch({ type: 'SET_STUDY_TOOLKIT', payload: { isOpen: false } })}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                  title="Close Toolkit"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <LoadingSkeleton key="loading" />
                ) : error ? (
                  <motion.div 
                    key="error"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-full flex flex-col items-center justify-center text-center p-8"
                  >
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                      <AlertCircle size={32} className="text-red-500" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Analysis Failed</p>
                    <p className="text-[11px] text-slate-500 mb-8 leading-relaxed max-w-[200px]">
                      Study insights couldn't load right now. This might be due to a complex document structure.
                    </p>
                    <button 
                      onClick={() => generateStudyToolkit()}
                      className="px-6 py-3 bg-orange-600 text-white text-[11px] font-black uppercase tracking-[0.15em] rounded-2xl hover:bg-orange-500 shadow-xl shadow-orange-600/20 transition-all flex items-center gap-2"
                    >
                      <RefreshCw size={14} />
                      Retry Analysis
                    </button>
                  </motion.div>
                ) : data ? (
                  <motion.div 
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    {data.keyConcepts?.length > 0 && (
                      <div id="toolkit-keyConcepts">
                        <ToolkitSection 
                          icon={<Layers size={14} className="text-blue-500" />} 
                          title="Key Concepts" 
                          isOpen={true}
                        >
                          <div className="space-y-2">
                            {data.keyConcepts.map((item, i) => (
                              <ConceptItem key={i} text={item} color="bg-blue-500" />
                            ))}
                          </div>
                        </ToolkitSection>
                      </div>
                    )}

                    {data.definitions?.length > 0 && (
                      <div id="toolkit-definitions">
                        <ToolkitSection 
                          icon={<BookOpen size={14} className="text-purple-500" />} 
                          title="Definitions"
                        >
                          <div className="space-y-3">
                            {data.definitions.map((item, i) => (
                              <DefinitionItem key={i} term={item.term} definition={item.definition} />
                            ))}
                          </div>
                        </ToolkitSection>
                      </div>
                    )}

                    {data.flashcards?.length > 0 && (
                      <div id="toolkit-flashcards">
                        <ToolkitSection 
                          icon={<Zap size={14} className="text-amber-500" />} 
                          title="Quick Flashcards"
                        >
                          <div className="grid grid-cols-1 gap-3">
                            {data.flashcards.slice(0, 5).map((card, i) => (
                              <FlashcardItem key={i} card={card} />
                            ))}
                          </div>
                        </ToolkitSection>
                      </div>
                    )}

                    {data.examQuestions?.length > 0 && (
                      <div id="toolkit-examQuestions">
                        <ToolkitSection 
                          icon={<HelpCircle size={14} className="text-orange-500" />} 
                          title="Practice Questions"
                        >
                          <div className="space-y-3">
                            {data.examQuestions.map((item, i) => (
                              <PracticeQuestion key={i} index={i} text={item} />
                            ))}
                          </div>
                        </ToolkitSection>
                      </div>
                    )}

                    {data.revisionNotes?.length > 0 && (
                      <div id="toolkit-revisionNotes">
                        <ToolkitSection 
                          icon={<FileText size={14} className="text-green-500" />} 
                          title="Revision Notes"
                        >
                          <div className="space-y-4">
                            {data.revisionNotes.map((note, i) => (
                              <NoteItem key={i} text={note} />
                            ))}
                          </div>
                        </ToolkitSection>
                      </div>
                    )}

                    {data.miniQuiz?.length > 0 && (
                      <div id="toolkit-miniQuiz">
                        <ToolkitSection 
                          icon={<PlayCircle size={14} className="text-indigo-500" />} 
                          title="Instant Mini Quiz"
                          isOpen={true}
                        >
                          <QuizInterface questions={data.miniQuiz} />
                        </ToolkitSection>
                      </div>
                    )}

                    <div className="pt-6 pb-4">
                      <button 
                        onClick={() => generateStudyToolkit()}
                        className="w-full py-4 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-orange-500/10 hover:text-orange-500 transition-all flex items-center justify-center gap-2 border border-dashed border-slate-200 dark:border-white/10"
                      >
                        <RefreshCw size={12} />
                        Re-Analyze Content
                      </button>
                    </div>
                  </motion.div>
                ) : (
                   <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-20">
                      <Sparkles size={40} className="mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No intelligence curated yet</p>
                   </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 p-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse" />
             <div className="h-4 w-32 bg-slate-100 dark:bg-white/5 rounded-full animate-pulse" />
          </div>
          <div className="space-y-3 ml-11">
             <div className="h-3 w-full bg-slate-50 dark:bg-white/[0.02] rounded-full animate-pulse" />
             <div className="h-3 w-[90%] bg-slate-50 dark:bg-white/[0.02] rounded-full animate-pulse" />
          </div>
        </div>
      ))}
      <div className="mt-12 flex flex-col items-center justify-center p-8 bg-slate-50/50 dark:bg-white/[0.02] rounded-[32px] border border-dashed border-slate-200 dark:border-white/5">
         <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
            <Sparkles className="absolute inset-0 m-auto text-orange-500 animate-pulse" size={16} />
         </div>
         <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Synthesizing PDF Data</p>
      </div>
    </div>
  );
}

function ToolkitSection({ icon, title, children, isOpen = false }) {
  return (
    <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-[24px] overflow-hidden transition-all hover:border-orange-500/20 group/section">
      <details className="group" open={isOpen}>
        <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center transition-colors group-hover:bg-white dark:group-hover:bg-white/10 shadow-sm group-hover:shadow-md">
               {icon}
            </div>
            <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-[0.15em]">{title}</span>
          </div>
          <ChevronDown size={14} className="text-slate-400 group-open:rotate-180 transition-transform" />
        </summary>
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-5 pb-6"
        >
          {children}
        </motion.div>
      </details>
    </div>
  );
}

function ConceptItem({ text, color }) {
  const { requestExplainSimply, showNotification } = useApp();
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.preventDefault();
    navigator.clipboard.writeText(text);
    setCopied(true);
    showNotification('Concept copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group flex gap-3 items-center p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
      <div className={`w-1.5 h-1.5 ${color} rounded-full flex-shrink-0 shadow-lg`} />
      <p className="flex-1 text-[12px] text-slate-600 dark:text-slate-300 font-bold tracking-tight">
        {typeof text === 'string' ? text : JSON.stringify(text)}
      </p>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => requestExplainSimply(text)}
          className="p-1.5 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-orange-500/10 transition-all"
          title="Explain this concept"
        >
          <MessageSquare size={12} />
        </button>
        <button 
          onClick={handleCopy}
          className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-500/10 transition-all"
        >
          {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
}

function DefinitionItem({ term, definition }) {
  const { showNotification } = useApp();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${term}: ${definition}`);
    setCopied(true);
    showNotification('Definition copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-transparent hover:border-purple-500/20 transition-all relative">
      <div className="flex justify-between items-start mb-1.5">
        <span className="text-[10px] font-black text-purple-500 dark:text-purple-400 uppercase tracking-widest">{term}</span>
        <button 
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-purple-500"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
      <p className="text-[12px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{definition}</p>
    </div>
  );
}

function FlashcardItem({ card }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="relative h-32 perspective-1000 cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div 
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
        className="w-full h-full relative preserve-3d"
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 rounded-2xl p-5 flex flex-col justify-center [backface-visibility:hidden]">
          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2 opacity-60">Question</p>
          <p className="text-[13px] text-slate-700 dark:text-slate-200 font-bold leading-snug">"{card.front}"</p>
        </div>
        {/* Back */}
        <div className="absolute inset-0 backface-hidden bg-amber-500/20 dark:bg-amber-500/20 border border-amber-500/30 rounded-2xl p-5 flex flex-col justify-center [transform:rotateY(180deg)] [backface-visibility:hidden]">
          <p className="text-[9px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest mb-2 opacity-60 text-center">Answer</p>
          <p className="text-[12px] text-slate-800 dark:text-white font-bold text-center leading-relaxed">{card.back}</p>
        </div>
      </motion.div>
    </div>
  );
}

function PracticeQuestion({ index, text }) {
  const { sendChatMessage, showNotification } = useApp();

  const askAbout = () => {
    sendChatMessage(`Answer this practice question: ${text}`);
    showNotification('AI is answering your question...', 'info');
  };

  return (
    <div className="group flex gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-all border border-transparent hover:border-orange-500/20">
      <div className="w-6 h-6 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 text-[10px] font-black flex-shrink-0">{index + 1}</div>
      <p className="flex-1 text-[12px] text-slate-600 dark:text-slate-300 font-bold leading-snug">
        {typeof text === 'string' ? text : JSON.stringify(text)}
      </p>
      <button 
        onClick={askAbout}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-orange-500 hover:bg-orange-500/10 rounded-lg"
        title="Ask AI to answer"
      >
        <ExternalLink size={12} />
      </button>
    </div>
  );
}

function NoteItem({ text }) {
  return (
    <div className="flex gap-4 items-start group">
      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0 shadow-lg shadow-green-500/40 group-hover:scale-150 transition-transform" />
      <p className="text-[12px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{text}</p>
    </div>
  );
}

function QuizInterface({ questions }) {
  const [currentIdx, setCurrentIdx] = React.useState(-1);
  const [answers, setAnswers] = React.useState({});
  const [showResult, setShowResult] = React.useState(false);

  const startQuiz = () => setCurrentIdx(0);
  
  const handleAnswer = (optionIdx) => {
    if (answers[currentIdx] !== undefined) return;
    setAnswers({ ...answers, [currentIdx]: optionIdx });
    
    setTimeout(() => {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(currentIdx + 1);
      } else {
        setShowResult(true);
      }
    }, 2000);
  };

  const reset = () => {
    setCurrentIdx(-1);
    setAnswers({});
    setShowResult(false);
  };

  if (showResult) {
    const score = Object.entries(answers).reduce((acc, [idx, ans]) => 
      ans === questions[idx].correct ? acc + 1 : acc, 0);
    
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-8 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[32px] text-center text-white shadow-2xl shadow-indigo-500/30">
          <Sparkles size={40} className="mx-auto mb-4 text-indigo-200" />
          <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-2 text-indigo-100 opacity-80">Final Score</h4>
          <p className="text-5xl font-black mb-6">{score} <span className="text-xl opacity-40">/ {questions.length}</span></p>
          <button onClick={reset} className="w-full py-4 bg-white text-indigo-600 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-50 shadow-xl transition-all active:scale-[0.98]">
            Restart Quiz
          </button>
        </div>

        <div className="space-y-4">
          <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Review Answers</h5>
          {questions.map((q, i) => {
            const userAns = answers[i];
            const isUserCorrect = userAns === q.correct;
            
            return (
              <div key={i} className="p-5 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[24px] space-y-3">
                <div className="flex justify-between items-start">
                   <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 leading-snug flex-1 pr-4">{q.question}</p>
                   {isUserCorrect ? (
                     <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 flex-shrink-0">
                        <Check size={12} />
                     </div>
                   ) : (
                     <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 flex-shrink-0">
                        <X size={12} />
                     </div>
                   )}
                </div>
                <div className="space-y-2 pt-1">
                   <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <span className="text-[9px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest block mb-1">Correct Answer</span>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 font-bold">
                        {q.options && q.options[q.correct] ? q.options[q.correct] : 'Right answer'}
                      </p>
                   </div>
                   {!isUserCorrect && (
                      <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                        <span className="text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest block mb-1">Your Answer</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium italic">{q.options[userAns]}</p>
                      </div>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (currentIdx === -1) {
    return (
      <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl text-center">
        <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-4">{questions.length} Questions Prepared</p>
        <button onClick={startQuiz} className="w-full py-4 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all">
          Start Challenge
        </button>
      </div>
    );
  }

  const q = questions[currentIdx];
  const selected = answers[currentIdx];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Question {currentIdx + 1}/{questions.length}</span>
        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentIdx ? 'w-6 bg-indigo-500' : i < currentIdx ? 'w-2 bg-indigo-200' : 'w-1.5 bg-slate-200 dark:bg-white/10'}`} />
          ))}
        </div>
      </div>
      
      <p className="text-[14px] font-bold text-slate-800 dark:text-slate-100 leading-snug mb-4">{q.question}</p>
      
      <div className="space-y-2.5">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correct;
          const isSelected = selected === i;
          let variant = 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-700 dark:text-slate-300';
          
          if (selected !== undefined) {
            if (isCorrect) {
              variant = 'bg-green-500 text-white border-green-600 shadow-lg shadow-green-500/20 scale-[1.02]';
            } else if (isSelected) {
              variant = 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/20';
            } else {
              variant = 'opacity-30 bg-slate-50 dark:bg-white/5 border-transparent';
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={selected !== undefined}
              className={`w-full p-4 rounded-2xl border text-left text-[12px] font-bold transition-all relative flex items-center justify-between ${variant} ${selected === undefined ? 'hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-500/30' : ''}`}
            >
              <span>{opt}</span>
              {selected !== undefined && isCorrect && <Check size={14} className="text-white" />}
            </button>
          );
        })}
      </div>
      
      {selected !== undefined && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }} 
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl mt-4 border border-slate-100 dark:border-white/5"
        >
          <div className="flex items-center gap-2 mb-1.5">
             <HelpCircle size={10} className="text-slate-400" />
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Explanation</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            {q.explanation}
          </p>
        </motion.div>
      )}
    </div>
  );
}
