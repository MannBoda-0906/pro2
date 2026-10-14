import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  HelpCircle,
  Layers,
  Brain,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HeroInput } from './components/youtube/HeroInput';
import { VideoPlayerCard } from './components/youtube/VideoPlayerCard';
import { SummarizedQuizTab } from './components/quiz/SummarizedQuizTab';
import { SummaryTab } from './components/summary/SummaryTab';
import { QuizTab } from './components/quiz/QuizTab';
import { FlashcardsTab } from './components/summary/FlashcardsTab';
import { AssistantTab } from './components/common/AssistantTab';
import { HistoryModal } from './components/common/HistoryModal';
import { SettingsModal } from './components/common/SettingsModal';
import { ManualTranscriptModal } from './components/youtube/ManualTranscriptModal';
import { ToastContainer, ToastMessage } from './components/common/Toast';

import { ApiService } from './services/api';
import { StorageService } from './services/storage';
import {
  AssistantMessage,
  DemoSample,
  Flashcard,
  HistoryItem,
  QuizData,
  SummaryData,
  TranscriptSegment,
  VideoMetadata
} from './types';

export const App: React.FC = () => {
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => StorageService.getTheme());

  // App Workflow State
  const [activeVideo, setActiveVideo] = useState<{
    metadata: VideoMetadata;
    transcript: TranscriptSegment[];
    rawText: string;
  } | null>(null);

  const [activeSummary, setActiveSummary] = useState<SummaryData | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<QuizData | null>(null);
  const [activeFlashcards, setActiveFlashcards] = useState<Flashcard[]>([]);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);

  const [activeTab, setActiveTab] = useState<'summarized-quiz' | 'summary' | 'quiz' | 'flashcards' | 'assistant'>('summarized-quiz');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedCount, setSelectedCount] = useState<number>(10);
  const [seekTime, setSeekTime] = useState<number | null>(null);

  // Loading States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState<boolean>(false);
  const [isGeneratingPractice, setIsGeneratingPractice] = useState<boolean>(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState<boolean>(false);
  const [isAssistantThinking, setIsAssistantThinking] = useState<boolean>(false);

  // Modals
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isManualTranscriptOpen, setIsManualTranscriptOpen] = useState<boolean>(false);
  const [manualTranscriptError, setManualTranscriptError] = useState<string | undefined>();
  const [manualTranscriptTitle, setManualTranscriptTitle] = useState<string>('');

  // Data Collections
  const [demos, setDemos] = useState<DemoSample[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Server metadata
  const [serverStatus, setServerStatus] = useState({
    model: 'gemini-3.8-flash',
    geminiConfigured: false
  });

  // Initialize theme
  useEffect(() => {
    StorageService.setTheme(theme);
  }, [theme]);

  // Load initial data (health, demos, history)
  useEffect(() => {
    const init = async () => {
      try {
        const health = await ApiService.checkHealth();
        setServerStatus({
          model: health.model || 'gemini-3.8-flash',
          geminiConfigured: health.geminiConfigured || false
        });
      } catch (err) {
        console.warn('Backend offline or initializing:', err);
      }

      try {
        const demoList = await ApiService.getDemos();
        setDemos(demoList);
      } catch (err) {
        console.warn('Failed loading demos:', err);
      }

      try {
        const savedHistory = await ApiService.fetchHistory();
        setHistory(savedHistory);
      } catch {
        setHistory(StorageService.getHistory());
      }
    };

    init();
  }, []);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  // ===================== VIDEO PROCESSING WORKFLOW =====================

  const handleProcessUrl = async (
    url: string,
    options?: { language?: string; difficulty?: 'easy' | 'medium' | 'hard'; count?: number }
  ) => {
    const lang = options?.language || selectedLanguage;
    const diff = options?.difficulty || selectedDifficulty;
    const cnt = options?.count || selectedCount;

    setIsLoading(true);
    setLoadingStep('Reading available lesson content...');
    try {
      const processRes = await ApiService.processVideo({ url });

      setActiveVideo({
        metadata: processRes.metadata,
        transcript: processRes.transcript,
        rawText: processRes.rawText
      });

      // Step 1: Generate Complete Summary & Notes directly from link
      setLoadingStep('Understanding lesson concepts & core takeaways...');
      const summary = await ApiService.generateSummary({
        videoId: processRes.metadata.id,
        videoUrl: processRes.metadata.url,
        title: processRes.metadata.title,
        transcript: processRes.transcript,
        language: lang
      });
      setActiveSummary(summary);

      // Step 2: Concept Analysis & Multilingual Exam Quiz
      setLoadingStep('Analyzing knowledge map & generating exam-oriented quiz...');
      let quizData: QuizData | null = null;
      try {
        quizData = await ApiService.generateQuiz({
          videoId: processRes.metadata.id,
          videoUrl: processRes.metadata.url,
          title: processRes.metadata.title,
          transcript: processRes.transcript,
          difficulty: diff,
          count: cnt,
          language: lang
        });
        setActiveQuiz(quizData);
      } catch (quizErr) {
        console.warn('Initial concept quiz generation warning:', quizErr);
      }

      // Step 3: Generate Flashcards
      try {
        const flashcards = await ApiService.generateFlashcards({
          videoId: processRes.metadata.id,
          title: processRes.metadata.title,
          transcript: processRes.transcript,
          count: 6
        });
        setActiveFlashcards(flashcards);
      } catch {
        // Non-blocking
      }

      setAssistantMessages([]);
      setActiveTab('summarized-quiz');

      // Auto-save to history
      const historyItem: HistoryItem = {
        id: `hist_${processRes.metadata.id}_${Date.now()}`,
        videoId: processRes.metadata.id,
        url: processRes.metadata.url,
        title: processRes.metadata.title,
        author: processRes.metadata.author,
        thumbnailUrl: processRes.metadata.thumbnailUrl,
        createdAt: new Date().toISOString(),
        summary,
        quiz: quizData || undefined
      };
      await ApiService.saveHistory(historyItem);
      setHistory(prev => [historyItem, ...prev.filter(h => h.videoId !== historyItem.videoId)]);

      addToast('success', 'Concept-based exam quiz is ready!');
    } catch (err: any) {
      console.error('Processing error:', err);
      addToast('error', err.message || 'Failed to process YouTube link.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleSelectDemo = async (
    demoId: string,
    options?: { language?: string; difficulty?: 'easy' | 'medium' | 'hard'; count?: number }
  ) => {
    const lang = options?.language || selectedLanguage;
    const diff = options?.difficulty || selectedDifficulty;
    const cnt = options?.count || selectedCount;

    setIsLoading(true);
    setLoadingStep('Reading available lesson content...');
    try {
      const processRes = await ApiService.processVideo({ demoId });

      setActiveVideo({
        metadata: processRes.metadata,
        transcript: processRes.transcript,
        rawText: processRes.rawText
      });

      setLoadingStep('Understanding lesson concepts & core takeaways...');
      const summary = await ApiService.generateSummary({
        videoId: demoId,
        title: processRes.metadata.title,
        transcript: processRes.transcript,
        language: lang
      });
      setActiveSummary(summary);

      setLoadingStep('Analyzing knowledge map & generating exam-oriented quiz...');
      const quiz = await ApiService.generateQuiz({
        videoId: demoId,
        title: processRes.metadata.title,
        transcript: processRes.transcript,
        difficulty: diff,
        count: cnt,
        language: lang
      });
      setActiveQuiz(quiz);

      const flashcards = await ApiService.generateFlashcards({
        videoId: demoId,
        title: processRes.metadata.title,
        transcript: processRes.transcript,
        count: 4
      });
      setActiveFlashcards(flashcards);

      setAssistantMessages([]);
      setActiveTab('summarized-quiz');
      addToast('success', `Loaded ${processRes.metadata.title} concept quiz!`);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load demo video.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleManualTranscriptSubmit = async (title: string, transcriptText: string) => {
    setIsManualTranscriptOpen(false);
    setIsLoading(true);
    setLoadingStep('Processing custom transcript...');

    try {
      const processRes = await ApiService.processVideo({
        manualTranscript: transcriptText
      });

      const customMetadata: VideoMetadata = {
        ...processRes.metadata,
        title: title || 'Custom Lecture Notes',
        author: 'Manual Transcript',
        thumbnailUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80'
      };

      setActiveVideo({
        metadata: customMetadata,
        transcript: processRes.transcript,
        rawText: transcriptText
      });

      const summary = await ApiService.generateSummary({
        videoId: customMetadata.id,
        title: customMetadata.title,
        transcript: processRes.transcript,
        language: selectedLanguage
      });
      setActiveSummary(summary);

      setActiveQuiz(null);
      setActiveTab('summary');
      addToast('success', 'Study materials generated from manual transcript!');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to process manual transcript.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // ===================== REGENERATE / LANGUAGE CHANGE =====================

  const handleLanguageChange = async (newLang: string) => {
    setSelectedLanguage(newLang);
    if (!activeVideo || !activeSummary) return;

    setIsRegenerating(true);
    try {
      const [summary, quiz] = await Promise.all([
        ApiService.generateSummary({
          videoId: activeVideo.metadata.id,
          title: activeVideo.metadata.title,
          transcript: activeVideo.transcript,
          language: newLang
        }),
        ApiService.generateQuiz({
          videoId: activeVideo.metadata.id,
          videoUrl: activeVideo.metadata.url,
          title: activeVideo.metadata.title,
          transcript: activeVideo.transcript,
          difficulty: selectedDifficulty,
          count: selectedCount,
          language: newLang
        })
      ]);
      setActiveSummary(summary);
      setActiveQuiz(quiz);
      addToast('success', `Adapted entire lesson and quiz into selected language!`);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to adapt language.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!activeVideo) return;
    setIsRegenerating(true);
    try {
      const summary = await ApiService.generateSummary({
        videoId: activeVideo.metadata.id,
        videoUrl: activeVideo.metadata.url,
        title: activeVideo.metadata.title,
        transcript: activeVideo.transcript,
        language: selectedLanguage
      });
      setActiveSummary(summary);
      addToast('success', 'Study notes refreshed!');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to regenerate.');
    } finally {
      setIsRegenerating(false);
    }
  };

  // ===================== QUIZ ACTIONS =====================

  const handleGenerateQuiz = async (difficulty: 'easy' | 'medium' | 'hard', count: number) => {
    if (!activeVideo) return;
    setIsGeneratingQuiz(true);
    try {
      const quiz = await ApiService.generateQuiz({
        videoId: activeVideo.metadata.id,
        videoUrl: activeVideo.metadata.url,
        title: activeVideo.metadata.title,
        transcript: activeVideo.transcript,
        difficulty,
        count,
        language: selectedLanguage
      });
      setActiveQuiz(quiz);
      addToast('success', `Created ${quiz.questions.length} ${difficulty} exam questions!`);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to generate quiz.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleGeneratePractice = async (weakConcepts: string[]) => {
    if (!activeVideo) return;
    setIsGeneratingPractice(true);
    try {
      const practiceQuestions = await ApiService.generatePracticeQuestions({
        videoId: activeVideo.metadata.id,
        title: activeVideo.metadata.title,
        weakConcepts,
        difficulty: selectedDifficulty,
        language: selectedLanguage
      });

      if (practiceQuestions.length > 0) {
        setActiveQuiz(prev => {
          if (!prev) return null;
          return {
            ...prev,
            questions: [...practiceQuestions, ...prev.questions]
          };
        });
        addToast('success', `Generated ${practiceQuestions.length} targeted practice questions for weak concepts!`);
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to generate targeted practice questions.');
    } finally {
      setIsGeneratingPractice(false);
    }
  };

  // ===================== FLASHCARD ACTIONS =====================

  const handleGenerateFlashcards = async (count: number) => {
    if (!activeVideo) return;
    setIsGeneratingFlashcards(true);
    try {
      const flashcards = await ApiService.generateFlashcards({
        videoId: activeVideo.metadata.id,
        title: activeVideo.metadata.title,
        transcript: activeVideo.transcript,
        count
      });
      setActiveFlashcards(flashcards);
      addToast('success', `Created ${flashcards.length} active recall cards!`);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to generate flashcards.');
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  // ===================== ASSISTANT CHAT ACTIONS =====================

  const handleSendMessage = async (question: string) => {
    if (!activeVideo) return;

    const userMsg: AssistantMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: question,
      groundedInVideo: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setAssistantMessages(prev => [...prev, userMsg]);
    setIsAssistantThinking(true);

    try {
      const res = await ApiService.askAssistant({
        title: activeVideo.metadata.title,
        transcript: activeVideo.transcript,
        question,
        chatHistory: assistantMessages.map(m => ({ role: m.role, content: m.content }))
      });

      const assistantMsg: AssistantMessage = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        groundedInVideo: res.groundedInVideo,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setAssistantMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      addToast('error', err.message || 'Assistant failed to respond.');
    } finally {
      setIsAssistantThinking(false);
    }
  };

  // ===================== EXPORT UTILITIES =====================

  const handleCopyNotes = () => {
    if (!activeSummary) return;
    const textToCopy = `${activeSummary.shortSummary}\n\n${activeSummary.studyNotes}`;
    navigator.clipboard.writeText(textToCopy);
    addToast('success', 'Summary copied to clipboard!');
  };

  const handleDownloadMarkdown = () => {
    if (!activeVideo || !activeSummary) return;
    const content = `# Study Notes: ${activeVideo.metadata.title}\nSource: ${activeVideo.metadata.url}\n\n## Overview\n${activeSummary.shortSummary}\n\n## Detailed Summary\n${activeSummary.detailedSummary}\n\n${activeSummary.studyNotes}`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeVideo.metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_notes.md`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Markdown file downloaded!');
  };

  const handleDownloadText = () => {
    if (!activeVideo || !activeSummary) return;
    const content = `TITLE: ${activeVideo.metadata.title}\nURL: ${activeVideo.metadata.url}\n\n--- SUMMARY ---\n${activeSummary.shortSummary}\n\n--- KEY POINTS ---\n${activeSummary.keyPoints.map((k, i) => `${i + 1}. ${k}`).join('\n')}\n\n--- STUDY NOTES ---\n${activeSummary.studyNotes}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeVideo.metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_notes.txt`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Plain text file downloaded!');
  };

  const handleExportQuiz = () => {
    if (!activeQuiz) return;
    const text = activeQuiz.questions
      .map(
        (q, idx) =>
          `Q${idx + 1}: ${q.question}\nOptions:\n${q.options
            .map((o, i) => `  ${String.fromCharCode(65 + i)}. ${o}`)
            .join('\n')}\nCorrect Answer: ${q.correctAnswer}\nExplanation: ${q.explanation}\n`
      )
      .join('\n---\n\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quiz_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Quiz exported successfully!');
  };

  const handleExportFlashcards = () => {
    if (activeFlashcards.length === 0) return;
    const text = activeFlashcards
      .map((fc, i) => `Card ${i + 1} [${fc.category || 'General'}]\nFRONT: ${fc.front}\nBACK: ${fc.back}\n`)
      .join('\n---\n\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flashcards_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Flashcards exported successfully!');
  };

  // ===================== HISTORY MANAGEMENT =====================

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setActiveVideo({
      metadata: {
        id: item.videoId,
        url: item.url,
        title: item.title,
        author: item.author,
        thumbnailUrl: item.thumbnailUrl,
        embedUrl: `https://www.youtube.com/embed/${item.videoId}`
      },
      transcript: [],
      rawText: ''
    });

    if (item.summary) setActiveSummary(item.summary);
    if (item.quiz) setActiveQuiz(item.quiz);
    if (item.flashcards) setActiveFlashcards(item.flashcards);
    setAssistantMessages([]);
    setActiveTab('summarized-quiz');
    addToast('info', `Opened "${item.title}"`);
  };

  const handleDeleteHistoryItem = async (id: string) => {
    await ApiService.deleteHistory(id);
    setHistory(prev => prev.filter(h => h.id !== id));
    addToast('info', 'Item removed from history.');
  };

  const handleClearAllHistory = () => {
    StorageService.clearHistory();
    setHistory([]);
    addToast('info', 'All history cleared.');
  };

  const handleSaveToHistoryExplicit = async () => {
    if (!activeVideo || !activeSummary) return;
    const historyItem: HistoryItem = {
      id: `hist_${activeVideo.metadata.id}_${Date.now()}`,
      videoId: activeVideo.metadata.id,
      url: activeVideo.metadata.url,
      title: activeVideo.metadata.title,
      author: activeVideo.metadata.author,
      thumbnailUrl: activeVideo.metadata.thumbnailUrl,
      createdAt: new Date().toISOString(),
      summary: activeSummary,
      quiz: activeQuiz || undefined,
      flashcards: activeFlashcards.length > 0 ? activeFlashcards : undefined
    };

    await ApiService.saveHistory(historyItem);
    setHistory(prev => [historyItem, ...prev.filter(h => h.videoId !== historyItem.videoId)]);
    addToast('success', 'Saved to your study history!');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast('success', 'Application link copied to clipboard!');
  };

  const handleSeek = (seconds: number) => {
    setSeekTime(seconds);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onGoHome={() => setActiveVideo(null)}
        historyCount={history.length}
        hasActiveVideo={Boolean(activeVideo)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!activeVideo ? (
          <HeroInput
            onProcessUrl={handleProcessUrl}
            onSelectDemo={handleSelectDemo}
            onOpenManualTranscript={() => setIsManualTranscriptOpen(true)}
            isLoading={isLoading}
            loadingStep={loadingStep}
            demos={demos}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            selectedDifficulty={selectedDifficulty}
            onDifficultyChange={setSelectedDifficulty}
            selectedCount={selectedCount}
            onCountChange={setSelectedCount}
          />
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Video Player & Info Header */}
            <VideoPlayerCard
              metadata={activeVideo.metadata}
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              onSaveToHistory={handleSaveToHistoryExplicit}
              onShare={handleShare}
              onRegenerate={handleRegenerate}
              isRegenerating={isRegenerating}
              seekTime={seekTime}
            />

            {/* Navigation Tabs Bar */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab('summarized-quiz')}
                className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'summarized-quiz'
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4 text-brand-500" />
                <span>Summarized Quiz</span>
                {activeQuiz && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                    {activeQuiz.questions.length} Qs
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('summary')}
                className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'summary'
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Full Notes & Summary</span>
              </button>

              <button
                onClick={() => setActiveTab('quiz')}
                className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'quiz'
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Quiz Only</span>
                {activeQuiz && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                    {activeQuiz.questions.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('flashcards')}
                className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'flashcards'
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Flashcards</span>
                {activeFlashcards.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                    {activeFlashcards.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('assistant')}
                className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap ${
                  activeTab === 'assistant'
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Brain className="w-4 h-4" />
                <span>AI Tutor</span>
              </button>
            </div>

            {/* Active Tab Views */}
            {activeTab === 'summarized-quiz' && activeSummary && (
              <SummarizedQuizTab
                summary={activeSummary}
                quiz={activeQuiz}
                onGenerateQuiz={handleGenerateQuiz}
                isGenerating={isGeneratingQuiz}
                onExportQuiz={handleExportQuiz}
                onViewFullSummary={() => setActiveTab('summary')}
                videoTitle={activeVideo.metadata.title}
                onSeek={handleSeek}
                onGeneratePractice={handleGeneratePractice}
                isGeneratingPractice={isGeneratingPractice}
              />
            )}

            {activeTab === 'summary' && activeSummary && (
              <SummaryTab
                summary={activeSummary}
                onSeek={handleSeek}
                onCopyNotes={handleCopyNotes}
                onDownloadMarkdown={handleDownloadMarkdown}
                onDownloadText={handleDownloadText}
              />
            )}

            {activeTab === 'quiz' && (
              <QuizTab
                quiz={activeQuiz}
                onGenerateQuiz={handleGenerateQuiz}
                isGenerating={isGeneratingQuiz}
                onExportQuiz={handleExportQuiz}
                onSeek={handleSeek}
                onGeneratePractice={handleGeneratePractice}
                isGeneratingPractice={isGeneratingPractice}
              />
            )}

            {activeTab === 'flashcards' && (
              <FlashcardsTab
                flashcards={activeFlashcards}
                onGenerateFlashcards={handleGenerateFlashcards}
                isGenerating={isGeneratingFlashcards}
                onExport={handleExportFlashcards}
              />
            )}

            {activeTab === 'assistant' && (
              <AssistantTab
                messages={assistantMessages}
                onSendMessage={handleSendMessage}
                isLoading={isAssistantThinking}
                videoTitle={activeVideo.metadata.title}
              />
            )}
          </div>
        )}
      </main>

      <Footer />

      {/* Modals & Overlays */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectVideo={handleSelectHistoryItem}
        onDeleteItem={handleDeleteHistoryItem}
        onClearAll={handleClearAllHistory}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        serverModel={serverStatus.model}
        isGeminiConfiguredOnServer={serverStatus.geminiConfigured}
        onKeySaved={() => addToast('success', 'Gemini key updated!')}
      />

      <ManualTranscriptModal
        isOpen={isManualTranscriptOpen}
        onClose={() => setIsManualTranscriptOpen(false)}
        onSubmit={handleManualTranscriptSubmit}
        initialTitle={manualTranscriptTitle}
        initialError={manualTranscriptError}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
