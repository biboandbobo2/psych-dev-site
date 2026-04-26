import { useEffect, useState } from 'react';
import { BaseModal } from '../../../components/ui/BaseModal';
import { debugError } from '../../../lib/debug';
import {
  createGroupAnnouncement,
  createGroupEvent,
} from '../../../hooks/useGroupFeed';
import {
  publishToGroups,
  formatPublishStatus,
  type GroupRef,
} from '../announcementsMultiPublish';
import type { Group } from '../../../types/groups';
import { isEveryoneGroup } from '../../../../shared/groups/everyoneGroup';
import {
  AnnouncementForm,
  EMPTY_ANNOUNCEMENT_FORM,
} from './forms/AnnouncementForm';
import { EventForm, EMPTY_EVENT_FORM } from './forms/EventForm';
import { AssignmentForm, EMPTY_ASSIGNMENT_FORM } from './forms/AssignmentForm';

export type CreateKind = 'event' | 'announcement' | 'assignment';

interface CreateModalProps {
  open: boolean;
  initialKind: CreateKind;
  /** Все группы, доступные для публикации текущему админу. */
  availableGroups: Group[];
  /** Группы, выбранные по умолчанию (например, текущая в toolbar). */
  defaultGroupIds: string[];
  /** Если задано — pre-fill для event.startAtMs. */
  prefillDate: Date | null;
  userId: string;
  createdByName: string | undefined;
  onClose: () => void;
}

