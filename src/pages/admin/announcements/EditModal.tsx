import { useState } from 'react';
import { BaseModal } from '../../../components/ui/BaseModal';
import {
  deleteGroupAnnouncement,
  deleteGroupEvent,
  updateGroupAnnouncement,
  updateGroupEvent,
} from '../../../hooks/useGroupFeed';
import { debugError } from '../../../lib/debug';
import type { GroupAnnouncement, GroupEvent } from '../../../types/groupFeed';
import { AnnouncementForm, announcementToFormValue } from './forms/AnnouncementForm';
import { EventForm, eventToFormValue } from './forms/EventForm';
import { AssignmentForm, assignmentToFormValue } from './forms/AssignmentForm';
import { isEveryoneGroup } from '../../../../shared/groups/everyoneGroup';

export type EditTarget =
  | { kind: 'announcement'; groupId: string; item: GroupAnnouncement }
  | { kind: 'event'; groupId: string; item: GroupEvent }
  | { kind: 'assignment'; groupId: string; item: GroupEvent };

interface EditModalProps {
  target: EditTarget | null;
  onClose: () => void;
}

export function EditModal({ target, onClose }: EditModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!target) return null;

  const reset = () => {
    setSaving(false);
    setError(null);
    setConfirmDelete(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleSaveAnnouncement = async (payload: {
    text: string;
    newsType: 'tech' | 'content' | null;
  }) => {
    if (target.kind !== 'announcement') return;
    setSaving(true);
    setError(null);
    try {
      const isEveryone = isEveryoneGroup(target.groupId);
      await updateGroupAnnouncement(target.groupId, target.item.id, {
        text: payload.text,
        newsType: isEveryone ? payload.newsType : null,
      });
      close();
    } catch (err) {
      debugError('updateGroupAnnouncement failed', err);
      setError(err instanceof Error ? err.message : 'Не удалось сохранить.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEvent = async (payload: {
    text: string;
    startAtMs: number;
    endAtMs: number;
    isAllDay: boolean;
    zoomLink: string;
    siteLink: string;
  }) => {
    if (target.kind !== 'event') return;
    setSaving(true);
    setError(null);
    try {
      await updateGroupEvent(target.groupId, target.item.id, {
        text: payload.text,
        startAtMs: payload.startAtMs,
        endAtMs: payload.endAtMs,
        isAllDay: payload.isAllDay,
        zoomLink: payload.zoomLink || null,
        siteLink: payload.siteLink || null,
      });
      close();
    } catch (err) {
      debugError('updateGroupEvent failed', err);
      setError(err instanceof Error ? err.message : 'Не удалось сохранить.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAssignment = async (payload: {
    text: string;
    dueDate: string;
    longText: string;
  }) => {
    if (target.kind !== 'assignment') return;
    setSaving(true);
    setError(null);
    try {
      await updateGroupEvent(target.groupId, target.item.id, {
        text: payload.text,
        dueDate: payload.dueDate,
        longText: payload.longText || null,
      });
      close();
    } catch (err) {
      debugError('updateGroupEvent (assignment) failed', err);
      setError(err instanceof Error ? err.message : 'Не удалось сохранить.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setError(null);
    try {
      if (target.kind === 'announcement') {
        await deleteGroupAnnouncement(target.groupId, target.item.id);
      } else {
        await deleteGroupEvent(target.groupId, target.item.id);
      }
      close();
    } catch (err) {
      debugError('delete failed', err);
      setError(err instanceof Error ? err.message : 'Не удалось удалить.');
      setSaving(false);
    }
  };

  const titleByKind = {
    announcement: 'Редактировать объявление',
    event: 'Редактировать событие',
    assignment: 'Редактировать задание',
  } as const;

  const footer = (
    <div className="flex w-full items-center justify-between gap-3">
      {confirmDelete ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-rose-700">Точно удалить?</span>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            disabled={saving}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-40"
          >
            Нет
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700 disabled:opacity-40"
          >
            Удалить
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          disabled={saving}
          className="rounded-md bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-40"
        >
          🗑 Удалить
        </button>
      )}
    </div>
  );

  return (
    <BaseModal
      isOpen={!!target}
      onClose={close}
      title={titleByKind[target.kind]}
      footer={footer}
      disabled={saving}
      maxWidth="2xl"
    >
      {target.kind === 'announcement' && (
        <AnnouncementForm
          initialValue={announcementToFormValue(target.item)}
          isEveryone={isEveryoneGroup(target.groupId)}
          saving={saving}
          errorMessage={error}
          submitLabel="Сохранить"
          onSubmit={handleSaveAnnouncement}
        />
      )}
      {target.kind === 'event' && (
        <EventForm
          initialValue={eventToFormValue(target.item)}
          saving={saving}
          errorMessage={error}
          submitLabel="Сохранить"
          onSubmit={handleSaveEvent}
        />
      )}
      {target.kind === 'assignment' && (
        <AssignmentForm
          initialValue={assignmentToFormValue(target.item)}
          saving={saving}
          errorMessage={error}
          submitLabel="Сохранить"
          onSubmit={handleSaveAssignment}
        />
      )}
    </BaseModal>
  );
}
