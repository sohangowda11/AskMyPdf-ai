import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function AuthForms({ type = 'login', onSwitch, inline = false }) {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(type === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    setIsLogin(type === 'login');
  }, [type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    console.log(`>>> [AUTH REQUEST] Starting ${isLogin ? 'login' : 'signup'} flow for:`, email);
    
    try {
      const response = isLogin 
        ? await signIn({ email, password })
        : await signUp({ email, password });
        
      console.log(">>> [AUTH REQUEST] Raw response from Supabase:", response);
      
      const { error: authError, data } = response;
        
      if (authError) {
        console.error(">>> [AUTH ERROR] Supabase returned error:", authError);
        console.error(">>> [AUTH ERROR DETAILS] Message:", authError.message, "Status:", authError.status);
        
        let errorMessage = "Authentication failed.";
        
        if (authError.message === 'Failed to fetch') {
          errorMessage = "Network failure or Auth service unavailable. Please check your connection.";
          if (!import.meta.env.VITE_SUPABASE_URL) {
            errorMessage = "Missing Supabase URL in frontend configuration.";
          }
        } else if (authError.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password.";
        } else if (authError.message.includes("Email not confirmed")) {
          errorMessage = "Please confirm your email address before logging in.";
        } else if (authError.message.includes("API key")) {
          errorMessage = "Missing or invalid Supabase API key.";
        } else {
          errorMessage = authError.message;
        }
        
        throw new Error(errorMessage);
      }
      
      console.log(">>> [AUTH SUCCESS] Authentication successful!", data);
    } catch (err) {
      console.error(">>> [AUTH CATCH] Error caught in UI:", err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full max-w-md mx-auto ${inline ? '' : 'p-10 rounded-[40px] bg-white dark:bg-[#0a0a0f] border border-slate-100 dark:border-white/5 shadow-2xl'}`}
    >
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight mb-2">
          {isLogin ? 'Sign In' : 'Get Started'}
        </h2>
        <p className="text-sm opacity-50">
          {isLogin ? 'Enter your details to access your workspace' : 'Create your account to start researching'}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-semibold"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>


      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Email Address</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={16} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none text-sm font-medium"
              placeholder="name@example.com"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Password</label>
            {isLogin && <button type="button" className="text-[10px] font-bold text-orange-500 hover:text-orange-600 uppercase tracking-widest transition-colors">Forgot?</button>}
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={16} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none text-sm font-medium"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {isLogin && (
          <div className="flex items-center gap-2 px-1">
            <input 
              type="checkbox" 
              id="remember" 
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-200 dark:border-white/10 bg-transparent text-orange-600 focus:ring-orange-500/20" 
            />
            <label htmlFor="remember" className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Remember me</label>
          </div>
        )}

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full py-4 rounded-xl bg-[#0f1117] dark:bg-white text-white dark:text-black font-bold text-xs uppercase tracking-[0.2em] shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-t-transparent border-current rounded-full animate-spin" />
          ) : (
            <>
              {isLogin ? 'Sign In' : 'Create Account'}
              <ArrowRight size={18} />
            </>
          )}
        </motion.button>
      </form>

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={() => {
            if (onSwitch) onSwitch();
            else setIsLogin(!isLogin);
            setError(null);
          }}
          className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-orange-600 dark:hover:text-orange-500 transition-all"
        >
          {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign In"}
        </button>
      </div>
    </motion.div>
  );

  if (inline) return content;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#050505] p-8">
      {content}
    </div>
  );
}
