import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Brain,
  Send,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Lightbulb,
  User,
  Loader2
} from 'lucide-react';
import { AssistantMessage } from '../../types';

interface AssistantTabProps {
  messages: AssistantMessage[];
  onSendMessage: (question: string) => void;
  isLoading: boolean;
  videoTitle: string;
}

const QUICK_PROMPTS = [
  'Explain the hardest concept in simple words for a beginner',
  'Give me 3 real-world practical examples of what was discussed',
  'Create a 60-second exam revision cram sheet from this video',
  'What are the most likely test/exam questions on this topic?'
];

export const AssistantTab: React.FC<AssistantTabProps> = ({
  messages,
  onSendMessage,
  isLoading,
  videoTitle
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleSelectPrompt = (prompt: string) => {
    if (isLoading) return;
    onSendMessage(prompt);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header Banner - Layer 1 Solid Surface */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#DFE1F0] shadow-resting flex items-center justify-between gap-4 transition-all duration-300 hover:shadow-raised">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#EEEEFF] text-[#4938C8] flex items-center justify-center shrink-0 shadow-xs">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-[#17172D] tracking-tight">
                Lumora AI Tutor
              </h3>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EEEEFF] text-[#4938C8]">
                Interactive
              </span>
            </div>
            <p className="text-xs text-[#666A83] mt-0.5">
              Ask anything about <span className="font-semibold text-[#4938C8]">{videoTitle}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EEEEFF] border border-[#DFE1F0] text-xs font-semibold text-[#4938C8] shadow-xs shrink-0">
          <ShieldCheck className="w-4 h-4 text-[#4938C8]" />
          <span>Transcript Grounded</span>
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="min-h-[440px] max-h-[580px] overflow-y-auto p-4 sm:p-6 rounded-3xl bg-[#F8F9FD]/80 border border-[#DFE1F0] space-y-4">
        {messages.length === 0 ? (
          <div className="py-10 text-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#EEEEFF] text-[#4938C8] flex items-center justify-center mx-auto mb-4 shadow-resting">
              <Lightbulb className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-lg text-[#17172D] mb-1.5 tracking-tight">
              What would you like to explore?
            </h4>
            <p className="text-xs sm:text-sm text-[#666A83] mb-6 leading-relaxed">
              Ask your AI Tutor for conceptual analogies, derivations of formulas, test questions, or quick exam cram sheets.
            </p>

            <div className="space-y-2.5 text-left">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#666A83] text-center mb-1">
                Suggested Questions & Prompts
              </p>
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPrompt(prompt)}
                  className="w-full text-left p-3.5 rounded-2xl bg-white border border-[#DFE1F0] hover:border-[#5B46E8] hover:bg-[#EEEEFF]/40 text-xs font-medium text-[#17172D] hover:text-[#4938C8] transition-all duration-200 shadow-resting hover:shadow-raised hover:-translate-y-0.5 active:scale-[0.99] flex items-center gap-2.5"
                >
                  <span className="w-6 h-6 rounded-lg bg-[#EEEEFF] text-[#4938C8] flex items-center justify-center text-xs shrink-0">
                    ✨
                  </span>
                  <span className="flex-1">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[88%] sm:max-w-[80%] ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-[#4938C8] text-white shadow-[0_4px_12px_rgba(73,56,200,0.3)]'
                    : 'bg-[#EEEEFF] text-[#4938C8] border border-[#DFE1F0]'
                }`}
              >
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
              </div>

              <div
                className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#4938C8] text-white rounded-tr-sm shadow-[0_4px_16px_rgba(73,56,200,0.2)]'
                    : 'bg-white text-[#17172D] rounded-tl-sm border border-[#DFE1F0] shadow-resting'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <>
                    <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed prose-headings:text-[#17172D] prose-a:text-[#4938C8] prose-strong:text-[#17172D]">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#DFE1F0] flex items-center justify-between text-[11px] text-[#666A83]">
                      <span className="flex items-center gap-1.5 font-medium">
                        {msg.groundedInVideo ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-semibold">
                              Verified in video transcript
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-amber-700 font-medium">
                              Additional context beyond video
                            </span>
                          </>
                        )}
                      </span>
                      <span className="font-mono text-[10px] text-[#666A83]">{msg.timestamp}</span>
                    </div>
                  </>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-3 max-w-[85%] mr-auto items-center">
            <div className="w-9 h-9 rounded-xl bg-[#EEEEFF] text-[#4938C8] border border-[#DFE1F0] flex items-center justify-center shrink-0 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-[#4938C8]" />
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#DFE1F0] text-xs text-[#666A83] flex items-center gap-2.5 shadow-resting">
              <Sparkles className="w-4 h-4 text-[#4938C8] animate-spin" />
              <span>Analyzing transcript and generating personalized explanation...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form - Layer 2 Floating Elevated Glass Composer */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="spatial-glass shadow-floating rounded-2xl border border-[#DFE1F0] p-2 flex items-center gap-2 transition-all duration-200 focus-within:border-[#5B46E8] focus-within:ring-2 focus-within:ring-[#5B46E8]/20">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask your AI Tutor anything about this lesson (e.g. 'Explain step 2 at 4:15')..."
            disabled={isLoading}
            className="flex-1 bg-white border border-[#DFE1F0] rounded-xl px-4 py-3 text-xs sm:text-sm text-[#17172D] placeholder-[#666A83] focus:outline-none focus:border-[#5B46E8] transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-xl bg-[#4938C8] hover:bg-[#5B46E8] disabled:bg-[#DFE1F0] disabled:text-[#666A83] text-white shadow-cta hover:shadow-cta-hover active:scale-[0.98] transition-all duration-200 shrink-0 flex items-center justify-center"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
