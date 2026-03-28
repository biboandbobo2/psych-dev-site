export interface DisorderTableColumnGroup {
  id: string;
  label: string;
}

export interface DisorderTableColumn {
  id: string;
  label: string;
  groupId: string;
}

export interface DisorderTableRow {
  id: string;
  label: string;
}

export type DisorderTableEntryTrack = 'patopsychology' | 'psychiatry';

export interface DisorderTableEntry {
  id: string;
  rowIds: string[];
  columnIds: string[];
  text: string;
  track: DisorderTableEntryTrack | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DisorderTableEntryInput {
  rowIds: string[];
  columnIds: string[];
  text: string;
  track?: DisorderTableEntryTrack | null;
}

export interface DisorderTableFilters {
  rowIds: string[];
  columnIds: string[];
}

export interface DisorderTableCellSelection {
  rowId: string;
  columnId: string;
}

export interface DisorderTableComment {
  id: string;
  entryId: string;
  text: string;
  authorUid: string;
  authorName: string;
  createdAt: Date;
}

export interface DisorderTableCommentInput {
  entryId: string;
  text: string;
}

export interface DisorderTableStudent {
  uid: string;
  displayName: string;
  email: string;
}
