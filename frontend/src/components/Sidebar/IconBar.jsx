import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Upload,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../hooks/useApp';

export default function IconBar() {
  const { dispatch, uploadDocument } = useApp();
  const fileInputRef = useRef(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      await uploadDocument(file);
    }
    e.target.value = '';
  };

  const icons = [
    { icon: MessageSquare, label: 'Chat', action: () => {} },
    { icon: Upload, label: 'Upload', action: handleUploadClick },
  ];

  return (
    <div className="w-20 bg-white border-r border-slate-100 flex flex-col items-center py-8 flex-shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Premium Logo */}
      <motion.div
        className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center mb-10 cursor-pointer shadow-lg shadow-orange-100"
        whileHover={{ scale: 1.05, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
      >
        <Sparkles size={24} className="text-white" />
      </motion.div>

      {/* Navigation Icons */}
      <div className="flex flex-col items-center gap-4">
        {icons.map(({ icon: Icon, label, action }) => (
          <motion.button
            key={label}
            onClick={action}
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-all duration-300 relative group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Icon size={22} />
            <span className="absolute left-16 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none uppercase tracking-wider">
              {label}
            </span>
          </motion.button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
