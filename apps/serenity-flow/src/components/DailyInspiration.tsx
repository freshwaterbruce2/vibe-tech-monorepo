import { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { Quote, Sparkles, RefreshCcw } from 'lucide-react';
import { getGeminiApiKey } from '../lib/gemini';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface Inspiration {
  title: string;
  content: string;
  type: 'CBT' | 'Quote';
}

const FALLBACK_INSPIRATION: Inspiration = {
  title: "Breathe with Purpose",
  content: "Take a moment to acknowledge your feelings without judgment. You are resilient and capable.",
  type: "CBT",
};

export default function DailyInspiration() {
  const [inspiration, setInspiration] = useState<Inspiration | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInspiration = async () => {
    setLoading(true);
    try {
      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        setInspiration(FALLBACK_INSPIRATION);
        return;
      }

      const genAI = new GoogleGenAI({ apiKey });
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Generate a daily wellness inspiration. It should be either a Cognitive Behavioral Therapy (CBT) tip for emotional regulation (especially for someone with BPD sensitivity) or a deep inspirational quote. Return as JSON with keys: title, content, type (CBT or Quote).",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              type: { type: Type.STRING }
            }
          }
        }
      });

      const data = JSON.parse(response.text);
      setInspiration(data);
    } catch (error) {
      setInspiration(FALLBACK_INSPIRATION);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspiration();
  }, []);

  return (
    <div className="relative overflow-hidden p-6 rounded-3xl glass border-white/40 shadow-sm group">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <div className="w-8 h-8 rounded-full border-2 border-sky-400/20 border-t-sky-400 animate-spin mb-4" />
            <p className="text-sm font-serif italic opacity-50">Gathering light...</p>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                {inspiration?.type === 'CBT' ? (
                  <Sparkles className="w-4 h-4 text-sky-400" />
                ) : (
                  <Quote className="w-4 h-4 text-sky-400" />
                )}
                <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">
                  {inspiration?.type} Lesson
                </span>
              </div>
              <button
                onClick={fetchInspiration}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-black/5"
              >
                <RefreshCcw className="w-3 h-3 opacity-40" />
              </button>
            </div>

            <h3 className="text-2xl font-serif mb-3 leading-tight">{inspiration?.title}</h3>
            <p className="text-base leading-relaxed opacity-80 font-light italic">
              "{inspiration?.content}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
