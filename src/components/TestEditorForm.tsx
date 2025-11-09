import { useEffect } from 'react';
import type { Test, TestQuestion } from '../types/tests';
import { THEME_PRESETS } from '../constants/themePresets';
import { TestQuestionsManager } from './tests/editor/TestQuestionsManager';
import { TestBasicMetadata } from './tests/editor/TestBasicMetadata';
import { TestPrerequisiteConfig } from './tests/editor/TestPrerequisiteConfig';
import { TestActionButtons } from './tests/editor/TestActionButtons';
import { TestFormHeader } from './tests/editor/TestFormHeader';
import { TestThemeSection } from './tests/editor/TestThemeSection';
import { useTestEditorForm } from './tests/editor/hooks/useTestEditorForm';
import { useTestTheme } from './tests/editor/hooks/useTestTheme';
import { useTestPrerequisite } from './tests/editor/hooks/useTestPrerequisite';
import { useTestSave } from './tests/editor/hooks/useTestSave';

interface TestEditorFormProps {
  testId: string | null;
  onClose: () => void;
  onSaved: () => void;
  existingTests: Test[];
  importedData?: {
    data?: Partial<Test>;
    questions?: TestQuestion[];
  } | null;
}

export function TestEditorForm({ testId, onClose, onSaved, existingTests, importedData }: TestEditorFormProps) {
  // Use custom hooks
  const formHook = useTestEditorForm({ testId, importedData });
  const themeHook = useTestTheme();
  const prerequisiteHook = useTestPrerequisite({ existingTests, testId });

  const saveHook = useTestSave({
    testId,
    formData: {
      title: formHook.form.title,
      rubric: formHook.form.rubric,
      questionCount: formHook.form.questionCount,
      questions: formHook.form.questions,
      currentStatus: formHook.form.currentStatus,
      questionCountError: formHook.form.questionCountError,
    },
    prerequisiteData: {
      isNextLevel: prerequisiteHook.isNextLevel,
      prerequisiteTestId: prerequisiteHook.prerequisiteTestId,
      requiredPercentage: prerequisiteHook.requiredPercentage,
      previousTestError: prerequisiteHook.previousTestError,
      thresholdError: prerequisiteHook.thresholdError,
      canAttachPrerequisite: prerequisiteHook.canAttachPrerequisite,
    },
    buildAppearancePayload: themeHook.buildAppearancePayload,
    onSaved,
  });

  // Load theme and prerequisite data when test is loaded
  useEffect(() => {
    if (testId && !formHook.loading) {
      // Theme data will be loaded through the effect in useTestEditorForm
      // and then set via setAppearanceFromTest when test.appearance is available
    }
  }, [testId, formHook.loading]);

  // Set theme appearance from loaded test
  useEffect(() => {
    const loadTestAppearance = async () => {
      if (!testId) {
        themeHook.handlers.setAppearanceFromTest(undefined);
        prerequisiteHook.setters.setIsNextLevel(false);
        return;
      }

      try {
        const { getTestById } = await import('../lib/tests');
        const test = await getTestById(testId);
        if (test) {
          themeHook.handlers.setAppearanceFromTest(test.appearance);

          // Set prerequisite data
          prerequisiteHook.setters.setIsNextLevel(Boolean(test.prerequisiteTestId));
          if (test.prerequisiteTestId) {
            prerequisiteHook.setters.setPrerequisiteTestId(test.prerequisiteTestId);
            prerequisiteHook.setters.setPreviousTestIdInput(test.prerequisiteTestId);
          }
          if (test.requiredPercentage !== undefined) {
            prerequisiteHook.setters.setRequiredPercentage(test.requiredPercentage);
            prerequisiteHook.setters.setThresholdInput(String(test.requiredPercentage));
          }
        }
      } catch (error) {
        console.error('Error loading test appearance:', error);
      }
    };

    loadTestAppearance();
  }, [testId]);

  // Load theme and prerequisite from imported data
  useEffect(() => {
    if (!testId && importedData?.data) {
      const { data } = importedData;

      if (data.appearance) {
        themeHook.handlers.setAppearanceFromTest(data.appearance);
      }

      if (data.prerequisiteTestId) {
        prerequisiteHook.setters.setIsNextLevel(true);
        prerequisiteHook.setters.setPrerequisiteTestId(data.prerequisiteTestId);
        prerequisiteHook.setters.setPreviousTestIdInput(data.prerequisiteTestId);
      }

      if (typeof data.requiredPercentage === 'number') {
        prerequisiteHook.setters.setRequiredPercentage(data.requiredPercentage);
        prerequisiteHook.setters.setThresholdInput(String(data.requiredPercentage));
      }
    }
  }, [testId, importedData]);

  if (formHook.loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TestFormHeader
        title={testId ? 'Редактировать тест' : 'Создать тест'}
        onClose={onClose}
      />

      <TestBasicMetadata
        title={formHook.form.title}
        onTitleChange={formHook.setters.setTitle}
        titleMaxLength={formHook.form.titleMaxLength}
        titleHint={formHook.form.titleHint}
        rubric={formHook.form.rubric}
        onRubricChange={formHook.setters.setRubric}
        questionCountInput={formHook.form.questionCountInput}
        onQuestionCountInputChange={formHook.handlers.handleQuestionCountInputChange}
        questionCountError={formHook.form.questionCountError}
        questionHint={formHook.form.questionHint}
        saving={saveHook.saving}
      />

      <TestPrerequisiteConfig
        isNextLevel={prerequisiteHook.isNextLevel}
        onIsNextLevelChange={prerequisiteHook.setters.setIsNextLevel}
        thresholdInput={prerequisiteHook.thresholdInput}
        onThresholdInputChange={prerequisiteHook.handlers.handleThresholdInputChange}
        thresholdError={prerequisiteHook.thresholdError}
        previousTestQuery={prerequisiteHook.previousTestQuery}
        onPreviousTestQueryChange={prerequisiteHook.handlers.handlePreviousTestQueryChange}
        previousTestIdInput={prerequisiteHook.previousTestIdInput}
        onPreviousTestIdInputChange={prerequisiteHook.handlers.handlePreviousTestIdInputChange}
        previousTestError={prerequisiteHook.previousTestError}
        testOptions={prerequisiteHook.testOptions}
        filteredTestOptions={prerequisiteHook.filteredTestOptions}
        selectedTest={prerequisiteHook.selectedTest}
        prerequisiteTestId={prerequisiteHook.prerequisiteTestId}
        onSelectPreviousTest={prerequisiteHook.handlers.handleSelectPreviousTest}
        saving={saveHook.saving}
      />

      <TestThemeSection
        appearance={themeHook.appearance}
        onAppearanceChange={themeHook.handlers.handleAppearanceChange}
        bulletPoints={themeHook.appearanceBullets}
        onBulletPointsChange={themeHook.handlers.setAppearanceBullets}
        themePresets={THEME_PRESETS}
        themePresetId={themeHook.themePresetId}
        onPresetChange={themeHook.handlers.handlePresetChange}
        mainColor={themeHook.mainColor}
        onMainColorChange={themeHook.handlers.handleMainColorChange}
        badgeLockedToPrimary={themeHook.badgeLockedToPrimary}
        onBadgeLockedChange={themeHook.handlers.handleBadgeLockedChange}
        themeOverrides={themeHook.themeOverrides}
        onOverridesChange={themeHook.handlers.handleOverridesChange}
        derivedTheme={themeHook.derivedTheme}
        baseTheme={themeHook.baseTheme}
        contrastWarning={themeHook.contrastWarning}
        onResetTheme={themeHook.handlers.handleResetTheme}
        onRandomizeTheme={themeHook.handlers.handleRandomizeTheme}
        themeAdvancedOpen={themeHook.themeAdvancedOpen}
        onAdvancedToggle={themeHook.handlers.setThemeAdvancedOpen}
        buttonTextColor={themeHook.buttonTextColor}
        showBadgeConfig={themeHook.showBadgeConfig}
        onToggleBadgeConfig={themeHook.handlers.handleToggleBadgeConfig}
        saving={saveHook.saving}
      />

      <TestQuestionsManager
        questions={formHook.form.questions}
        onQuestionChange={formHook.handlers.handleQuestionChange}
        onQuestionDelete={formHook.handlers.handleQuestionDelete}
        onAddQuestion={formHook.handlers.handleAddQuestion}
        onImportQuestions={formHook.handlers.handleImportQuestions}
        onDownloadTemplate={formHook.handlers.handleDownloadQuestionsTemplate}
        saving={saveHook.saving}
        testId={testId || undefined}
        onRequestSave={saveHook.handlers.handleSaveDraft}
      />

      <TestActionButtons
        currentStatus={formHook.form.currentStatus}
        saving={saveHook.saving}
        onClose={onClose}
        onSaveDraft={saveHook.handlers.handleSaveDraft}
        onPublish={saveHook.handlers.handlePublish}
        onUnpublish={saveHook.handlers.handleUnpublish}
      />
    </div>
  );
}
