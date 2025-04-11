import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { MessageIcon, VercelIcon } from './icons';
import { BrainCircuitIcon } from 'lucide-react';
import { usePreferences } from '@/hooks/use-preferences';

export const Overview = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const { preferences, isLoaded, setPreference } = usePreferences();
  
  useEffect(() => {
    if (isLoaded) {
      // Check if the intro has been seen today
      if (preferences.hasSeenIntro) {
        setShowWelcome(false);
      } else {
        // Show intro and mark it as seen after 7 seconds
        const timer = setTimeout(() => {
          setShowWelcome(false);
          setPreference('hasSeenIntro', true);
        }, 7000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isLoaded, preferences.hasSeenIntro, setPreference]);

  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <AnimatePresence>
        {showWelcome ? (
          <motion.div
            className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-xl"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            key="welcome-section"
          >
            <p className="flex flex-row justify-center gap-4 items-center">
              <BrainCircuitIcon size={32} />
              <span className="text-2xl font-semibold">Welcome to Ai by Talkverse</span>
            </p>
            
            <motion.div 
              className="mt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-blue-600 bg-clip-text text-transparent">
                You did AI their way,
              </h2>
              <motion.h2 
                className="text-3xl font-bold mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.3, duration: 1.5 }}
              >
                now do it <span className="underline decoration-blue-500">your way</span>...
              </motion.h2>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="ai-bot-intro"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="rounded-xl p-6 text-center"
          >
            {/* AI Bot introduction will appear here */}
            <p className="flex flex-row justify-center gap-4 items-center">
              <BrainCircuitIcon size={16} />
              <span className="text-2xl font-semibold">Create anything you can imagine... just ask, anything.</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
