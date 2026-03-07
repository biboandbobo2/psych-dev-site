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

export interface DisorderTableEntry {
  id: string;
  rowIds: string[];
  columnIds: string[];
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DisorderTableEntryInput {
  rowIds: string[];
  columnIds: string[];
  text: string;
}

export interface DisorderTableFilters {
  rowIds: string[];
  columnIds: string[];
}
