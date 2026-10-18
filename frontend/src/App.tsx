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
import { getErrorMessage, parseErrorDetails } from './utils';
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

  // Phase 2 & 4: Active Session, Attempt & Cancellation Refs
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const currentSessionRef = React.useRef<{
    analysisSessionId: string;
    generationAttemptId: string;
    videoId: string;
    sourceUrl?: string;
    url?: string;
  } | null>(null);
  const [generationAttemptId, setGenerationAttemptId] = useState<string>('att_1');
  const [retryCount, setRetryCount] = useState<number>(0);
  const [consecutiveFailures, setConsecutiveFailures] = useState<{ stage: string; count: number }>({ stage: '', count: 0 });
  const [lastErrorDiagnostic, setLastErrorDiagnostic] = useState<{
    code?: string;
    stage?: string;
    message?: string;
    refId?: string;
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
  const [quizGeneratingStage, setQuizGeneratingStage] = useState<string>('');
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
    StorageService.initStorage();
    cleanOldFeatureStorage();

    const cleanupSync = StorageService.onHistorySync((clearedAt) => {
      console.log(`[App] Received cross-tab history clear broadcast (clearedAt=${clearedAt}), resetting state.`);
      setHistory([]);
      setActiveVideo(null);
      setActiveQuiz(null);
      setAssistantMessages([]);
      currentSessionRef.current = null;
    });

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

    return () => {
      cleanupSync();
    };
  }, []);

  const addToast = (
    type: 'success' | 'error' | 'info',
    rawMessage: string,
    onRetry?: () => void,
    retryLabel?: string
  ) => {
    const parsed = type === 'error' ? parseErrorDetails(rawMessage) : null;
    if (parsed && parsed.code === 'SESSION_SUPERSEDED') {
      return; // Do not show an error when a newer video replaced this one
    }
    const message = parsed ? parsed.message : rawMessage;
    if (!message) return;

    setToasts(prev => {
      // De-duplicate: show each failure once; ignore if identical message already shown
      if (prev.some(t => t.message === message && t.type === type)) {
        return prev;
      }
      const id = `toast_${Date.now()}_${Math.random()}`;
      return [...prev, { id, type, message, onRetry, retryLabel }];
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
    if (isLoading) return;

    const requestedUrl = (url || '').trim();
    if (!requestedUrl) {
      addToast('error', 'Please paste a valid YouTube video link to begin.');
      return;
    }

    let envelope;
    try {
      envelope = VideoIdentity.createIdentityEnvelope(requestedUrl);
    } catch {
      addToast('error', 'Please enter a valid YouTube link (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...).');
      return;
    }

    const lang = options?.language || selectedLanguage;
    const diff = options?.difficulty || selectedDifficulty;
    const cnt = options?.count || selectedCount;

    // 1. Phase 2: Cancel any in-flight requests from prior submissions immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 2. Assign immutable identity envelope for this submission
    currentSessionRef.current = envelope;
    setGenerationAttemptId(envelope.generationAttemptId);
    setRetryCount(0);
    setConsecutiveFailures({ stage: '', count: 0 });
    setLastErrorDiagnostic(null);

    // 3. Phase 2 & 3 Rule: The moment a new URL is submitted, synchronously clear all previous state
    setActiveVideo(null);
    setActiveQuiz(null);
    setAssistantMessages([]);
    StorageService.clearQuizSessions();

    setIsLoading(true);
    setLoadingStep('Fetching captions & transcript...');
    try {
      const processRes = await ApiService.processVideo({
        url: envelope.sourceUrl,
        language: lang,
        analysisSessionId: envelope.analysisSessionId,
        signal: controller.signal
      });

      // Verification before applying response: latest session wins
      if (
        controller.signal.aborted ||
        currentSessionRef.current?.analysisSessionId !== envelope.analysisSessionId ||
        currentSessionRef.current?.videoId !== envelope.videoId
      ) {
        console.warn(`[SessionIsolation] Discarding stale transcript for ${envelope.videoId}`);
        setDiscardedCount(prev => prev + 1);
        setLastDiscardedReason(`Stale transcript response discarded for ${envelope.videoId}`);
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
          videoId: envelope.videoId,
          sourceUrl: envelope.sourceUrl,
          videoUrl: envelope.sourceUrl,
          title: processRes.metadata.title,
          transcript: processRes.transcript,
          difficulty: diff,
          count: cnt,
          language: lang,
          analysisSessionId: envelope.analysisSessionId,
          generationAttemptId: envelope.generationAttemptId,
          signal: controller.signal
        });

        // Verification before applying quiz response: latest session & attempt must match
        if (
          controller.signal.aborted ||
          currentSessionRef.current?.analysisSessionId !== envelope.analysisSessionId ||
          currentSessionRef.current?.generationAttemptId !== envelope.generationAttemptId ||
          currentSessionRef.current?.videoId !== envelope.videoId
        ) {
          console.warn(`[SessionIsolation] Discarding stale quiz for ${envelope.videoId}`);
          setDiscardedCount(prev => prev + 1);
          setLastDiscardedReason(`Stale quiz response discarded for session ${envelope.analysisSessionId}`);
          return;
        }

        StorageService.saveQuizSession(envelope.videoId, envelope.analysisSessionId, quizData);
        setActiveQuiz(quizData);
        setConsecutiveFailures({ stage: '', count: 0 });
        setLastErrorDiagnostic(null);
      } catch (quizErr: any) {
        if (controller.signal.aborted) return;
        console.warn('Initial concept quiz generation warning:', quizErr);
        const parsed = parseErrorDetails(quizErr);
        const errStage = quizErr.stage || parsed.stage || 'pipeline';
        setLastErrorDiagnostic({
          code: quizErr.code || parsed.code,
          stage: errStage,
          message: parsed.message,
          refId: quizErr.refId || parsed.refId
        });
        setConsecutiveFailures({ stage: errStage, count: 1 });

        if (import.meta.env.DEV) {
          console.error(
            `[ANALYSIS ERROR]\n` +
            `session: ${envelope.analysisSessionId}\n` +
            `videoId: ${envelope.videoId}\n` +
            `stage: ${errStage}\n` +
            `code: ${quizErr.code || parsed.code}\n` +
            `message: ${parsed.message}\n` +
            `refId: ${quizErr.refId || parsed.refId || 'none'}`
          );
        }

        if (parsed.code !== 'SESSION_SUPERSEDED') {
          const retryLabel = errStage.toUpperCase().includes('CONCEPT')
            ? 'Retry Concept Analysis'
            : 'Retry Quiz Generation';
          const retryAction = parsed.retryable ? () => handleGenerateQuiz(diff, cnt, true) : undefined;
          addToast('error', parsed.message, retryAction, retryLabel);
        }
        setActiveQuiz(null);
        return;
      }

      setAssistantMessages([]);
      setActiveTab('quiz');

      // Auto-save to history
      const historyItem: HistoryItem = {
        id: `hist_${envelope.videoId}_${Date.now()}`,
        videoId: envelope.videoId,
        url: processRes.metadata.url,
        title: processRes.metadata.title,
        author: processRes.metadata.author,
        thumbnailUrl: processRes.metadata.thumbnailUrl,
        createdAt: new Date().toISOString(),
        quiz: quizData || undefined,
        transcript: processRes.transcript,
        rawText: processRes.rawText
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
      const parsed = parseErrorDetails(err);
      const errStage = err.stage || parsed.stage || 'FETCH_TRANSCRIPT';

      if (import.meta.env.DEV) {
        console.error(
          `[ANALYSIS ERROR]\n` +
          `session: ${envelope?.analysisSessionId}\n` +
          `videoId: ${envelope?.videoId}\n` +
          `youtubeUrl: ${url}\n` +
          `stage: ${errStage}\n` +
          `code: ${err.code || parsed.code}\n` +
          `message: ${parsed.message}\n` +
          `refId: ${err.refId || parsed.refId || 'none'}`
        );
      }

      if (parsed.code !== 'SESSION_SUPERSEDED') {
        const retryLabel = (errStage.toUpperCase().includes('URL') || errStage.toUpperCase().includes('METADATA') || errStage.toUpperCase().includes('TRANSCRIPT'))
          ? 'Retry Transcript'
          : 'Retry Analysis';
        const retryAction = parsed.retryable ? () => handleProcessUrl(url, options) : undefined;
        addToast('error', parsed.message, retryAction, retryLabel);
      }

      if (err.needsManualTranscript || err.code === 'NO_CAPTIONS_AVAILABLE' || parsed.code === 'TRANSCRIPT_UNAVAILABLE' || parsed.message.includes('paste a transcript')) {
        setManualTranscriptTitle(err.metadata?.title || '');
        setManualTranscriptError(parsed.message);
        setIsManualTranscriptOpen(true);
      }
    } finally {
      if (currentSessionRef.current?.analysisSessionId === envelope?.analysisSessionId) {
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
      generationAttemptId: 'att_1',
      videoId: canonicalVideoId
    };
    setGenerationAttemptId('att_1');
    setRetryCount(0);
    setConsecutiveFailures({ stage: '', count: 0 });
    setLastErrorDiagnostic(null);

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
        generationAttemptId: 'att_1',
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
      setConsecutiveFailures({ stage: '', count: 0 });
      setLastErrorDiagnostic(null);

      setAssistantMessages([]);
      setActiveTab('quiz');
      addToast('success', `Loaded ${processRes.metadata.title} exam quiz!`);
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setActiveVideo(null);
      setActiveQuiz(null);
      const parsed = parseErrorDetails(err);
      const errStage = err.stage || parsed.stage || 'pipeline';
      setLastErrorDiagnostic({
        code: err.code || parsed.code,
        stage: errStage,
        message: parsed.message,
        refId: err.refId || parsed.refId
      });
      setConsecutiveFailures({ stage: errStage, count: 1 });
      if (parsed.code !== 'SESSION_SUPERSEDED') {
        const retryAction = parsed.retryable ? () => handleGenerateQuiz(diff, cnt, true) : undefined;
        addToast('error', parsed.message, retryAction);
      }
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
      generationAttemptId: 'att_1',
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
      const parsed = parseErrorDetails(err);
      if (parsed.code !== 'SESSION_SUPERSEDED') {
        addToast('error', parsed.message);
      }
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

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const newSessionId = VideoIdentity.createSessionId();
    const attemptId = VideoIdentity.createAttemptId(1);
    const vid = activeVideo.metadata.id;
    currentSessionRef.current = {
      analysisSessionId: newSessionId,
      generationAttemptId: attemptId,
      videoId: vid,
      sourceUrl: activeVideo.metadata.url
    };

    setActiveQuiz(null);
    setIsRegenerating(true);
    try {
      const quiz = await ApiService.generateQuiz({
        videoId: vid,
        sourceUrl: activeVideo.metadata.url,
        videoUrl: activeVideo.metadata.url,
        title: activeVideo.metadata.title,
        transcript: activeVideo.transcript,
        difficulty: selectedDifficulty,
        count: selectedCount,
        language: newLang,
        analysisSessionId: newSessionId,
        generationAttemptId: attemptId,
        signal: controller.signal
      });

      if (
        controller.signal.aborted ||
        currentSessionRef.current?.analysisSessionId !== newSessionId ||
        currentSessionRef.current?.videoId !== vid
      ) {
        return;
      }

      StorageService.saveQuizSession(vid, newSessionId, quiz);
      setActiveQuiz(quiz);
      addToast('success', `Adapted 25-question quiz into selected language!`);
    } catch (err: any) {
      if (controller.signal.aborted) return;
      const parsed = parseErrorDetails(err);
      if (parsed.code !== 'SESSION_SUPERSEDED') {
        const retryAction = parsed.retryable ? () => handleLanguageChange(newLang) : undefined;
        addToast('error', parsed.message, retryAction);
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!activeVideo) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const newSessionId = VideoIdentity.createSessionId();
    const attemptId = VideoIdentity.createAttemptId(1);
    const vid = activeVideo.metadata.id;
    currentSessionRef.current = {
      analysisSessionId: newSessionId,
      generationAttemptId: attemptId,
      videoId: vid,
      sourceUrl: activeVideo.metadata.url
    };

    setActiveQuiz(null);
    setIsRegenerating(true);
    try {
      const quiz = await ApiService.generateQuiz({
        videoId: vid,
        sourceUrl: activeVideo.metadata.url,
        videoUrl: activeVideo.metadata.url,
        title: activeVideo.metadata.title,
        transcript: activeVideo.transcript,
        difficulty: selectedDifficulty,
        count: selectedCount,
        language: selectedLanguage,
        analysisSessionId: newSessionId,
        generationAttemptId: attemptId,
        signal: controller.signal
      });

      if (
        controller.signal.aborted ||
        currentSessionRef.current?.analysisSessionId !== newSessionId ||
        currentSessionRef.current?.videoId !== vid
      ) {
        return;
      }

      StorageService.saveQuizSession(vid, newSessionId, quiz);
      setActiveQuiz(quiz);
      addToast('success', '25-Question exam quiz regenerated!');
    } catch (err: any) {
      if (controller.signal.aborted) return;
      const parsed = parseErrorDetails(err);
      if (parsed.code !== 'SESSION_SUPERSEDED') {
        const retryAction = parsed.retryable ? () => handleRegenerate() : undefined;
        addToast('error', parsed.message, retryAction);
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  // ===================== QUIZ ACTIONS =====================

  const handleGenerateQuiz = async (
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    count: number = 25,
    isRetry = false
  ) => {
    if (!activeVideo || isGeneratingQuiz) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let targetSessionId = currentSessionRef.current?.analysisSessionId;
    let nextAttempt = 'att_1';

    if (isRetry && targetSessionId) {
      const nextNum = retryCount + 2;
      nextAttempt = VideoIdentity.createAttemptId(nextNum);
      setRetryCount(prev => prev + 1);
    } else {
      targetSessionId = VideoIdentity.createSessionId();
      nextAttempt = VideoIdentity.createAttemptId(1);
      setRetryCount(0);
      setConsecutiveFailures({ stage: '', count: 0 });
    }

    setGenerationAttemptId(nextAttempt);
    const vid = activeVideo.metadata.id;
    currentSessionRef.current = {
      analysisSessionId: targetSessionId,
      generationAttemptId: nextAttempt,
      videoId: vid,
      sourceUrl: activeVideo.metadata.url
    };

    // Keep user selections after failure
    setSelectedDifficulty(difficulty);
    setSelectedCount(count);

    // Synchronously clear previous quiz so old quiz is never visible while generating
    setActiveQuiz(null);
    setIsGeneratingQuiz(true);
    setQuizGeneratingStage(isRetry ? 'Resuming from validated stage checkpoints...' : 'Fetching captions');
    setLastErrorDiagnostic(null);

    try {
      const sTimer1 = setTimeout(() => setQuizGeneratingStage('Finding concepts'), 600);
      const sTimer2 = setTimeout(() => setQuizGeneratingStage('Planning the quiz'), 1200);
      const sTimer3 = setTimeout(() => setQuizGeneratingStage('Writing questions'), 2000);
      const sTimer4 = setTimeout(() => setQuizGeneratingStage('Checking answers'), 3500);

      const quiz = await ApiService.generateQuiz({
        videoId: vid,
        sourceUrl: activeVideo.metadata.url,
        videoUrl: activeVideo.metadata.url,
        title: activeVideo.metadata.title,
        transcript: activeVideo.transcript,
        difficulty,
        count,
        language: selectedLanguage,
        analysisSessionId: targetSessionId,
        generationAttemptId: nextAttempt,
        signal: controller.signal
      });

      clearTimeout(sTimer1);
      clearTimeout(sTimer2);
      clearTimeout(sTimer3);
      clearTimeout(sTimer4);

      if (
        controller.signal.aborted ||
        currentSessionRef.current?.analysisSessionId !== targetSessionId ||
        currentSessionRef.current?.generationAttemptId !== nextAttempt ||
        currentSessionRef.current?.videoId !== vid
      ) {
        console.warn(`[SessionIsolation] Stale response discarded for ${targetSessionId}/${nextAttempt}`);
        setDiscardedCount(prev => prev + 1);
        setLastDiscardedReason(`Stale quiz response discarded`);
        return;
      }

      StorageService.saveQuizSession(vid, targetSessionId, quiz);
      setActiveQuiz(quiz);
      setConsecutiveFailures({ stage: '', count: 0 });
      setLastErrorDiagnostic(null);
      addToast('success', `${isRetry ? 'Recovered! ' : ''}Created ${quiz.questions.length} ${difficulty} exam questions!`);
    } catch (err: unknown) {
      console.error('Quiz generation error:', err);
      const anyErr = err as any;
      const parsed = parseErrorDetails(anyErr);
      if (parsed.code === 'SESSION_SUPERSEDED') return;

      const errStage = anyErr.stage || parsed.stage || 'pipeline';
      const refId = anyErr.refId || parsed.refId;

      if (import.meta.env.DEV) {
        console.error(
          `[ANALYSIS ERROR]\n` +
          `session: ${targetSessionId}\n` +
          `videoId: ${vid}\n` +
          `stage: ${errStage}\n` +
          `code: ${anyErr.code || parsed.code}\n` +
          `message: ${parsed.message}\n` +
          `refId: ${refId || 'none'}`
        );
      }

      setLastErrorDiagnostic({
        code: anyErr.code || parsed.code,
        stage: errStage,
        message: parsed.message,
        refId
      });

      const nextFailCount = consecutiveFailures.stage === errStage ? consecutiveFailures.count + 1 : 1;
      setConsecutiveFailures({ stage: errStage, count: nextFailCount });

      if (nextFailCount >= 2) {
        addToast(
          'error',
          `${parsed.message} (Failed twice at stage: ${errStage}). Try another video or paste transcript.`,
          () => {
            setManualTranscriptTitle(activeVideo.metadata.title);
            setManualTranscriptError(`Multiple generation failures at stage: ${errStage}`);
            setIsManualTranscriptOpen(true);
          }
        );
      } else {
        const retryLabel = errStage.toUpperCase().includes('CONCEPT')
          ? 'Retry Concept Analysis'
          : 'Retry Quiz Generation';
        const retryAction = parsed.retryable ? () => handleGenerateQuiz(difficulty, count, true) : undefined;
        addToast('error', parsed.message, retryAction, retryLabel);
      }
    } finally {
      setIsGeneratingQuiz(false);
      setQuizGeneratingStage('');
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

  const handleResetToHome = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setActiveVideo(null);
    setActiveQuiz(null);
    setAssistantMessages([]);
    currentSessionRef.current = null;
    StorageService.clearQuizSessions();
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const canonicalVideoId = VideoIdentity.parseCanonicalVideoId(item.videoId || item.url) || item.videoId;
    const newSessionId = item.quiz?.analysisSessionId || VideoIdentity.createSessionId();

    currentSessionRef.current = {
      sourceUrl: item.url,
      videoId: canonicalVideoId,
      analysisSessionId: newSessionId,
      generationAttemptId: 'att_1'
    };

    const initialTranscript = item.transcript || [];
    const initialRawText = item.rawText || '';

    setActiveVideo({
      metadata: {
        id: canonicalVideoId,
        url: item.url,
        title: item.title,
        author: item.author,
        thumbnailUrl: item.thumbnailUrl,
        embedUrl: `https://www.youtube.com/embed/${canonicalVideoId}`
      },
      transcript: initialTranscript,
      rawText: initialRawText
    });

    // If transcript was not stored in history, fetch it now so retries/regenerate work reliably
    if (initialTranscript.length === 0 && item.url) {
      ApiService.processVideo({ url: item.url, analysisSessionId: newSessionId })
        .then(procRes => {
          setActiveVideo(prev => {
            if (prev && prev.metadata.id === canonicalVideoId) {
              return {
                ...prev,
                transcript: procRes.transcript,
                rawText: procRes.rawText
              };
            }
            return prev;
          });
        })
        .catch(() => {
          // Non-blocking fetch notice
        });
    }

    if (item.quiz && item.quiz.videoId === canonicalVideoId) {
      setActiveQuiz(item.quiz);
    } else {
      setActiveQuiz(null);
    }
    setAssistantMessages([]);
    setActiveTab('quiz');
    addToast('info', `Opened "${item.title}"`);
  };

  const handleDeleteHistoryItem = async (id: string) => {
    await ApiService.deleteHistory(id);
    setHistory(prev => prev.filter(h => h.id !== id));
    addToast('info', 'Item removed from history.');
  };

  const handleClearAllHistory = async () => {
    const confirmed = window.confirm(
      'This will permanently delete your learning history, attempts, and cached quizzes. Are you sure you want to proceed?'
    );
    if (!confirmed) return;

    StorageService.setClearingGuard(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
    }

    try {
      await ApiService.clearAllHistory();
      StorageService.clearAllClientStorage();
      setHistory([]);
      setActiveVideo(null);
      setActiveQuiz(null);
      setAssistantMessages([]);
      currentSessionRef.current = null;
      addToast('info', 'All learning history and cached quizzes have been permanently cleared.');
    } catch (err: any) {
      console.error('Failed to clear history:', err);
      addToast('error', err.message || 'Failed to clear history on server. Previous history was preserved.');
    } finally {
      StorageService.setClearingGuard(false);
    }
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
        onGoHome={handleResetToHome}
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
            handleResetToHome();
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
                videoId={activeVideo?.metadata.id}
                analysisSessionId={currentSessionRef.current?.analysisSessionId}
                onGenerateQuiz={handleGenerateQuiz}
                isGenerating={isGeneratingQuiz}
                generatingStage={quizGeneratingStage}
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
        generationAttemptId={currentSessionRef.current?.generationAttemptId || generationAttemptId}
        videoId={activeVideo?.metadata?.id || currentSessionRef.current?.videoId}
        transcriptHash={activeQuiz?.transcriptHash}
        currentStage={isLoading ? loadingStep : isGeneratingQuiz ? quizGeneratingStage : activeQuiz ? 'Quiz Ready' : 'Idle'}
        conceptCount={activeQuiz?.persistedKnowledgeMap?.allowedConceptIds?.length || activeQuiz?.topicCoverageReport?.coveredConcepts?.length || 0}
        coveredConcepts={activeQuiz?.topicCoverageReport?.coveredConcepts?.length || 0}
        blueprintCount={activeQuiz?.quizBlueprint?.slots?.length || activeQuiz?.questions?.length || 0}
        validCount={activeQuiz?.questions?.length || 0}
        retryCount={retryCount}
        lastError={lastErrorDiagnostic}
        questions={activeQuiz?.questions || []}
        discardedCount={discardedCount}
        lastDiscardedReason={lastDiscardedReason}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
