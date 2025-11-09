import { useState, useMemo, useCallback } from 'react';
import type { Sphere, NodeT, EventIconId } from '../types';

interface OriginalFormValues {
  age: string;
  label: string;
  notes: string;
  sphere: Sphere | undefined;
  isDecision: boolean;
  iconId: EventIconId | null;
}

/**
 * Hook for managing event form state (add/edit mode)
 */
export function useTimelineForm() {
  const [formEventId, setFormEventId] = useState<string | null>(null);
  const [formEventAge, setFormEventAge] = useState<string>('');
  const [formEventLabel, setFormEventLabel] = useState('');
  const [formEventNotes, setFormEventNotes] = useState('');
  const [formEventSphere, setFormEventSphere] = useState<Sphere | undefined>(undefined);
  const [formEventIsDecision, setFormEventIsDecision] = useState(false);
  const [formEventIcon, setFormEventIcon] = useState<EventIconId | null>(null);
  const [originalFormValues, setOriginalFormValues] = useState<OriginalFormValues | null>(null);

  /**
   * Check if form has changes (for edit mode)
   */
  const hasFormChanges = useMemo(() => {
    if (!formEventId || !originalFormValues) return false;

    return (
      formEventAge !== originalFormValues.age ||
      formEventLabel !== originalFormValues.label ||
      formEventNotes !== originalFormValues.notes ||
      formEventSphere !== originalFormValues.sphere ||
      formEventIsDecision !== originalFormValues.isDecision ||
      formEventIcon !== originalFormValues.iconId
    );
  }, [
    formEventId,
    originalFormValues,
    formEventAge,
    formEventLabel,
    formEventNotes,
    formEventSphere,
    formEventIsDecision,
    formEventIcon,
  ]);

  /**
   * Populate form from existing node (edit mode)
   */
  const setFormFromNode = useCallback((node: NodeT) => {
    setFormEventId(node.id);
    const ageStr = node.age.toString();
    setFormEventAge(ageStr);
    setFormEventLabel(node.label);
    setFormEventNotes(node.notes || '');
    setFormEventSphere(node.sphere);
    setFormEventIsDecision(node.isDecision);
    setFormEventIcon(node.iconId ?? null);

    // Save original values for change detection
    setOriginalFormValues({
      age: ageStr,
      label: node.label,
      notes: node.notes || '',
      sphere: node.sphere,
      isDecision: node.isDecision,
      iconId: node.iconId ?? null,
    });
  }, []);

  /**
   * Clear form and reset to initial state
   */
  const clearForm = useCallback(() => {
    setFormEventId(null);
    setFormEventAge('');
    setFormEventLabel('');
    setFormEventNotes('');
    setFormEventSphere(undefined);
    setFormEventIsDecision(false);
    setFormEventIcon(null);
    setOriginalFormValues(null);
  }, []);

  return {
    // State
    formEventId,
    formEventAge,
    formEventLabel,
    formEventNotes,
    formEventSphere,
    formEventIsDecision,
    formEventIcon,
    hasFormChanges,

    // Setters
    setFormEventId,
    setFormEventAge,
    setFormEventLabel,
    setFormEventNotes,
    setFormEventSphere,
    setFormEventIsDecision,
    setFormEventIcon,

    // Handlers
    setFormFromNode,
    clearForm,
  };
}
