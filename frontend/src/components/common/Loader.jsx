import React from 'react';
import { motion } from 'framer-motion';

export default function Loader({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <motion.div
        className="w-10 h-10 border-3 border-accent/30 border-t-accent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <p className="text-xs text-gray-400 font-medium">{text}</p>
    </div>
  );
}
