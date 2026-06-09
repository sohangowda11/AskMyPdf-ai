import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, Sparkles, Sun, Moon, BookOpen, Zap, Layers, Mic, 
  Terminal, Shield, ArrowRight, Cpu, MessageSquare, 
  Search, FileText, GraduationCap, CheckCircle2, User, Brain, Rocket
} from 'lucide-react';
import { useApp } from '../../hooks/useApp';
import InteractiveHeroBackground from './InteractiveHeroBackground';
import AuthForms from '../Auth/AuthForms';

// --- HELPER COMPONENTS ---

const Section = ({ children, className = "" }) => (
  <section className={`w-full relative flex flex-col items-center py-24 md:py-32 px-6 md:px-12 ${className}`}>
    <div className="w-full max-w-7xl mx-auto">
      {children}
    </div>
  </section>
);

const FeatureCard = ({ icon, title, desc, isDark, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    className={`p-10 rounded-[32px] border transition-all duration-500 hover:shadow-xl ${
      isDark 
        ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]' 
        : 'bg-white border-slate-100 hover:shadow-slate-200/50'
    }`}
  >
    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-8">
      {icon}
    </div>
    <h4 className="text-xl font-bold mb-4 tracking-tight">{title}</h4>
    <p className="text-base opacity-50 leading-relaxed">{desc}</p>
  </motion.div>
);

// --- MAIN PAGE ---

export default function Landing({ mode = 'onboarding' }) {
  const { state, dispatch, uploadDocument, isUploading } = useApp();
  const isDark = state.theme === 'dark';
  const [authType, setAuthType] = useState('login');
  
  const toggleTheme = () => dispatch({ type: 'TOGGLE_THEME' });
  
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles?.length > 0) uploadDocument(acceptedFiles[0]);
  }, [uploadDocument]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled: isUploading
  });

  const authControls = useAnimation();
  const scrollToAuth = async () => {
    const el = document.getElementById('auth-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Trigger attention-seeking pulse
      await authControls.start({
        scale: [1, 0.96, 1.02, 1],
        transition: { duration: 0.5, ease: "easeOut" }
      });
    }
  };

  return (
    <div className={`w-full relative flex flex-col items-center min-h-screen transition-colors duration-700 selection:bg-orange-500/30 ${
      isDark ? 'bg-[#050505] text-white' : 'bg-white text-slate-900'
    }`}>
      
      {/* Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <InteractiveHeroBackground />
      </div>

      {/* HEADER */}
      <nav className="fixed top-0 left-0 w-full z-[100] px-8 py-8 flex justify-between items-center max-w-7xl mx-auto left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-xl">
            <Terminal size={18} />
          </div>
          <span className="text-base font-bold tracking-tight uppercase">Ask My Pdf</span>
        </div>
        <motion.button 
          onClick={toggleTheme} 
          whileHover={{ scale: 1.05 }} 
          whileTap={{ scale: 0.95 }} 
          className="w-11 h-11 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center transition-colors hover:bg-white/10"
        >
          {isDark ? <Moon size={16} /> : <Sun size={16} />}
        </motion.button>
      </nav>

      {/* SECTION 1: HERO */}
      <Section className="pt-48 pb-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-500 text-[10px] font-bold uppercase tracking-widest">
              <Sparkles size={12} />
              AI-Powered Research Workspace
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight">
              Understand your documents <br/>
              <span className="text-orange-500">faster than ever.</span>
            </h1>
            <p className="text-xl md:text-2xl opacity-40 leading-relaxed max-w-lg">
              Unlock instant insights, summaries, and semantic answers from your PDFs with a professional AI workspace.
            </p>
            <div className="flex flex-wrap gap-5 pt-4">
               <motion.button 
                 onClick={scrollToAuth}
                 whileHover={{ scale: 1.02, y: -2 }} 
                 whileTap={{ scale: 0.98 }} 
                 className="px-10 py-5 bg-orange-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-orange-600/20 flex items-center gap-3 transition-transform"
               >
                 Get Started Free <ArrowRight size={18} />
               </motion.button>
            </div>
          </motion.div>

          <motion.div 
            id="auth-section"
            animate={authControls}
            initial={{ opacity: 0, scale: 0.98, x: 20 }}
            whileInView={{ opacity: 1, scale: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.1 }}
            className="relative"
          >
            <div className={`relative min-h-[500px] backdrop-blur-[80px] border rounded-[48px] shadow-2xl transition-all duration-1000 ${
              isDark ? 'bg-white/[0.02] border-white/5 shadow-black/50' : 'bg-white border-slate-100'
            }`}>
               <div className="relative p-12 h-full flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    {mode === 'auth' ? (
                      <motion.div key="auth" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                         <AuthForms type={authType} onSwitch={() => setAuthType(authType === 'login' ? 'signup' : 'login')} inline />
                      </motion.div>
                    ) : (
                      <motion.div key="upload" {...getRootProps()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center text-center cursor-pointer py-16 group">
                         <input {...getInputProps()} />
                         <motion.div className="w-24 h-24 rounded-3xl bg-orange-600 text-white flex items-center justify-center mb-10 shadow-lg shadow-orange-600/30">
                           <Upload size={32} />
                         </motion.div>
                         <h3 className="text-3xl font-bold mb-3 tracking-tight">Enter Workspace</h3>
                         <p className="text-sm opacity-30">Drop your PDF analysis source here</p>
                         {isUploading && (
                           <div className="absolute inset-0 backdrop-blur-3xl rounded-[48px] flex flex-col items-center justify-center z-50 bg-inherit/90">
                              <div className="w-12 h-12 border-4 border-t-orange-600 rounded-full animate-spin mb-6" />
                              <h4 className="text-lg font-bold">Synchronizing Intelligence...</h4>
                           </div>
                         )}
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* SECTION 2: FEATURES */}
      <Section>
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Built for Intelligence.</h2>
          <p className="text-lg opacity-40 max-w-xl mx-auto">High-performance research tools designed for the next generation of students and professionals.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { icon: <Zap size={22} />, title: "Neural Summaries", desc: "Instant extraction of technical logic and core takeaways from dense documents." },
            { icon: <Search size={22} />, title: "Semantic Search", desc: "Locate precise information nodes across dozens of files based on meaning, not just keywords." },
            { icon: <MessageSquare size={22} />, title: "AI Assistant", desc: "Interact with your source material naturally through a professional chat interface." },
            { icon: <Cpu size={22} />, title: "Context Aware", desc: "Our engine understands cross-references and complex structural relationships." },
            { icon: <Shield size={22} />, title: "Private & Secure", desc: "Enterprise-grade encryption for all your sensitive research data and documents." },
            { icon: <Layers size={22} />, title: "Global Sync", desc: "Access your entire research library and AI insights from any device, anywhere." }
          ].map((f, i) => (
            <FeatureCard key={i} {...f} isDark={isDark} delay={i * 0.1} />
          ))}
        </div>
      </Section>

      {/* SECTION 3: HOW IT WORKS */}
      <Section className="bg-slate-500/[0.02]">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">How AskMyPDF Works.</h2>
          <p className="text-lg opacity-40 max-w-xl mx-auto">From upload to understanding in seconds.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-12 lg:gap-6 relative">
          {[
            { step: "01", title: "Create Your Workspace", desc: "Sign in securely and access your personal AI study environment.", icon: <User size={24} /> },
            { step: "02", title: "Upload Your PDF", desc: "Upload notes, textbooks, research papers, question banks, resumes, reports, or any PDF document.", icon: <Upload size={24} /> },
            { step: "03", title: "AI Reads Everything", desc: "The system automatically extracts text, understands context, and prepares the document for analysis.", icon: <Brain size={24} /> },
            { step: "04", title: "Ask Questions", desc: "Chat naturally with your PDF just like ChatGPT and get instant answers from the document.", icon: <MessageSquare size={24} /> },
            { step: "05", title: "Generate Study Tools", desc: "Create summaries, quizzes, flashcards, key topics, and simplified explanations with one click.", icon: <Sparkles size={24} /> },
            { step: "06", title: "Learn Faster", desc: "Review previous conversations, revisit documents, and build a smarter study workflow.", icon: <Rocket size={24} /> }
          ].map((s, i, arr) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative flex flex-col items-center text-center group"
            >
              {/* Horizontal line for Desktop */}
              {i < arr.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[50%] w-[calc(100%+1.5rem)] h-[2px] bg-slate-200 dark:bg-slate-800 z-0 overflow-hidden">
                  <div className="h-full bg-orange-500/50 w-0 group-hover:w-full transition-all duration-700 ease-out" />
                </div>
              )}
              {/* Vertical line for Mobile */}
              {i < arr.length - 1 && (
                <div className="block lg:hidden absolute top-20 left-1/2 -translate-x-1/2 w-[2px] h-[calc(100%+3rem)] bg-slate-200 dark:bg-slate-800 z-0 overflow-hidden">
                   <div className="w-full bg-orange-500/50 h-0 group-hover:h-full transition-all duration-700 ease-out" />
                </div>
              )}

              {/* Icon Container */}
              <div className="relative z-10 w-20 h-20 rounded-3xl bg-white dark:bg-[#1b1f2a] border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-center text-orange-500 mb-6 group-hover:-translate-y-2 transition-transform duration-300 ease-out">
                <div className="absolute inset-0 rounded-3xl bg-orange-500/5 group-hover:bg-orange-500/10 transition-colors" />
                {s.icon}
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-900/20 border-2 border-white dark:border-[#0a0a0f] flex items-center justify-center text-[10px] font-black text-orange-600 dark:text-orange-400">
                  {s.step}
                </div>
              </div>

              <h4 className="text-lg font-bold mb-3 tracking-tight">{s.title}</h4>
              <p className="text-sm opacity-50 leading-relaxed px-2">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* SECTION 4: FINAL CTA */}
      <Section className="py-40">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className={`p-16 md:p-24 rounded-[48px] border text-center relative overflow-hidden ${
            isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-900 border-slate-800 text-white shadow-2xl shadow-slate-900/40'
          }`}
        >
          <div className="relative z-10 space-y-10">
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">Join the next generation <br/> of AI research.</h2>
            <div className="flex flex-col md:flex-row gap-5 justify-center items-center">
              <motion.button 
                onClick={scrollToAuth}
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }} 
                className="px-12 py-5 bg-orange-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-orange-600/30"
              >
                Initialize Session
              </motion.button>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* FOOTER */}
      <footer className="w-full py-20 border-t border-white/5 opacity-30 text-center">
         <p className="text-xs font-bold uppercase tracking-[1.5em] mb-4">Ask My Pdf</p>
         <div className="flex justify-center gap-10">
            {['Privacy', 'Legal', 'Research'].map(l => (
              <span key={l} className="text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:text-orange-500 transition-colors">{l}</span>
            ))}
         </div>
      </footer>
    </div>
  );
}
