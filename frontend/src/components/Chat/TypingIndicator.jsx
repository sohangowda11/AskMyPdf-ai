import React from 'react';
import { motion } from 'framer-motion';

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-2">
      <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M7 4h10a2 2 0 012 2v3l3 3-3 3v5a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" fill="#1a1a2e"/>
        </svg>
      </div>
      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-soft">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-gray-400 rounded-full"
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
