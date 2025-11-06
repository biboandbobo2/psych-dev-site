import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type { RevealPolicy, TestQuestion, TestResource, QuestionAnswer } from '../types/tests';
import {
  DEFAULT_ANSWER_PRESETS,
  MAX_QUESTION_ANSWERS,
  MAX_REVEAL_ATTEMPTS,
  MIN_QUESTION_ANSWERS,
} from '../types/tests';
import { QuestionPreview } from './QuestionPreview';
import {
  uploadQuestionImage,
  uploadQuestionAudio,
  deleteMediaFile,
  validateYouTubeUrl,
  getYouTubeEmbedUrl,
} from '../utils/mediaUpload';

const QUESTION_TEXT_LIMIT = 280;

type CopyState = 'idle' | 'success' | 'error';

const generateAnswerId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `answer-${Math.random().toString(36).slice(2, 10)}`;
};

const trimAnswersToTarget = (
  answers: QuestionAnswer[],
  target: number,
  correctAnswerId: string | null
) => {
  const next = [...answers];

  const isCorrect = (answer: QuestionAnswer) =>
    correctAnswerId != null && answer.id === correctAnswerId;

  const removeAtIndex = (index: number) => {
    if (index < 0 || index >= next.length) return false;
    if (isCorrect(next[index])) return false;
    next.splice(index, 1);
    return true;
  };

  while (next.length > target) {
    let removed = false;

    for (let index = next.length - 1; index >= 0; index -= 1) {
      if (isCorrect(next[index])) continue;
      if (next[index].text.trim() === '') {
        removed = removeAtIndex(index);
        if (removed) break;
      }
    }

    if (!removed) {
      for (let index = next.length - 1; index >= 0; index -= 1) {
        if (removeAtIndex(index)) {
          removed = true;
          break;
        }
      }
    }

    if (!removed) {
      break;
    }
  }

  return next;
};

interface QuestionEditorProps {
  question: TestQuestion;
  questionNumber: number;
  onChange: (question: TestQuestion) => void;
  onDelete: () => void;
  onRequestSave?: () => void;
  testRevealPolicy?: RevealPolicy | null;
  testId?: string | null;
}