export function CreateModal({
  open,
  initialKind,
  availableGroups,
  defaultGroupIds,
  prefillDate,
  userId,
  createdByName,
  onClose,
}: CreateModalProps) {
  const [kind, setKind] = useState<CreateKind>(initialKind);
  const [groupIds, setGroupIds] = useState<string[]>(defaultGroupIds);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setKind(initialKind);
      setGroupIds(defaultGroupIds.length > 0 ? defaultGroupIds : []);
      setSaving(false);
      setErrorMessage(null);
    }
  }, [open, initialKind, defaultGroupIds]);

  if (!open) return null;

  const toggleGroupId = (id: string) => {
    setGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedRefs: GroupRef[] = groupIds
    .map((id) => availableGroups.find((g) => g.id === id))
    .filter((g): g is Group => Boolean(g))
    .map((g) => ({ id: g.id, name: g.name }));

  const someEveryone = selectedRefs.some((g) => isEveryoneGroup(g.id));

  const close = () => {
    setSaving(false);
    setErrorMessage(null);
    onClose();
  };

  const handleAnnouncement = async (payload: {
    text: string;
    newsType: 'tech' | 'content' | null;
  }) => {
    if (selectedRefs.length === 0) {
      setErrorMessage('Выберите хотя бы одну группу');
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      const result = await publishToGroups(selectedRefs, (groupId) =>
        createGroupAnnouncement(
          groupId,
          {
            text: payload.text,
            createdByName,
            ...(isEveryoneGroup(groupId) && payload.newsType
              ? { newsType: payload.newsType }
              : {}),
          },
          userId
        )
      );
      if (result.failures.length > 0) {
        debugError('createGroupAnnouncement partial failure', result.failures);
      }
      const formatted = formatPublishStatus(result);
      if (formatted.kind === 'success') {
        close();
      } else {
        setErrorMessage(formatted.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEvent = async (payload: {
    text: string;
    startAtMs: number;
    endAtMs: number;
    isAllDay: boolean;
    zoomLink: string;
    siteLink: string;
  }) => {
    if (selectedRefs.length === 0) {
      setErrorMessage('Выберите хотя бы одну группу');
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      const result = await publishToGroups(selectedRefs, (groupId) =>
        createGroupEvent(
          groupId,
          {
            text: payload.text,
            startAtMs: payload.startAtMs,
            endAtMs: payload.endAtMs,
            isAllDay: payload.isAllDay,
            zoomLink: payload.zoomLink || undefined,
            siteLink: payload.siteLink || undefined,
            createdByName,
          },
          userId
        )
      );
      if (result.failures.length > 0) {
        debugError('createGroupEvent partial failure', result.failures);
      }
      const formatted = formatPublishStatus(result);
      if (formatted.kind === 'success') {
        close();
      } else {
        setErrorMessage(formatted.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAssignment = async (payload: {
    text: string;
    dueDate: string;
    longText: string;
  }) => {
    if (selectedRefs.length === 0) {
      setErrorMessage('Выберите хотя бы одну группу');
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      const result = await publishToGroups(selectedRefs, (groupId) =>
        createGroupEvent(
          groupId,
          {
            kind: 'assignment',
            text: payload.text,
            dueDate: payload.dueDate,
            longText: payload.longText || undefined,
            createdByName,
          },
          userId
        )
      );
      if (result.failures.length > 0) {
        debugError('createGroupAssignment partial failure', result.failures);
      }
      const formatted = formatPublishStatus(result);
      if (formatted.kind === 'success') {
        close();
      } else {
        setErrorMessage(formatted.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const titleByKind: Record<CreateKind, string> = {
    event: 'Новое событие',
    announcement: 'Новое объявление',
    assignment: 'Новое задание',
  };

  const tabs: Array<{ kind: CreateKind; label: string }> = [
    { kind: 'event', label: '📅 Событие' },
    { kind: 'announcement', label: '📢 Объявление' },
    { kind: 'assignment', label: '📋 Задание' },
  ];

  return (
    <BaseModal
      isOpen={open}
      onClose={close}
      title={titleByKind[kind]}
      disabled={saving}
      maxWidth="2xl"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1 rounded-md bg-gray-50 p-1">
          {tabs.map((t) => (
            <button
              key={t.kind}
              type="button"
              onClick={() => setKind(t.kind)}
              disabled={saving}
              className={`rounded px-3 py-1 text-sm transition ${
                kind === t.kind
                  ? 'bg-white shadow-sm'
                  : 'text-gray-600 hover:bg-white/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <fieldset className="rounded-md border border-gray-200 bg-white p-2">
          <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-[#8A97AB]">
            Получатели
          </legend>
          <div className="mt-1 grid gap-1 sm:grid-cols-2">
            {availableGroups.map((g) => {
              const checked = groupIds.includes(g.id);
              return (
                <label
                  key={g.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-sm ${
                    checked
                      ? 'border-purple-300 bg-purple-50 text-[#2C3E50]'
                      : 'border-gray-200 text-[#2C3E50] hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleGroupId(g.id)}
                    disabled={saving}
                  />
                  <span className="flex-1 truncate">{g.name}</span>
                  <span className="text-xs text-gray-500">
                    {g.memberIds.length} уч.
                  </span>
                </label>
              );
            })}
          </div>
          {groupIds.length === 0 && (
            <p className="mt-1 text-xs text-rose-700">
              Выберите хотя бы одну группу.
            </p>
          )}
        </fieldset>

        {kind === 'event' && (
          <EventForm
            initialValue={
              prefillDate
                ? {
                    ...EMPTY_EVENT_FORM,
                    startAtMs: prefillDate.getTime(),
                    endAtMs: prefillDate.getTime() + 90 * 60 * 1000,
                  }
                : undefined
            }
            saving={saving}
            errorMessage={errorMessage}
            submitLabel={
              selectedRefs.length > 1
                ? `Опубликовать в ${selectedRefs.length} группах`
                : 'Опубликовать событие'
            }
            onSubmit={handleEvent}
          />
        )}
        {kind === 'announcement' && (
          <AnnouncementForm
            initialValue={EMPTY_ANNOUNCEMENT_FORM}
            isEveryone={someEveryone}
            saving={saving}
            errorMessage={errorMessage}
            submitLabel={
              selectedRefs.length > 1
                ? `Опубликовать в ${selectedRefs.length} группах`
                : 'Опубликовать'
            }
            onSubmit={handleAnnouncement}
          />
        )}
        {kind === 'assignment' && (
          <AssignmentForm
            initialValue={
              prefillDate
                ? {
                    ...EMPTY_ASSIGNMENT_FORM,
                    dueDate: toIsoDate(prefillDate),
                  }
                : EMPTY_ASSIGNMENT_FORM
            }
            saving={saving}
            errorMessage={errorMessage}
            submitLabel={
              selectedRefs.length > 1
                ? `Опубликовать задание в ${selectedRefs.length} группах`
                : 'Опубликовать задание'
            }
            onSubmit={handleAssignment}
          />
        )}
      </div>
    </BaseModal>
  );
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
