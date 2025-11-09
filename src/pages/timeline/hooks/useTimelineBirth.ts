import { useState, useEffect, useMemo, useCallback } from 'react';
import type { BirthDetails } from '../types';

interface UseTimelineBirthOptions {
  birthDetails: BirthDetails;
  setBirthDetails: (details: BirthDetails) => void;
}

/**
 * Hook for managing birth details form state
 */
export function useTimelineBirth({ birthDetails, setBirthDetails }: UseTimelineBirthOptions) {
  const [birthFormDate, setBirthFormDate] = useState('');
  const [birthFormPlace, setBirthFormPlace] = useState('');
  const [birthFormNotes, setBirthFormNotes] = useState('');
  const [birthSelected, setBirthSelected] = useState(false);

  /**
   * Check if birth form has unsaved changes
   */
  const birthHasChanges = useMemo(() => {
    const normalized = {
      date: birthDetails.date ?? '',
      place: birthDetails.place ?? '',
      notes: birthDetails.notes ?? '',
    };
    return (
      birthFormDate !== normalized.date ||
      birthFormPlace !== normalized.place ||
      birthFormNotes !== normalized.notes
    );
  }, [birthDetails, birthFormDate, birthFormPlace, birthFormNotes]);

  /**
   * Sync form values when birthDetails or birthSelected changes
   */
  useEffect(() => {
    if (birthSelected) {
      setBirthFormDate(birthDetails.date ?? '');
      setBirthFormPlace(birthDetails.place ?? '');
      setBirthFormNotes(birthDetails.notes ?? '');
    }
  }, [birthDetails, birthSelected]);

  /**
   * Parse birth date to Date object
   */
  const birthDateObj = useMemo(() => {
    if (!birthDetails.date) return null;
    const parsed = new Date(birthDetails.date);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [birthDetails.date]);

  /**
   * Extract birth year for calculations
   */
  const birthBaseYear = birthDateObj ? birthDateObj.getFullYear() : null;

  /**
   * Save birth details
   */
  const handleBirthSave = useCallback(
    (onHistoryRecord?: (birthDetails: BirthDetails) => void) => {
      const trimmedPlace = birthFormPlace.trim();
      const trimmedNotes = birthFormNotes.trim();

      const updated: BirthDetails = {
        date: birthFormDate ? birthFormDate : undefined,
        place: trimmedPlace ? trimmedPlace : undefined,
        notes: trimmedNotes ? trimmedNotes : undefined,
      };

      setBirthDetails(updated);
      setBirthSelected(false);

      if (onHistoryRecord) {
        onHistoryRecord(updated);
      }
    },
    [birthFormDate, birthFormPlace, birthFormNotes, setBirthDetails]
  );

  /**
   * Cancel birth editing and revert form values
   */
  const handleBirthCancel = useCallback(() => {
    setBirthFormDate(birthDetails.date ?? '');
    setBirthFormPlace(birthDetails.place ?? '');
    setBirthFormNotes(birthDetails.notes ?? '');
    setBirthSelected(false);
  }, [birthDetails]);

  /**
   * Select birth for editing
   */
  const handleBirthSelect = useCallback(() => {
    setBirthSelected(true);
    setBirthFormDate(birthDetails.date ?? '');
    setBirthFormPlace(birthDetails.place ?? '');
    setBirthFormNotes(birthDetails.notes ?? '');
  }, [birthDetails]);

  return {
    // State
    birthFormDate,
    birthFormPlace,
    birthFormNotes,
    birthSelected,
    birthHasChanges,
    birthDateObj,
    birthBaseYear,

    // Setters
    setBirthFormDate,
    setBirthFormPlace,
    setBirthFormNotes,
    setBirthSelected,

    // Handlers
    handleBirthSave,
    handleBirthCancel,
    handleBirthSelect,
  };
}