export function QuestionEditor({
  question,
  questionNumber,
  onChange,
  onDelete,
  onRequestSave,
  testRevealPolicy,
  testId,
}: QuestionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [pendingFocusAnswerId, setPendingFocusAnswerId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState(question.videoUrl || '');
  const [videoUrlError, setVideoUrlError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const answerRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const questionHintId = useId();
  const answersHintId = useId();
  const revealHintId = useId();

  const answers = question.answers;
  const resourcesRight = question.resourcesRight ?? [];
  const resourcesWrong = question.resourcesWrong ?? [];

  const trimmedQuestionText = question.questionText.trim();
  const nonEmptyAnswers = useMemo(
    () => answers.filter((answer) => answer.text.trim().length > 0),
    [answers]
  );
  const hasCorrectAnswer = useMemo(
    () => !!question.correctAnswerId && answers.some((answer) => answer.id === question.correctAnswerId),
    [answers, question.correctAnswerId]
  );

  const questionError = trimmedQuestionText.length === 0 ? 'Введите текст вопроса' : null;
  const questionHintText =
    'Ctrl/⌘+Enter — сохранить; до 280 символов, поддерживаются переносы строк';
  const answersError =
    nonEmptyAnswers.length < MIN_QUESTION_ANSWERS
      ? `Нужно минимум ${MIN_QUESTION_ANSWERS} непустых вариантов`
      : null;
  const correctAnswerError = hasCorrectAnswer ? null : 'Выберите правильный ответ';

  const isQuestionComplete = !questionError && !answersError && !correctAnswerError;
  const statusChip = isQuestionComplete
    ? { label: 'OK', className: 'bg-green-100 text-green-800' }
    : { label: 'Не заполнен', className: 'bg-yellow-100 text-yellow-800' };

  useEffect(() => {
    const keys = new Set(answers.map((answer) => answer.id));
    Object.keys(answerRefs.current).forEach((key) => {
      if (!keys.has(key)) {
        delete answerRefs.current[key];
      }
    });
  }, [answers]);

  useEffect(() => {
    if (!pendingFocusAnswerId) return;
    const input = answerRefs.current[pendingFocusAnswerId];
    if (input) {
      input.focus();
      input.select();
      setPendingFocusAnswerId(null);
    }
  }, [answers, pendingFocusAnswerId]);

  useEffect(() => {
    if (copyState === 'idle' || typeof window === 'undefined') return;
    const timeout = window.setTimeout(
      () => setCopyState('idle'),
      copyState === 'success' ? 2000 : 3000
    );
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  const commitAnswers = (nextAnswers: QuestionAnswer[], nextCorrectId?: string | null) => {
    const requestedCorrectId =
      nextCorrectId !== undefined ? nextCorrectId : question.correctAnswerId;
    const sanitizedCorrectId =
      requestedCorrectId && nextAnswers.some((answer) => answer.id === requestedCorrectId)
        ? requestedCorrectId
        : null;

    onChange({
      ...question,
      answers: nextAnswers.slice(0, MAX_QUESTION_ANSWERS),
      correctAnswerId: sanitizedCorrectId,
    });
  };

  const handleQuestionTextChange = (value: string) => {
    onChange({ ...question, questionText: value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !testId) return;

    try {
      setUploadingImage(true);
      const imageUrl = await uploadQuestionImage(testId, question.id, file);
      onChange({ ...question, imageUrl });
      // Не вызываем onRequestSave, чтобы не выкидывать из редактора
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка загрузки изображения');
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleImageRemove = async () => {
    if (!question.imageUrl) return;
    try {
      await deleteMediaFile(question.imageUrl);
      onChange({ ...question, imageUrl: undefined });
    } catch (error) {
      console.error('Ошибка удаления изображения:', error);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !testId) return;

    try {
      setUploadingAudio(true);
      const audioUrl = await uploadQuestionAudio(testId, question.id, file);
      onChange({ ...question, audioUrl });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка загрузки аудио');
    } finally {
      setUploadingAudio(false);
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    }
  };

  const handleAudioRemove = async () => {
    if (!question.audioUrl) return;
    try {
      await deleteMediaFile(question.audioUrl);
      onChange({ ...question, audioUrl: undefined });
    } catch (error) {
      console.error('Ошибка удаления аудио:', error);
    }
  };

  const handleVideoUrlChange = (value: string) => {
    setVideoUrlInput(value);
    setVideoUrlError(null);
  };

  const handleVideoUrlSave = () => {
    if (!videoUrlInput.trim()) {
      onChange({ ...question, videoUrl: undefined });
      setVideoUrlError(null);
      return;
    }

    const validation = validateYouTubeUrl(videoUrlInput);
    if (!validation.valid) {
      setVideoUrlError(validation.error || 'Неверный URL');
      return;
    }

    onChange({ ...question, videoUrl: videoUrlInput });
    setVideoUrlError(null);
  };

  const handleAnswerTextChange = (answerId: string, value: string) => {
    const nextAnswers = answers.map((answer) =>
      answer.id === answerId ? { ...answer, text: value } : answer
    );
    commitAnswers(nextAnswers);
  };

  const handleAddAnswer = () => {
    if (answers.length >= MAX_QUESTION_ANSWERS) return;
    const newAnswer = { id: generateAnswerId(), text: '' };
    commitAnswers([...answers, newAnswer]);
    setPendingFocusAnswerId(newAnswer.id);
  };

  const handleRemoveAnswer = () => {
    if (answers.length <= MIN_QUESTION_ANSWERS) return;
    const targetLength = answers.length - 1;
    const trimmed = trimAnswersToTarget(answers, targetLength, question.correctAnswerId);
    if (trimmed.length === answers.length) return;
    commitAnswers(trimmed);
  };

  const handlePresetChange = (preset: number) => {
    const normalized = Math.max(
      MIN_QUESTION_ANSWERS,
      Math.min(MAX_QUESTION_ANSWERS, preset)
    );

    if (normalized === answers.length) return;

    let nextAnswers = [...answers];
    if (nextAnswers.length < normalized) {
      const toAdd = normalized - nextAnswers.length;
      const created: QuestionAnswer[] = Array.from({ length: toAdd }, () => ({
        id: generateAnswerId(),
        text: '',
      }));
      nextAnswers = [...nextAnswers, ...created];
      if (created.length > 0) {
        setPendingFocusAnswerId(created[0].id);
      }
    } else {
      nextAnswers = trimAnswersToTarget(nextAnswers, normalized, question.correctAnswerId);
    }

    if (nextAnswers.length > normalized) {
      nextAnswers = nextAnswers.slice(0, normalized);
    }

    commitAnswers(nextAnswers);
  };

  const handleCorrectAnswerChange = (answerId: string) => {
    commitAnswers(answers, answerId);
  };

  const handleShuffleToggle = (value: boolean) => {
    onChange({ ...question, shuffleAnswers: value });
  };

  const handleRevealPolicyModeChange = (mode: RevealPolicy['mode']) => {
    if (mode === question.revealPolicy.mode) return;

    if (mode === 'after_attempts') {
      const attempts =
        question.revealPolicy.mode === 'after_attempts'
          ? question.revealPolicy.attempts
          : 1;
      onChange({
        ...question,
        revealPolicy: {
          mode: 'after_attempts',
          attempts,
        },
      });
      return;
    }

    onChange({
      ...question,
      revealPolicy: { mode },
    });
  };

  const handleRevealPolicyAttemptsChange = (value: number) => {
    const attempts = Math.min(Math.max(value, 1), MAX_REVEAL_ATTEMPTS);
    onChange({
      ...question,
      revealPolicy: { mode: 'after_attempts', attempts },
    });
  };

  const handleRevealPolicySourceChange = (source: 'inherit' | 'custom') => {
    onChange({
      ...question,
      revealPolicySource: source,
    });
  };

  const handleExplanationChange = (value: string) => {
    onChange({ ...question, explanation: value || undefined });
  };

  const handleCustomRightMessageChange = (value: string) => {
    onChange({ ...question, customRightMsg: value || undefined });
  };

  const handleCustomWrongMessageChange = (value: string) => {
    onChange({ ...question, customWrongMsg: value || undefined });
  };

  const updateResources = (
    key: 'resourcesRight' | 'resourcesWrong',
    updater: (resources: TestResource[]) => TestResource[]
  ) => {
    const current = [...(question[key] ?? [])];
    const next = updater(current);
    onChange({
      ...question,
      [key]: next.length > 0 ? next : undefined,
    });
  };

  const handleResourceChange = (
    key: 'resourcesRight' | 'resourcesWrong',
    index: number,
    field: keyof TestResource,
    value: string
  ) => {
    updateResources(key, (resources) => {
      const list = [...resources];
      list[index] = {
        ...list[index],
        [field]: value,
      };
      return list;
    });
  };

  const handleAddResource = (key: 'resourcesRight' | 'resourcesWrong') => {
    updateResources(key, (resources) => [...resources, { title: '', url: '' }]);
  };

  const handleRemoveResource = (key: 'resourcesRight' | 'resourcesWrong', index: number) => {
    updateResources(key, (resources) => resources.filter((_, i) => i !== index));
  };

  const handleCopyJson = async () => {
    try {
      const payload = {
        id: question.id,
        questionText: question.questionText,
        answers: question.answers,
        correctAnswerId: question.correctAnswerId,
        shuffleAnswers: question.shuffleAnswers,
        revealPolicy: question.revealPolicy,
        revealPolicySource: question.revealPolicySource,
        explanation: question.explanation,
        customRightMsg: question.customRightMsg,
        customWrongMsg: question.customWrongMsg,
        resourcesRight: question.resourcesRight,
        resourcesWrong: question.resourcesWrong,
      };

      const text = JSON.stringify(payload, null, 2);

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
        } finally {
          document.body.removeChild(textarea);
        }
      } else {
        throw new Error('Clipboard API недоступен');
      }

      setCopyState('success');
    } catch (error) {
      console.error('Не удалось скопировать вопрос в буфер обмена:', error);
      setCopyState('error');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      onRequestSave?.();
      return;
    }

    if (event.altKey && event.key === 'ArrowDown') {
      event.preventDefault();
      handleAddAnswer();
      return;
    }

    if (event.altKey && event.key === 'ArrowUp') {
      event.preventDefault();
      handleRemoveAnswer();
    }
  };

  const revealControlsDisabled =
    !!testRevealPolicy && question.revealPolicySource === 'inherit';

  const revealPolicyMode = question.revealPolicy.mode;
  const revealAttempts =
    question.revealPolicy.mode === 'after_attempts'
      ? question.revealPolicy.attempts
      : 1;

  const answersErrorText = [answersError, correctAnswerError].filter(Boolean).join(' · ');

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white shadow-sm"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">
            Вопрос {questionNumber}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusChip.className}`}
          >
            {statusChip.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'editor' ? 'preview' : 'editor')}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              viewMode === 'preview'
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'border border-gray-300 text-gray-600 hover:border-purple-300 hover:text-purple-600'
            }`}
          >
            {viewMode === 'preview' ? '← Редактор' : '👁️ Предпросмотр'}
          </button>
          <button
            type="button"
            onClick={handleCopyJson}
            className="rounded-md border border-transparent px-2 py-1 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
          >
            Скопировать JSON
          </button>
          {copyState === 'success' && (
            <span className="text-xs font-medium text-green-600">Скопировано</span>
          )}
          {copyState === 'error' && (
            <span className="text-xs font-medium text-red-600">Ошибка копирования</span>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
          >
            Удалить
          </button>
          <button
            type="button"
            aria-label={isExpanded ? 'Свернуть вопрос' : 'Развернуть вопрос'}
            onClick={() => setIsExpanded((value) => !value)}
            className="rounded-md px-2 py-1 text-sm text-gray-500 transition hover:bg-gray-100"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded && viewMode === 'preview' && (
        <div className="px-4 py-5">
          <QuestionPreview question={question} questionNumber={questionNumber} />
        </div>
      )}

      {isExpanded && viewMode === 'editor' && (
        <div className="space-y-6 px-4 py-5">
          <section>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Текст вопроса <span className="text-red-500">*</span>
            </label>
            <textarea
              value={question.questionText}
              onChange={(event) => handleQuestionTextChange(event.target.value)}
              placeholder="Введите текст вопроса..."
              maxLength={QUESTION_TEXT_LIMIT}
              aria-invalid={Boolean(questionError)}
              aria-describedby={questionHintId}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                questionError
                  ? 'border-red-400 focus:border-red-400'
                  : 'border-gray-300 focus:border-indigo-500'
              }`}
              rows={3}
            />
            <div
              id={questionHintId}
              className={`mt-2 flex items-center justify-between text-xs ${
                questionError ? 'text-red-600' : 'text-gray-500'
              } min-h-[20px]`}
            >
              <span>{questionError ?? questionHintText}</span>
              <span>
                {question.questionText.length}/{QUESTION_TEXT_LIMIT}
              </span>
            </div>
          </section>

          {/* Медиа секция */}
          <section className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 text-xs font-medium text-gray-600">Медиа к вопросу</div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={!testId || uploadingImage}
              />
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                className="hidden"
                disabled={!testId || uploadingAudio}
              />

              {/* Картинка */}
              {question.imageUrl ? (
                <div className="flex items-center gap-1 rounded-md border border-green-300 bg-green-50 px-2 py-1 text-xs">
                  <span className="text-green-700">🖼️ Картинка</span>
                  <button
                    onClick={handleImageRemove}
                    className="ml-1 text-red-600 hover:text-red-800"
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={!testId || uploadingImage}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Добавить картинку"
                >
                  {uploadingImage ? '⏳ Загрузка...' : '🖼️ Картинка'}
                </button>
              )}

              {/* Аудио */}
              {question.audioUrl ? (
                <div className="flex items-center gap-1 rounded-md border border-green-300 bg-green-50 px-2 py-1 text-xs">
                  <span className="text-green-700">🔊 Аудио</span>
                  <button
                    onClick={handleAudioRemove}
                    className="ml-1 text-red-600 hover:text-red-800"
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => audioInputRef.current?.click()}
                  disabled={!testId || uploadingAudio}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs transition hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Добавить аудио"
                >
                  {uploadingAudio ? '⏳ Загрузка...' : '🔊 Аудио'}
                </button>
              )}

              {/* Видео URL */}
              <div className="flex flex-1 min-w-[200px] items-center gap-1">
                {question.videoUrl ? (
                  <div className="flex flex-1 items-center gap-1 rounded-md border border-green-300 bg-green-50 px-2 py-1 text-xs">
                    <span className="flex-1 truncate text-green-700" title={question.videoUrl}>
                      🎬 {question.videoUrl}
                    </span>
                    <button
                      onClick={() => {
                        setVideoUrlInput('');
                        onChange({ ...question, videoUrl: undefined });
                      }}
                      className="ml-1 text-red-600 hover:text-red-800"
                      title="Удалить"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={videoUrlInput}
                      onChange={(e) => handleVideoUrlChange(e.target.value)}
                      onBlur={handleVideoUrlSave}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      placeholder="YouTube URL или ID"
                      className={`flex-1 rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-1 ${
                        videoUrlError
                          ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                          : 'border-gray-300 focus:border-blue-400 focus:ring-blue-200'
                      }`}
                    />
                    {videoUrlError && (
                      <span className="text-xs text-red-600">{videoUrlError}</span>
                    )}
                  </>
                )}
              </div>
            </div>
            {!testId && (
              <div className="mt-2 text-xs text-amber-600">
                ⚠️ Сначала сохраните тест, чтобы загрузить медиа
              </div>
            )}

            {/* Предпросмотр загруженных медиа */}
            {(question.imageUrl || question.audioUrl || question.videoUrl) && (
              <div className="mt-3 space-y-3">
                {question.imageUrl && (
                  <div className="rounded-lg overflow-hidden border border-gray-300">
                    <img
                      src={question.imageUrl}
                      alt="Предпросмотр изображения"
                      className="w-full h-auto max-h-64 object-contain bg-gray-50"
                    />
                  </div>
                )}

                {question.audioUrl && (
                  <div className="rounded-lg border border-gray-300 bg-gray-50 p-2">
                    <audio controls className="w-full">
                      <source src={question.audioUrl} />
                      Ваш браузер не поддерживает аудио.
                    </audio>
                  </div>
                )}

                {question.videoUrl && getYouTubeEmbedUrl(question.videoUrl) && (
                  <div className="rounded-lg overflow-hidden border border-gray-300 bg-gray-900">
                    <div className="relative pb-[56.25%]">
                      <iframe
                        src={getYouTubeEmbedUrl(question.videoUrl) || ''}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Предпросмотр видео"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
              <span className="font-medium">Варианты:</span>
              {DEFAULT_ANSWER_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetChange(preset)}
                  className={`rounded-md border px-2 py-1 transition ${
                    answers.length === preset
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                      : 'border-gray-300 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {preset}
                </button>
              ))}
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={handleAddAnswer}
                className="rounded-md px-2 py-1 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={answers.length >= MAX_QUESTION_ANSWERS}
              >
                + Добавить
              </button>
              <button
                type="button"
                onClick={handleRemoveAnswer}
                className="rounded-md px-2 py-1 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={answers.length <= MIN_QUESTION_ANSWERS}
              >
                – Удалить
              </button>
              <span className="text-xs text-gray-500">
                Alt+↓ — добавить, Alt+↑ — удалить последний
              </span>
            </div>

            <fieldset
              className={`space-y-2 rounded-md border px-3 py-3 ${
                answersErrorText ? 'border-red-300' : 'border-gray-200'
              }`}
              aria-describedby={answersHintId}
            >
              <legend className="sr-only">Варианты ответов</legend>
              {answers.map((answer, index) => {
                const inputId = `answer-${question.id}-${answer.id}`;
                const radioId = `correct-${question.id}-${answer.id}`;
                const isCorrect = question.correctAnswerId === answer.id;
                return (
                  <div
                    key={answer.id}
                    className="flex items-center gap-3 rounded-md border border-transparent px-2 py-1 hover:border-gray-200"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        id={radioId}
                        name={`correct-${question.id}`}
                        type="radio"
                        checked={isCorrect}
                        onChange={() => handleCorrectAnswerChange(answer.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="w-6 text-xs font-semibold uppercase text-gray-500">
                        {String.fromCharCode(65 + index)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <label htmlFor={inputId} className="sr-only">
                        Вариант {index + 1}
                      </label>
                      <input
                        id={inputId}
                        ref={(element) => {
                          answerRefs.current[answer.id] = element;
                        }}
                        type="text"
                        value={answer.text}
                        onChange={(event) => handleAnswerTextChange(answer.id, event.target.value)}
                        placeholder={`Вариант ${index + 1}`}
                        className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
                          answersErrorText && answer.text.trim() === ''
                            ? 'border-red-300 focus:border-red-400'
                            : 'border-gray-300 focus:border-indigo-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </fieldset>
            <p
              id={answersHintId}
              className={`text-xs ${
                answersErrorText ? 'text-red-600' : 'text-gray-500'
              } min-h-[20px]`}
            >
              {answersErrorText || 'Отметьте радиокнопкой правильный вариант'}
            </p>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={question.shuffleAnswers}
                onChange={(event) => handleShuffleToggle(event.target.checked)}
                className="h-4 w-4 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500"
              />
              Перемешивать варианты при прохождении
            </label>
          </section>

          <section className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-4">
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h3 className="text-sm font-semibold text-indigo-900">
                Показ правильного ответа
              </h3>
              {testRevealPolicy ? (
                <div className="flex items-center gap-3 text-xs font-medium text-indigo-900">
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="radio"
                      name={`policy-source-${question.id}`}
                      checked={question.revealPolicySource === 'inherit'}
                      onChange={() => handleRevealPolicySourceChange('inherit')}
                    />
                    Использовать настройки теста
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="radio"
                      name={`policy-source-${question.id}`}
                      checked={question.revealPolicySource !== 'inherit'}
                      onChange={() => handleRevealPolicySourceChange('custom')}
                    />
                    Свои настройки
                  </label>
                </div>
              ) : null}
            </div>

            <div
              className={`space-y-3 ${revealControlsDisabled ? 'opacity-60' : ''}`}
              aria-disabled={revealControlsDisabled}
            >
              <label className="flex items-center gap-2 text-sm text-indigo-900">
                <input
                  type="radio"
                  name={`reveal-${question.id}`}
                  value="after_test"
                  checked={revealPolicyMode === 'after_test'}
                  onChange={() => handleRevealPolicyModeChange('after_test')}
                  disabled={revealControlsDisabled}
                />
                После завершения теста
              </label>
              <label className="flex items-center gap-2 text-sm text-indigo-900">
                <input
                  type="radio"
                  name={`reveal-${question.id}`}
                  value="after_attempts"
                  checked={revealPolicyMode === 'after_attempts'}
                  onChange={() => handleRevealPolicyModeChange('after_attempts')}
                  disabled={revealControlsDisabled}
                />
                После
                <select
                  value={revealAttempts}
                  onChange={(event) => handleRevealPolicyAttemptsChange(Number(event.target.value))}
                  disabled={revealControlsDisabled}
                  className="rounded-md border border-indigo-200 bg-white px-2 py-1 text-sm text-indigo-900 focus:border-indigo-400 focus:outline-none disabled:bg-indigo-100 disabled:text-indigo-400"
                >
                  {Array.from({ length: MAX_REVEAL_ATTEMPTS }, (_, index) => index + 1).map(
                    (attempt) => (
                      <option key={attempt} value={attempt}>
                        {attempt}
                      </option>
                    )
                  )}
                </select>
                попыток
              </label>
              <label className="flex items-center gap-2 text-sm text-indigo-900">
                <input
                  type="radio"
                  name={`reveal-${question.id}`}
                  value="never"
                  checked={revealPolicyMode === 'never'}
                  onChange={() => handleRevealPolicyModeChange('never')}
                  disabled={revealControlsDisabled}
                />
                Никогда
              </label>
              <label className="flex items-center gap-2 text-sm text-indigo-900">
                <input
                  type="radio"
                  name={`reveal-${question.id}`}
                  value="immediately"
                  checked={revealPolicyMode === 'immediately'}
                  onChange={() => handleRevealPolicyModeChange('immediately')}
                  disabled={revealControlsDisabled}
                />
                Сразу
              </label>
              <textarea
                value={question.explanation ?? ''}
                onChange={(event) => handleExplanationChange(event.target.value)}
                placeholder="Объяснение правильного ответа (показывается, когда разрешён показ)"
                aria-describedby={revealHintId}
                disabled={revealControlsDisabled}
                className="w-full rounded-md border border-indigo-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-indigo-100"
                rows={3}
              />
              <p id={revealHintId} className="text-xs text-indigo-900/80">
                Объяснение и дополнительные материалы выводятся только тогда, когда политика позволяет показать правильный ответ.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <details className="group rounded-lg border border-gray-200 bg-gray-50">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-gray-800 transition group-open:bg-gray-100">
                Кастомные сообщения
              </summary>
              <div className="space-y-3 px-4 pb-4 pt-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Сообщение при правильном ответе
                  </label>
                  <textarea
                    value={question.customRightMsg ?? ''}
                    onChange={(event) => handleCustomRightMessageChange(event.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Сообщение при неправильном ответе
                  </label>
                  <textarea
                    value={question.customWrongMsg ?? ''}
                    onChange={(event) => handleCustomWrongMessageChange(event.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>
            </details>

            <details className="group rounded-lg border border-gray-200 bg-gray-50">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-gray-800 transition group-open:bg-gray-100">
                Рекомендуемые материалы
              </summary>
              <div className="space-y-4 px-4 pb-4 pt-2">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-green-700">
                      Для правильного ответа
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddResource('resourcesRight')}
                      className="text-xs font-medium text-green-700 hover:text-green-900"
                    >
                      + Добавить ресурс
                    </button>
                  </div>
                  {resourcesRight.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      Добавьте ссылки, которые появятся после правильного ответа.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {resourcesRight.map((resource, index) => (
                        <div
                          key={index}
                          className="space-y-2 rounded-md border border-green-200 bg-white p-3"
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-semibold text-green-700">
                              Ресурс {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveResource('resourcesRight', index)}
                              className="text-xs font-medium text-red-600 hover:text-red-800"
                            >
                              Удалить
                            </button>
                          </div>
                          <input
                            type="text"
                            value={resource.title}
                            onChange={(event) =>
                              handleResourceChange('resourcesRight', index, 'title', event.target.value)
                            }
                            placeholder="Название материала"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                          />
                          <input
                            type="url"
                            value={resource.url}
                            onChange={(event) =>
                              handleResourceChange('resourcesRight', index, 'url', event.target.value)
                            }
                            placeholder="https://..."
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                      Для неправильного ответа
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddResource('resourcesWrong')}
                      className="text-xs font-medium text-orange-700 hover:text-orange-900"
                    >
                      + Добавить ресурс
                    </button>
                  </div>
                  {resourcesWrong.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      Укажите ссылки, которые помогут участнику разобраться с ошибкой.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {resourcesWrong.map((resource, index) => (
                        <div
                          key={index}
                          className="space-y-2 rounded-md border border-orange-200 bg-white p-3"
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-semibold text-orange-700">
                              Ресурс {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveResource('resourcesWrong', index)}
                              className="text-xs font-medium text-red-600 hover:text-red-800"
                            >
                              Удалить
                            </button>
                          </div>
                          <input
                            type="text"
                            value={resource.title}
                            onChange={(event) =>
                              handleResourceChange('resourcesWrong', index, 'title', event.target.value)
                            }
                            placeholder="Название материала"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                          <input
                            type="url"
                            value={resource.url}
                            onChange={(event) =>
                              handleResourceChange('resourcesWrong', index, 'url', event.target.value)
                            }
                            placeholder="https://..."
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </details>
          </section>
        </div>
      )}
    </div>
  );
}
