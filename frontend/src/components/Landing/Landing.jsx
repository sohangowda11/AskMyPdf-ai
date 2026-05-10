import React, { useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, Sparkles, Sun, Moon } from 'lucide-react';
import { useApp } from '../../hooks/useApp';
import InteractiveHeroBackground from './InteractiveHeroBackground';

export default function Landing() {
  const { state, dispatch, uploadDocument, isUploading } = useApp();
  const [isHovered, setIsHovered] = useState(false);
  const isDark = state.theme === 'dark';
  
  // Mouse Tracking for Parallax/Tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Subtle springs for premium, stable feel
  const springConfig = { damping: 40, stiffness: 100, mass: 1 };
  const rotateX = useSpring(useTransform(mouseY, [-400, 400], [5, -5]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-400, 400], [-5, 5]), springConfig);
  
  const textX = useSpring(useTransform(mouseX, [-400, 400], [-8, 8]), springConfig);
  const textY = useSpring(useTransform(mouseY, [-400, 400], [-8, 8]), springConfig);

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const centerX = innerWidth / 2;
      const centerY = innerHeight / 2;
      mouseX.set(clientX - centerX);
      mouseY.set(clientY - centerY);
    };
    
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [mouseX, mouseY]);

  const toggleTheme = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles?.length > 0) {
      uploadDocument(acceptedFiles[0]);
    }
  }, [uploadDocument]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled: isUploading
  });

  return (
    <div 
      className={`min-h-screen w-full relative flex flex-col items-center py-20 px-8 overflow-x-hidden transition-colors duration-700 selection:bg-orange-500/30 ${
        isDark ? 'bg-[#050505] text-white selection:text-orange-200' : 'bg-[#fdfcfb] text-slate-900 selection:text-orange-900'
      }`}
    >
      {/* Intelligent Particle Background */}
      <InteractiveHeroBackground />

      {/* Top Right Theme Toggle */}
      <div className="absolute top-8 right-8 z-[100]">
        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl ${
            isDark 
              ? 'bg-white/5 border border-white/10 text-orange-400 hover:bg-white/10' 
              : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          <AnimatePresence mode="wait">
            {isDark ? (
              <motion.div key="moon" initial={{ opacity: 0, rotate: -20 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 20 }}>
                <Moon size={20} />
              </motion.div>
            ) : (
              <motion.div key="sun" initial={{ opacity: 0, rotate: -20 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 20 }}>
                <Sun size={20} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <div className="max-w-6xl mx-auto flex flex-col items-center relative z-10 w-full mt-auto mb-auto">
        {/* Hero Section */}
        <motion.div
          style={{ x: textX, y: textY }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center w-full mb-12"
        >

          <h1 className={`text-6xl md:text-8xl font-black leading-[0.95] tracking-tighter mb-10 transition-colors duration-700 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Stop Reading PDFs.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300">
              Start Talking To Them.
            </span>
          </h1>
          <p className={`text-lg md:text-xl font-medium leading-[1.8] max-w-3xl mx-auto tracking-wide transition-colors duration-700 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Upload any document and unlock instant <span className={isDark ? 'text-white' : 'text-slate-900'}>answers</span>, 
            automated <span className={isDark ? 'text-white' : 'text-slate-900'}>summaries</span>, and deep <span className={isDark ? 'text-white' : 'text-slate-900'}>AI-powered insights</span> 
            in a single, unified research workspace.
          </p>
        </motion.div>

        {/* Minimalist Upload Card */}
        <motion.div
          style={{ 
            rotateX, 
            rotateY,
            transformStyle: "preserve-3d"
          }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="w-full max-w-lg relative"
        >
          <div 
            {...getRootProps()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`relative h-[320px] backdrop-blur-3xl border-2 rounded-[40px] p-8 flex flex-col items-center justify-center text-center transition-all duration-700 cursor-pointer overflow-hidden ${
              isDragActive ? 'border-orange-500 bg-orange-600/5 shadow-[0_0_50px_rgba(234,88,12,0.1)]' : 
              isHovered ? (isDark ? 'border-orange-500/40 bg-white/5' : 'border-orange-500/40 bg-orange-50/30') : 
              (isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-100 shadow-xl shadow-slate-200/50')
            }`}
          >
            <input {...getInputProps()} />
            
            <motion.div 
              animate={{ 
                y: isHovered ? -10 : 0,
                scale: isHovered ? 1.05 : 1
              }}
              className={`w-20 h-20 rounded-[24px] flex items-center justify-center text-white mb-8 shadow-2xl transition-all duration-700 ${
                isDark ? 'bg-orange-600 shadow-orange-950/40 border border-orange-400/20' : 'bg-slate-900 shadow-slate-900/20'
              }`}
            >
              <Upload size={28} />
            </motion.div>

            <h3 className={`text-2xl font-black mb-2 tracking-tighter transition-colors duration-700 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isDragActive ? 'Synchronize File' : 'Drop Research PDF'}
            </h3>
            <p className={`text-[10px] font-black uppercase tracking-[0.5em] transition-colors duration-700 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              Drag & Drop to Start
            </p>

            {isUploading && (
              <div className={`absolute inset-0 backdrop-blur-2xl rounded-[40px] flex flex-col items-center justify-center z-50 px-10 text-center transition-colors duration-700 ${isDark ? 'bg-[#050505]/98' : 'bg-white/98'}`}>
                 <div className="relative mb-6">
                    <div className={`w-16 h-16 border-2 rounded-full animate-spin ${isDark ? 'border-white/5 border-t-orange-600' : 'border-slate-100 border-t-slate-900'}`} />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <span className="text-[10px] font-black">{state.uploadProgress}%</span>
                    </div>
                 </div>
                 
                 <h4 className={`text-lg font-black tracking-tighter mb-4 transition-colors duration-700 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                   {state.uploadProgress < 100 ? 'Uploading Research Data...' : 'Synchronizing Knowledge...'}
                 </h4>

                 {/* Progress Bar */}
                 <div className={`w-full h-1.5 rounded-full overflow-hidden mb-6 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${state.uploadProgress}%` }}
                      className="h-full bg-gradient-to-r from-orange-600 to-amber-500 shadow-[0_0_10px_rgba(234,88,12,0.5)]"
                    />
                 </div>

                 <div className="flex gap-2">
                    <div className={`w-1 h-1 rounded-full animate-bounce ${isDark ? 'bg-orange-600' : 'bg-slate-900'}`} style={{ animationDelay: '0ms' }} />
                    <div className={`w-1 h-1 rounded-full animate-bounce ${isDark ? 'bg-orange-600' : 'bg-slate-900'}`} style={{ animationDelay: '200ms' }} />
                    <div className={`w-1 h-1 rounded-full animate-bounce ${isDark ? 'bg-orange-600' : 'bg-slate-900'}`} style={{ animationDelay: '400ms' }} />
                 </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Subtle Footer Credit */}
      <div className="absolute bottom-10 left-0 w-full text-center pointer-events-none opacity-40">
         <p className={`text-[8px] font-black uppercase tracking-[1em] transition-colors duration-700 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
           Ambient Intelligence System v2.0
         </p>
      </div>
    </div>
  );
}
