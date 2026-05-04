/**
 * Chat Page - Yapay Zeka Asistanı ve İşlem Onaylamaları
 */

import React, { useState, useEffect } from 'react';
import { AIChatGPTPage } from '../components/AIChatGPT';
import { AIPendingApprovals } from '../components/AIPendingApprovals';
import { Sparkles, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

export function ChatPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'approvals'>('chat');
  const { t } = useLanguage();

  return (
    <div className="h-[calc(100dvh-4rem)] sm:h-dvh flex flex-col bg-background pb-20 lg:pb-0">
      {/* Header and Tabs */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 pt-3 sm:pt-6">
        <div className="px-3 sm:px-6 mb-4 flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Sparkles className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
              Akıllı Asistan
              <span className="px-1.5 sm:px-2 py-0.5 bg-white/20 rounded text-[10px] sm:text-xs font-normal">Yapay Zeka</span>
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm">İşlemlerinizi konuşarak hızlıca halledin</p>
          </div>
        </div>
        
        {/* Tab Selection */}
        <div className="flex gap-4 px-3 sm:px-6 pb-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-all ${
              activeTab === 'chat' ? 'border-white text-white' : 'border-transparent text-white/70 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="font-semibold text-sm">Sohbet</span>
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-all ${
              activeTab === 'approvals' ? 'border-white text-white' : 'border-transparent text-white/70 hover:text-white'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span className="font-semibold text-sm">Onaylamalar</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <AIChatGPTPage />
            </motion.div>
          )}
          {activeTab === 'approvals' && (
            <motion.div
              key="approvals"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 overflow-y-auto"
            >
              <AIPendingApprovals />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
