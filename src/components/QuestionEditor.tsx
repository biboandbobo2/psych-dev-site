import {
  useEffect,
  useState,
  type KeyboardEvent,
} from 'react';
import type { RevealPolicy, TestQuestion, TestResource } from '../types/tests';
import { MAX_REVEAL_ATTEMPTS } from '../types/tests';
import { QuestionPreview } from './QuestionPreview';
import { QuestionTextEditor } from './questions/editor/QuestionTextEditor';
import { QuestionMediaUploader } from './questions/editor/QuestionMediaUploader';
import { QuestionAnswersManager } from './questions/editor/QuestionAnswersManager';
import { QuestionRevealPolicyEditor } from './questions/editor/QuestionRevealPolicyEditor';
import { QuestionFeedbackEditor } from './questions/editor/QuestionFeedbackEditor';

type CopyState = 'idle' | 'success' | 'error';

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
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');

  const answers = question.answers;
  const resourcesRight = question.resourcesRight ?? [];
  const resourcesWrong = question.resourcesWrong ?? [];

  // Validation logic for status chip
  const trimmedQuestionText = question.questionText.trim();
  const nonEmptyAnswers = answers.filter((answer) => answer.text.trim().length > 0);
  const hasCorrectAnswer = !!question.correctAnswerId &&
    answers.some((answer) => answer.id === question.correctAnswerId);

  const questionError = trimmedQuestionText.length === 0;
  const answersError = nonEmptyAnswers.length < 2;
  const correctAnswerError = !hasCorrectAnswer;

  const isQuestionComplete = !questionError && !answersError && !correctAnswerError;
  const statusChip = isQuestionComplete
    ? { label: 'OK', className: 'bg-green-100 text-green-800' }
    : { label: 'Не заполнен', className: 'bg-yellow-100 text-yellow-800' };

  useEffect(() => {
    if (copyState === 'idle' || typeof window === 'undefined') return;
    const timeout = window.setTimeout(
      () => setCopyState('idle'),
      copyState === 'success' ? 2000 : 3000
    );
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  // Simple wrapper handlers
  const handleQuestionTextChange = (value: string) => {
    onChange({ ...question, questionText: value });
  };

  const handleImageChange = (url: string | undefined) => {
    onChange({ ...question, imageUrl: url });
  };

  const handleAudioChange = (url: string | undefined) => {
    onChange({ ...question, audioUrl: url });
  };

  const handleVideoChange = (url: string | undefined) => {
    onChange({ ...question, videoUrl: url });
  };

  const handleAnswersChange = (nextAnswers: typeof answers, nextCorrectId?: string | null) => {
    const requestedCorrectId =
      nextCorrectId !== undefined ? nextCorrectId : question.correctAnswerId;
    const sanitizedCorrectId =
      requestedCorrectId && nextAnswers.some((answer) => answer.id === requestedCorrectId)
        ? requestedCorrectId
        : null;

    onChange({
      ...question,
      answers: nextAnswers,
      correctAnswerId: sanitizedCorrectId,
    });
  };

  const handleShuffleChange = (shuffle: boolean) => {
    onChange({ ...question, shuffleAnswers: shuffle });
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
    // Note: Alt+ArrowDown/Up handlers removed, now handled by QuestionAnswersManager
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
          <QuestionTextEditor
            questionText={question.questionText}
            onQuestionTextChange={handleQuestionTextChange}
          />

          <QuestionMediaUploader
            questionId={question.id}
            testId={testId}
            imageUrl={question.imageUrl}
            audioUrl={question.audioUrl}
            videoUrl={question.videoUrl}
            onImageChange={handleImageChange}
            onAudioChange={handleAudioChange}
            onVideoChange={handleVideoChange}
          />

          <QuestionAnswersManager
            questionId={question.id}
            answers={answers}
            correctAnswerId={question.correctAnswerId}
            shuffleAnswers={question.shuffleAnswers}
            onAnswersChange={handleAnswersChange}
            onShuffleChange={handleShuffleChange}
            pendingFocusAnswerId={pendingFocusAnswerId}
            onPendingFocusAnswerId={setPendingFocusAnswerId}
          />

          <QuestionRevealPolicyEditor
            questionId={question.id}
            revealPolicy={question.revealPolicy}
            revealPolicySource={question.revealPolicySource}
            explanation={question.explanation}
            testRevealPolicy={testRevealPolicy}
            onRevealPolicyModeChange={handleRevealPolicyModeChange}
            onRevealPolicyAttemptsChange={handleRevealPolicyAttemptsChange}
            onRevealPolicySourceChange={handleRevealPolicySourceChange}
            onExplanationChange={handleExplanationChange}
          />

          <QuestionFeedbackEditor
            customRightMsg={question.customRightMsg}
            customWrongMsg={question.customWrongMsg}
            resourcesRight={resourcesRight}
            resourcesWrong={resourcesWrong}
            onCustomRightMessageChange={handleCustomRightMessageChange}
            onCustomWrongMessageChange={handleCustomWrongMessageChange}
            onResourceChange={handleResourceChange}
            onAddResource={handleAddResource}
            onRemoveResource={handleRemoveResource}
          />
        </div>
      )}
    </div>
  );
}
