import React, { useState } from 'react';
import {
  X,
  History,
  Search,
  Trash2,
  Play,
  BookOpen,
  Calendar
} from 'lucide-react';
import { HistoryItem } from '../../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelectVideo: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectVideo,
  onDeleteItem,
  onClearAll
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = history.filter(item => {
    const q = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.author.toLowerCase().includes(q)
    );
  });

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17172D]/35 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-2xl rounded-3xl border border-[#DFE1F0] shadow-floating flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header - Layer 2 Glass Surface */}
        <div className="p-6 border-b border-[#DFE1F0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EEEEFF] text-[#4938C8] flex items-center justify-center shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#17172D] tracking-tight">
                My Learning History
              </h3>
              <p className="text-xs text-[#666A83]">
                {history.length} saved lessons and interactive study guides
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-colors"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#666A83] hover:text-[#17172D] hover:bg-[#EEEEFF] transition-all active:scale-[0.98]"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Filter */}
        <div className="px-6 py-3.5 border-b border-[#DFE1F0] bg-[#F8F9FD]/60">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#666A83] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by lesson title or instructor channel..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-[#DFE1F0] bg-white text-[#17172D] placeholder-[#666A83] focus:outline-none focus:ring-2 focus:ring-[#5B46E8]/20 focus:border-[#5B46E8] shadow-xs"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[#666A83] text-xs sm:text-sm">
              {search ? 'No lessons match your search query.' : 'No saved lessons yet. Process a study video to automatically save it here!'}
            </div>
          ) : (
            filtered.map(item => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border border-[#DFE1F0] bg-white hover:border-[#5B46E8] hover:shadow-resting hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between gap-3 group"
              >
                <div
                  onClick={() => {
                    onSelectVideo(item);
                    onClose();
                  }}
                  className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0"
                >
                  <div className="relative w-20 h-13 rounded-xl overflow-hidden bg-[#EEEEFF] shrink-0 border border-[#DFE1F0] shadow-xs">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[#4938C8]/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 text-white fill-current" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-[#17172D] truncate group-hover:text-[#4938C8] transition-colors">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-2.5 text-[11px] text-[#666A83] mt-1">
                      <span className="font-medium">{item.author}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#666A83]" />
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      onSelectVideo(item);
                      onClose();
                    }}
                    className="p-2 rounded-xl text-[#4938C8] hover:bg-[#EEEEFF] transition-all active:scale-[0.98]"
                    title="Open Study Guide"
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-2 rounded-xl text-[#666A83] hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-[0.98]"
                    title="Delete from history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
