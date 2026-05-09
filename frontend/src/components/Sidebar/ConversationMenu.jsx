import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Trash2, Pin, Edit3, X } from 'lucide-react';
import { useApp } from '../../hooks/useApp';

export default function ConversationMenu({ conversation, onOpenChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const { renameConversation, togglePinConversation, removeConversation } = useApp();
  const menuRef = useRef(null);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleRename = (e) => {
    e.stopPropagation();
    const newTitle = window.prompt('Rename PDF', conversation.title);
    if (newTitle && newTitle.trim() !== conversation.title) {
      renameConversation(conversation.conversation_id, newTitle.trim());
    }
    setIsOpen(false);
  };

  const handlePin = (e) => {
    e.stopPropagation();
    togglePinConversation(conversation.conversation_id);
    setIsOpen(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this PDF and its history?')) {
      removeConversation(conversation.conversation_id);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-1 rounded-lg transition-all ${
          isOpen ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600' : 'text-slate-300 dark:text-slate-700 hover:text-slate-500 group-hover:opacity-100 opacity-0'
        }`}
      >
        <MoreVertical size={16} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            className="absolute right-0 top-8 w-44 bg-white dark:bg-[#1b1f2a] border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] overflow-hidden p-1.5"
          >
            <button
              onClick={handleRename}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl transition-all"
            >
              <Edit3 size={14} className="text-slate-400" />
              Rename
            </button>
            <button
              onClick={handlePin}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl transition-all"
            >
              <Pin size={14} className={conversation.pinned ? "text-orange-500 fill-orange-500" : "text-slate-400"} />
              {conversation.pinned ? 'Unpin' : 'Pin to Top'}
            </button>
            <div className="h-px bg-slate-50 dark:bg-slate-800/40 my-1 mx-2" />
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
