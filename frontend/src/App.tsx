import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Brain
} from 'lucide-react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HeroInput } from './components/youtube/HeroInput';
import { VideoPlayerCard } from './components/youtube/VideoPlayerCard';
import { QuizTab } from './components/quiz/QuizTab';
import { AssistantTab } from './components/common/AssistantTab';
import { HistoryModal } from './components/common/HistoryModal';
import { SettingsModal } from './components/common/SettingsModal';
import { ManualTranscriptModal } from './components/youtube/ManualTranscriptModal';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { DevDebugPanel } from './components/common/DevDebugPanel';

import { ApiService } from './services/api';
import { StorageService } from './services/storage';
import { VideoIdentity } from './utils/videoIdentity';
import { isFeatureDisabled, cleanOldFeatureStorage } from './utils/featureGuard';
import { getErrorMessage } from './utils';
import {
  AssistantMessage,
  DemoSample,
  HistoryItem,
  QuizData,
  TranscriptSegment,
  VideoMetadata
} from './types';

export const App: React.FC = () => {
  // Theme Mode State (Light, Dark, System — Defaulting to System)
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => StorageService.getThemeMode());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => StorageService.getEffectiveTheme(themeMode));

  // Phase 2: Active Session & Cancellation Refs
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const currentSessionRef = React.useRef<{
    analysisSessionId: string;
    videoId: string;
    url?: string;
  } | null>(null);
  const [discardedCount, setDiscardedCount] = useState<number>(0);
  const [lastDiscardedReason, setLastDiscardedReason] = useState<string>('');

  // App Workflow State
  const [activeVideo, setActiveVideo] = useState<{
    metadata: VideoMetadata;
    transcript: TranscriptSegment[];
    rawText: string;
  } | null>(null);

  const [activeQuiz, setActiveQuiz] = useState<QuizData | null>(null);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);

  const [activeTab, setActiveTab] = useState<'quiz' | 'assistant'>('quiz');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedCount, setSelectedCount] = useState<number>(25);
  const [seekTime, setSeekTime] = useState<number | null>(null);

  // Loading States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState<boolean>(false);
  const [isGeneratingPractice, setIsGeneratingPractice] = useState<boolean>(false);
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

  // Apply theme and attach listener for OS preferences changes when in System mode
  useEffect(() => {
    const effective = StorageService.setThemeMode(themeMode);
    setTheme(effective);

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleMediaChange = () => {
        const updated = StorageService.applyTheme('system');
        setTheme(updated);
      };

      mediaQuery.addEventListener('change', handleMediaChange);
      return () => {
        mediaQuery.removeEventListener('change', handleMediaChange);
      };
    }
  }, [themeMode]);

  // Load initial data (health, demos, history) & purge obsolete cached features
  useEffect(() => {
    cleanOldFeatureStorage();
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

  const addToast = (type: 'success' | 'error' | 'info', rawMessage: string) => {
    const message = type === 'error' ? getErrorMessage(rawMessage) : rawMessage;
    setToasts(prev => {
      // De-duplicate: show each failure once; ignore if identical message already shown
      if (prev.some(t => t.message === message && t.type === type)) {
        return prev;
      }
      const id = `toast_${Date.now()}_${Math.random()}`;
      return [...prev, { id, type, message }];
    });
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleSelectThemeMode = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
  };

  const toggleTheme = () => {
    const nextMode: 'light' | 'dark' | 'system' =
      themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light';
    setThemeMode(nextMode);
  };

  // ===================== VIDEO PROCESSING WORKFLOW =====================

  // ===================== VIDEO PROCESSING WORKFLOW =====================

  const handleProcessUrl = async (
    url: string,
    options?: { language?: string; difficulty?: 'easy' | 'medium' | 'hard'; count?: number }
  ) => {
    const lang = options?.language || selectedLanguage;
    const diff = options?.difficulty || selectedDifficulty;
    const cnt = options?.count || selectedCount;

    // 1. Phase 2: Cancel any in-flight requests from prior submissions immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 2. Parse canonical videoId and create fresh analysisSessionId
    const canonicalVideoId = VideoIdentity.parseCanonicalVideoId(url) || 'video';
    const newSessionId = VideoIdentity.createSessionId();

    currentSessionRef.current = {
      analysisSessionId: newSessionId,
      videoId: canonicalVideoId,
      url
    };

    // 3. Phase 2 Rule: The moment a new URL is submitted, clear all previous state
    setActiveVideo(null);
    setActiveQuiz(null);
    setAssistantMessages([]);
    StorageService.clearQuizSessions(canonicalVideoId, newSessionId);

    setIsLoading(true);
    setLoadingStep('Fetching captions & transcript...');
    try {
      const processRes = await ApiService.processVideo({
        url,
        language: lang,
        analysisSessionId: newSessionId,
        signal: controller.signal
      });

      // Verification before applying response
      if (
        controller.signal.aborted ||
        currentSessionRef.current?.analysisSessionId !== newSessionId ||
        currentSessionRef.current?.videoId !== canonicalVideoId
      ) {
        console.warn(`[SessionIsolation] Discarding stale transcript for ${canonicalVideoId}`);
        setDiscardedCount(prev => prev + 1);
        setLastDiscardedReason(`Stale transcript response discarded for ${canonicalVideoId}`);
        return;
      }

      setActiveVideo({
        metadata: processRes.metadata,
        transcript: processRes.transcript,
        rawText: processRes.rawText
      });

      // Concept Analysis & Exam Quiz
      setLoadingStep(`Analyzing concepts & generating ${cnt}-question quiz...`);
      let quizData: QuizData | null = null;
      try {
        quizData = await ApiService.generateQuiz({
          videoId: canonicalVideoId,
          videoUrl: processRes.metadata.url,
          title: processRes.metadata.title,
          transcript: processRes.transcript,
          difficulty: diff,
          count: cnt,
          language: lang,
          analysisSessionId: newSessionId,
          signal: controller.signal
        });

        // Verification before applying quiz response
        if (
          controller.signal.aborted ||
          currentSessionRef.current?.analysisSessionId !== newSessionId ||
          currentSessionRef.current?.videoId !== canonicalVideoId
        ) {
          console.warn(`[SessionIsolation] Discarding stale quiz for ${canonicalVideoId}`);
          setDiscardedCount(prev => prev + 1);
          setLastDiscardedReason(`Stale quiz response discarded for session ${newSessionId}`);
          return;
        }

        StorageService.saveQuizSession(canonicalVideoId, newSessionId, quizData);
        setActiveQuiz(quizData);
      } catch (quizErr: any) {
        if (controller.signal.aborted) return;
        console.warn('Initial concept quiz generation warning:', quizErr);
        addToast('error', 'Unable to analyze this video. Please try again.');
        setActiveQuiz(null);
        return;
      }

      setAssistantMessages([]);
      setActiveTab('quiz');

      // Auto-save to history
      const historyItem: HistoryItem = {
        id: `hist_${canonicalVideoId}_${Date.now()}`,
        videoId: canonicalVideoId,
        url: processRes.metadata.url,
        title: processRes.metadata.title,
        author: processRes.metadata.author,
        thumbnailUrl: processRes.metadata.thumbnailUrl,
        createdAt: new Date().toISOString(),
        quiz: quizData || undefined
      };
      await ApiService.saveHistory(historyItem);
      setHistory(prev => [historyItem, ...prev.filter(h => h.videoId !== historyItem.videoId)]);

      if (quizData) {
        addToast('success', `${cnt}-Question exam quiz is ready!`);
      }
    } catch (err: any) {
      if (controller.signal.aborted) {
        return;
      }
      console.error('Processing error:', err);
      // Zero reuse of previous video's transcript, concepts, questions on failure
      setActiveVideo(null);
      setActiveQuiz(null);
      const friendlyMsg = err.needsManualTranscript || err.code === 'NO_CAPTIONS_AVAILABLE'
        ? getErrorMessage(err)
        : 'Unable to analyze this video. Please try again.';
      addToast('error', friendlyMsg);

      if (err.needsManualTranscript || err.code === 'NO_CAPTIONS_AVAILABLE' || friendlyMsg.includes('paste a transcript')) {
        setManualTranscriptTitle(err.metadata?.title || '');
        setManualTranscriptError(friendlyMsg);
        setIsManualTranscriptOpen(true);
      }
    } finally {
      if (currentSessionRef.current?.analysisSessionId === newSessionId) {
        setIsLoading(false);
        setLoadingStep('');
      }
    }
  };

  const handleSelectDemo = async (
    demoId: string,
    options?: { language?: string; difficulty?: 'easy' | 'medium' | 'hard'; count?: number }
  ) => {
    const lang = options?.language || selectedLanguage;
    const diff = options?.difficulty || selectedDifficulty;
    const cnt = options?.count || selectedCount;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const canonicalVideoId = demoId;
    const newSessionId = VideoIdentity.createSessionId();

    currentSessionRef.current = {
      analysisSessionId: newSessionId,
      videoId: canonicalVideoId
    };

    setActiveVideo(null);
    setActiveQuiz(null);
    setAssistantMessages([]);
    StorageService.clearQuizSessions(canonicalVideoId, newSessionId);

    setIsLoading(true);
    setLoadingStep('Reading available lesson content...');
    try {
      const processRes = await ApiService.processVideo({
        demoId,
        analysisSessionId: newSessionId,
        signal: controller.signal
      });

      if (
        controller.signal.aborted ||
        currentSessionRef.current?.analysisSessionId !== newSessionId ||
        currentSessionRef.current?.videoId !== canonicalVideoId
      ) {
        setDiscardedCount(prev => prev + 1);
        setLastDiscardedReason(`Stale demo video response discarded for ${demoId}`);
        return;
      }

      setActiveVideo({
        metadata: processRes.metadata,
        transcript: processRes.transcript,
        rawText: processRes.rawText
      });

      setLoadingStep('Analyzing knowledge map & generating 25-question exam quiz...');
      const quiz = await ApiService.generateQuiz({
        videoId: demoId,
        title: processRes.metadata.title,
        transcript: processRes.transcript,
        difficulty: diff,
        count: cnt,
        language: lang,
        analysisSessionId: newSessionId,
        signal: controller.signal
      });

      if (
        controller.signal.aborted ||
        currentSessionRef.current?.analysisSessionId !== newSessionId ||
        currentSessionRef.current?.videoId !== canonicalVideoId
      ) {
        setDiscardedCount(prev => prev + 1);
        setLastDiscardedReason(`Stale demo quiz response discarded for ${demoId}`);
        return;
      }

      StorageService.saveQuizSession(canonicalVideoId, newSessionId, quiz);
      setActiveQuiz(quiz);

      setAssistantMessages([]);
      setActiveTab('quiz');
      addToast('success', `Loaded ${processRes.metadata.title} exam quiz!`);
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setActiveVideo(null);
      setActiveQuiz(null);
      addToast('error', 'Unable to analyze this video. Please try again.');
    } finally {
      if (currentSessionRef.current?.analysisSessionId === newSessionId) {
        setIsLoading(false);
        setLoadingStep('');
      }
    }
  };

  const handleManualTranscriptSubmit = async (title: string, transcriptText: string) => {
    setIsManualTranscriptOpen(false);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const canonicalVideoId = `manual_${Date.now()}`;
    const newSessionId = VideoIdentity.createSessionId();

    currentSessionRef.current = {
      analysisSessionId: newSessionId,
      videoId: canonicalVideoId
    };

    setActiveVideo(null);
    setActiveQuiz(null);
    setAssistantMessages([]);
    StorageService.clearQuizSessions(canonicalVideoId, newSessionId);

    setIsLoading(true);
    setLoadingStep('Processing custom transcript...');

    try {
      const processRes = await ApiService.processVideo({
        manualTranscript: transcriptText,
        analysisSessionId: newSessionId,
        signal: controller.signal
      });

      if (
        controller.signal.aborted ||
        currentSessionRef.current?.analysisSessionId !== newSessionId ||
        currentSessionRef.current?.videoId !== canonicalVideoId
      ) {
        setDiscardedCount(prev => prev + 1);
        return;
      }

      const customMetadata: VideoMetadata = {
        ...processRes.metadata,
        id: canonicalVideoId,
        title: title || 'Custom Lecture Notes',
        author: 'Manual Transcript',
        thumbnailUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80'
      };

      setActiveVideo({
        metadata: customMetadata,
        transcript: processRes.transcript,
        rawText: transcriptText
      });

      setLoadingStep('Analyzing concepts & generating 25-question exam quiz...');
      const quiz = await ApiService.generateQuiz({
        videoId: canonicalVideoId,
        title: customMetadata.title,
        transcript: processRes.transcript,
        difficulty: selectedDifficulty,
        count: selectedCount,
        language: selectedLanguage,
        analysisSessionId: newSessionId,
        signal: controller.signal
      });

      if (
        controller.signal.aborted ||
        currentSessionRef.current?.analysisSessionId !== newSessionId ||
        currentSessionRef.current?.videoId !== canonicalVideoId
      ) {
        setDiscardedCount(prev => prev + 1);
        return;
      }

      StorageService.saveQuizSession(canonicalVideoId, newSessionId, quiz);
      setActiveQuiz(quiz);

      setAssistantMessages([]);
      setActiveTab('quiz');
      addToast('success', '25-Question exam quiz generated from custom transcript!');
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setActiveVideo(null);
      setActiveQuiz(null);
      addToast('error', 'Unable to analyze this video. Please try again.');
    } finally {
      if (currentSessionRef.current?.analysisSessionId === newSessionId) {
        setIsLoading(false);
        setLoadingStep('');
      }
    }
  };

  // ===================== REGENERATE / LANGUAGE CHANGE =====================

  const handleLanguageChange = async (newLang: string) => {
    setSelectedLanguage(newLang);
    if (!activeVideo) return;

    const newSessionId = VideoIdentity.createSessionId();
    const vid = activeVideo.metadata.id;
    currentSessionRef.current = {
      analysisSessionId: newSessionId,
      videoId: vid
    };

    setIsRegenerating(true);
    try {
      const quiz = await ApiService.generateQuiz({
        videoId: vid,
        videoUrl: activeVideo.metadata.url,
        title: activeVideo.metadata.title,
        transcript: activeVideo.transcript,
        difficulty: selectedDifficulty,
        count: selectedCount,
        language: newLang,
        analysisSessionId: newSessionId
      });

      if (currentSessionRef.current?.analysisSessionId !== newSessionId) return;

      StorageService.saveQuizSession(vid, newSessionId, quiz);
      setActiveQuiz(quiz);
      addToast('success', `Adapted 25-question quiz into selected language!`);
    } catch (err: any) {
      addToast('error', 'Unable to analyze this video. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!activeVideo) return;
    const newSessionId = VideoIdentity.createSessionId();
    const vid = activeVideo.metadata.id;
    currentSessionRef.current = {
      analysisSessionId: newSessionId,
      videoId: vid
    };

    setIsRegenerating(true);
    try {
      const quiz = await ApiService.generateQuiz({
        videoId: vid,
        videoUrl: activeVideo.metadata.url,
        title: activeVideo.metadata.title,
        transcript: activeVideo.transcript,
        difficulty: selectedDifficulty,
        count: selectedCount,
        language: selectedLanguage,
        analysisSessionId: newSessionId
      });

      if (currentSessionRef.current?.analysisSessionId !== newSessionId) return;

      StorageService.saveQuizSession(vid, newSessionId, quiz);
      setActiveQuiz(quiz);
      addToast('success', '25-Question exam quiz regenerated!');
    } catch (err: any) {
      addToast('error', 'Unable to analyze this video. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  // ===================== QUIZ ACTIONS =====================

  const handleGenerateQuiz = async (difficulty: 'easy' | 'medium' | 'hard' = 'medium', count: number = 25) => {
    if (!activeVideo || isGeneratingQuiz) return;
    const newSessionId = VideoIdentity.createSessionId();
    const vid = activeVideo.metadata.id;
    currentSessionRef.current = {
      analysisSessionId: newSessionId,
      videoId: vid
    };

    setIsGeneratingQuiz(true);
    try {
      const quiz = await ApiService.generateQuiz({
        videoId: vid,
        videoUrl: activeVideo.metadata.url,
        title: activeVideo.metadata.title,
        transcript: activeVideo.transcript,
        difficulty,
        count,
        language: selectedLanguage,
        analysisSessionId: newSessionId
      });

      if (currentSessionRef.current?.analysisSessionId !== newSessionId) return;

      StorageService.saveQuizSession(vid, newSessionId, quiz);
      setActiveQuiz(quiz);
      addToast('success', `Created ${quiz.questions.length} ${difficulty} exam questions!`);
    } catch (err: unknown) {
      console.error('Quiz generation error:', err);
      addToast('error', 'Unable to analyze this video. Please try again.');
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

    if (item.quiz) setActiveQuiz(item.quiz);
    setAssistantMessages([]);
    setActiveTab('quiz');
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
    if (!activeVideo) return;
    const historyItem: HistoryItem = {
      id: `hist_${activeVideo.metadata.id}_${Date.now()}`,
      videoId: activeVideo.metadata.id,
      url: activeVideo.metadata.url,
      title: activeVideo.metadata.title,
      author: activeVideo.metadata.author,
      thumbnailUrl: activeVideo.metadata.thumbnailUrl,
      createdAt: new Date().toISOString(),
      quiz: activeQuiz || undefined
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

  // Hard filter of visible tabs
  const availableTabs = [
    {
      id: 'quiz' as const,
      label: '25-Question Exam Quiz',
      icon: HelpCircle,
      badge: activeQuiz ? `${activeQuiz.questions.length} Qs` : undefined
    },
    {
      id: 'assistant' as const,
      label: 'AI Tutor',
      icon: Brain,
      badge: undefined
    }
  ].filter(tab => !isFeatureDisabled(tab.id) && !isFeatureDisabled(tab.label));

  return (
    <div className="min-h-screen flex flex-col text-[#17172D] transition-colors relative">
      <Header
        theme={theme}
        themeMode={themeMode}
        onSelectThemeMode={handleSelectThemeMode}
        onToggleTheme={toggleTheme}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onGoHome={() => setActiveVideo(null)}
        historyCount={history.length}
        hasActiveVideo={Boolean(activeVideo)}
        activeSection={
          !activeVideo
            ? 'home'
            : activeTab === 'assistant'
            ? 'ai-tutor'
            : 'practice'
        }
        onNavigateSection={section => {
          if (section === 'home') {
            setActiveVideo(null);
          } else if (section === 'ai-tutor') {
            if (activeVideo) {
              setActiveTab('assistant');
            } else if (demos.length > 0) {
              handleSelectDemo(demos[0].id);
              setActiveTab('assistant');
            }
          } else if (section === 'practice') {
            if (activeVideo) {
              setActiveTab('quiz');
            } else if (demos.length > 0) {
              handleSelectDemo(demos[0].id);
              setActiveTab('quiz');
            }
          } else if (section === 'my-learning') {
            setIsHistoryOpen(true);
          } else if (section === 'profile') {
            setIsSettingsOpen(true);
          }
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
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

            {/* Navigation Tabs Bar — Spatial Floating Glass Pill Strip */}
            <div className="sticky top-20 z-30 flex items-center justify-start sm:justify-center p-1.5 rounded-full bg-white/85 backdrop-blur-xl border border-[#DFE1F0] shadow-resting gap-1 sm:gap-2 overflow-x-auto max-w-fit mx-auto transition-all">
              {availableTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-2 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap active:scale-95 ${
                      isActive
                        ? 'bg-[#EEEEFF] text-[#4938C8] shadow-xs'
                        : 'text-[#666A83] hover:text-[#4938C8] hover:bg-[#EEEEFF]/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#5B46E8]' : ''}`} />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-[#4938C8] shadow-xs">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Tab Views — Strictly Filtered */}
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

      <DevDebugPanel
        analysisSessionId={currentSessionRef.current?.analysisSessionId}
        videoId={currentSessionRef.current?.videoId}
        transcriptHash={activeQuiz?.transcriptHash}
        conceptCount={activeQuiz?.topicCoverageReport?.coveredConcepts?.length || 0}
        questionCount={activeQuiz?.questions?.length || 0}
        questions={activeQuiz?.questions || []}
        discardedCount={discardedCount}
        lastDiscardedReason={lastDiscardedReason}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
