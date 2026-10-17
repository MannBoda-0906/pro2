import React, { useState } from 'react';
import {
  X,
  Settings,
  Key,
  Cpu,
  ShieldCheck,
  ExternalLink,
  Check,
  Trash2
} from 'lucide-react';
import { StorageService } from '../../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverModel: string;
  isGeminiConfiguredOnServer: boolean;
  onKeySaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  serverModel,
  isGeminiConfiguredOnServer,
  onKeySaved
}) => {
  const [apiKey, setApiKey] = useState(StorageService.getApiKey());
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.setApiKey(apiKey);
    setIsSaved(true);
    onKeySaved();
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleClearKey = () => {
    StorageService.setApiKey('');
    setApiKey('');
    onKeySaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17172D]/35 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-3xl border border-[#DFE1F0] shadow-floating p-6 sm:p-8 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EEEEFF] text-[#4938C8] flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#17172D] tracking-tight">
                AI Engine & Settings
              </h3>
              <p className="text-xs text-[#666A83]">
                Configure Gemini API credentials and model preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#666A83] hover:text-[#17172D] hover:bg-[#EEEEFF] transition-all active:scale-[0.98]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Status Badge */}
        <div className="mb-6 p-4 rounded-2xl bg-[#F8F9FD] border border-[#DFE1F0] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#666A83] flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#4938C8]" />
              Active AI Model:
            </span>
            <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-[#EEEEFF] text-[#4938C8]">
              {serverModel || 'gemini-3.8-flash'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#666A83] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Server Key Configured:
            </span>
            <span
              className={`text-xs font-semibold ${
                isGeminiConfiguredOnServer
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}
            >
              {isGeminiConfiguredOnServer ? 'Yes (Live Gemini Engine)' : 'Adaptive Fallback Mode'}
            </span>
          </div>
        </div>

        {/* Client-side Key Override */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#666A83] flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#4938C8]" />
                Custom Google Gemini API Key
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#4938C8] hover:text-[#5B46E8] font-semibold hover:underline flex items-center gap-1"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Paste AIzaSy... (optional)"
              className="w-full px-4 py-2.5 rounded-xl border border-[#DFE1F0] bg-white text-xs sm:text-sm text-[#17172D] placeholder-[#666A83] focus:outline-none focus:ring-2 focus:ring-[#5B46E8]/20 focus:border-[#5B46E8] font-mono shadow-xs"
            />
            <p className="mt-1.5 text-[11px] text-[#666A83] leading-normal">
              Stored securely in your local browser storage. Sent only to the local server proxy to authenticate with Google Gemini.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            {apiKey ? (
              <button
                type="button"
                onClick={handleClearKey}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Key</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-[#666A83] hover:text-[#17172D] hover:bg-[#EEEEFF] transition-all"
              >
                Close
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl bg-[#4938C8] hover:bg-[#5B46E8] text-white shadow-cta hover:shadow-cta-hover active:scale-[0.98] transition-all"
              >
                {isSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Key</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
