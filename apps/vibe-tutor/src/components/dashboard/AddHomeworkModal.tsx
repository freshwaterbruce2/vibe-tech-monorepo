import React, { useEffect, useRef, useState } from 'react';
import { parseHomeworkFromVoice } from '../../services/homeworkParserService';
import type { ParsedHomework } from '../../types';
import { appStore } from '../../utils/electronStore';
import { MicrophoneIcon } from '../ui/icons/MicrophoneIcon';
import { logger } from '../../utils/logger';

interface AddHomeworkModalProps {
  onClose: () => void;
  onAdd: (item: ParsedHomework) => void;
}

const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
const VOICE_DISCLOSURE_KEY = 'vibetutor.voiceDisclosureAccepted.v1';

if (recognition) {
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
}

const AddHomeworkModal = ({ onClose, onAdd }: AddHomeworkModalProps) => {
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [voiceDisclosureAccepted, setVoiceDisclosureAccepted] = useState<boolean>(() => {
    return appStore.get(VOICE_DISCLOSURE_KEY) === '1';
  });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[0]?.[0];
      if (!result) {
        logger.warn('Speech recognition returned empty result');
        return;
      }
      const transcript = result.transcript;
      setVoiceTranscript(transcript);
      setIsParsing(true);
      parseHomeworkFromVoice(transcript)
        .then((parsed) => {
          if (parsed) {
            setSubject(parsed.subject ?? '');
            setTitle(parsed.title ?? '');
            setDueDate(parsed.dueDate ?? '');
          }
        })
        .catch((err) => logger.error('Homework parsing failed:', err))
        .finally(() => setIsParsing(false));
    };
    recognition.onspeechend = () => {
      recognition.stop();
      setIsListening(false);
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      logger.error('Speech recognition error:', event.error);
      setIsListening(false);
    };
  }, []);

  const handleListen = () => {
    if (!recognition) {
      return;
    }
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      if (!voiceDisclosureAccepted) {
        const accepted = window.confirm(
          'Voice input uses your microphone and sends transcript text to Vibe Tutor AI services to parse homework details. Continue?'
        );
        if (!accepted) {
          return;
        }
        appStore.set(VOICE_DISCLOSURE_KEY, '1');
        setVoiceDisclosureAccepted(true);
      }
      setVoiceTranscript('');
      try {
        recognition.start();
        setIsListening(true);
      } catch (error) {
        logger.error('Failed to start speech recognition:', error);
        setIsListening(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subject && title && dueDate) {
      onAdd({ subject, title, dueDate });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-lg flex items-center justify-center z-[60] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-homework-title"
    >
      <div
        ref={modalRef}
        className="bg-background-surface border border-[var(--border-color)] rounded-2xl shadow-2xl shadow-black/50 p-6 md:p-8 w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto transform transition-all animate-fade-in-up"
      >
        <h2 id="add-homework-title" className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-[var(--secondary-accent)] to-[var(--primary-accent)]">
          New Assignment
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input
              type="text"
              id="hw-subject"
              name="hw-subject"
              placeholder="Subject (e.g., Math)"
              aria-label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-text-primary text-base focus:ring-2 focus:ring-[var(--primary-accent)] focus:border-transparent outline-none"
              style={{ fontSize: '16px' }}
              required
            />
            <input
              type="text"
              id="hw-title"
              name="hw-title"
              placeholder="Title (e.g., Complete worksheet)"
              aria-label="Assignment title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-text-primary text-base focus:ring-2 focus:ring-[var(--primary-accent)] focus:border-transparent outline-none"
              style={{ fontSize: '16px' }}
              required
            />
            <input
              type="date"
              id="hw-due-date"
              name="hw-due-date"
              aria-label="Due date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-lg text-text-primary text-base focus:ring-2 focus:ring-[var(--primary-accent)] focus:border-transparent outline-none"
              style={{ fontSize: '16px' }}
              required
            />
          </div>
          <div className="mt-6 text-center">
            <div className="flex items-center my-2">
              <hr className="flex-grow border-slate-700" />
              <span className="mx-2 text-slate-500 text-sm">OR</span>
              <hr className="flex-grow border-slate-700" />
            </div>
            {recognition ? (
              <>
                <button
                  type="button"
                  onClick={handleListen}
                  className={`min-h-[48px] px-6 py-3 rounded-full flex items-center justify-center mx-auto transition-all duration-300 font-semibold ${isListening ? 'bg-red-500 text-white w-full' : 'bg-transparent border-2 border-[var(--primary-accent)] text-[var(--primary-accent)] hover:bg-primary-accent/20'}`}
                  style={!isListening ? { boxShadow: 'var(--neon-glow-primary)' } : {}}
                >
                  <MicrophoneIcon className="w-6 h-6 mr-2" />
                  {isListening ? 'Listening...' : 'Add with Voice'}
                </button>
                <p className="text-xs text-slate-400 mt-3">
                  Voice input uses microphone audio to generate transcript text for homework parsing.
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                Voice input is not supported on this browser.
              </p>
            )}
            {(voiceTranscript || isParsing) && (
              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg text-left border border-slate-700">
                <p className="text-sm text-slate-400">Transcript:</p>
                <p className="text-slate-200 italic">"{voiceTranscript}"</p>
                {isParsing && (
                  <p className="text-sm text-[var(--primary-accent)] animate-pulse mt-1 neon-text-primary">
                    AI is parsing...
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-6 py-3 rounded-lg text-slate-300 bg-slate-700/50 hover:bg-slate-700 transition-all duration-300 hover:scale-105"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="glass-button min-h-[48px] px-6 py-3 rounded-lg text-white font-semibold hover:scale-105 transition-all duration-300 shadow-lg"
            >
              Add Assignment
            </button>
          </div>
        </form>
      </div>
      <style>{`
          @keyframes fade-in-up {
              0% { opacity: 0; transform: translateY(20px); }
              100% { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
          input[type="date"]::-webkit-calendar-picker-indicator {
            filter: invert(0.8) sepia(1) saturate(5) hue-rotate(150deg);
          }
        `}</style>
    </div>
  );
};

export default AddHomeworkModal;
