import { NoteModal } from '../../../components/NoteModal';
import type { AgeRange, Note } from '../../types/notes';

interface NotesEditorProps {
  isOpen: boolean;
  editingNote: Note | null;
  activeAgeRange: AgeRange | null;
  onClose: () => void;
  onSave: (data: {
    title: string;
    content: string;
    ageRange: AgeRange | null;
    topicId: string | null;
    topicTitle: string | null;
  }) => Promise<void>;
}

export function NotesEditor({
  isOpen,
  editingNote,
  activeAgeRange,
  onClose,
  onSave,
}: NotesEditorProps) {
  return (
    <NoteModal
      isOpen={isOpen}
      noteId={editingNote?.id}
      initialTitle={editingNote?.title}
      initialContent={editingNote?.content}
      initialAgeRange={editingNote?.ageRange ?? activeAgeRange}
      initialTopicId={editingNote?.topicId}
      initialTopicTitle={editingNote?.topicTitle ?? null}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
