import { NoteModal } from '../../../components/NoteModal';
import type { Note } from '../../types/notes';

interface NotesEditorProps {
  isOpen: boolean;
  editingNote: Note | null;
  defaultCourseId: string | null;
  defaultPeriodId: string | null;
  defaultPeriodTitle: string | null;
  onClose: () => void;
  onSave: (data: {
    title: string;
    content: string;
    courseId: string | null;
    periodId: string | null;
    periodTitle: string | null;
    topicId: string | null;
    topicTitle: string | null;
  }) => Promise<void>;
}

export function NotesEditor({
  isOpen,
  editingNote,
  defaultCourseId,
  defaultPeriodId,
  defaultPeriodTitle,
  onClose,
  onSave,
}: NotesEditorProps) {
  return (
    <NoteModal
      isOpen={isOpen}
      noteId={editingNote?.id}
      initialTitle={editingNote?.title}
      initialContent={editingNote?.content}
      initialCourseId={editingNote?.courseId ?? defaultCourseId}
      initialPeriodId={editingNote?.periodId ?? defaultPeriodId}
      initialPeriodTitle={editingNote?.periodTitle ?? defaultPeriodTitle}
      initialTopicId={editingNote?.topicId}
      initialTopicTitle={editingNote?.topicTitle ?? null}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
