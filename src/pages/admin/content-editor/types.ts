/**
 * Types for content editor
 */

export interface Period {
  period: string;
  title: string;
  subtitle: string;
  published: boolean;
  order: number;
  accent: string;
  accent100: string;
  placeholder_enabled?: boolean;
  [key: string]: any;
}

export interface VideoFormEntry {
  id: string;
  title: string;
  url: string;
  deckUrl: string;
  audioUrl: string;
}

export interface ListItem {
  title?: string;
  name?: string;
  url?: string;
  type?: string;
  year?: string;
  [key: string]: string | undefined;
}

export interface EditableListProps {
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  label: string;
  placeholder: string;
  maxItems?: number;
  showUrl?: boolean;
  extraFields?: Array<{
    key: string;
    placeholder: string;
    type?: string;
  }>;
}

export interface SimpleListProps {
  items: string[];
  onChange: (items: string[]) => void;
  label: string;
  placeholder: string;
  maxItems?: number;
}

export interface VideoPlaylistEditorProps {
  items: VideoFormEntry[];
  onChange: (items: VideoFormEntry[]) => void;
  defaultTitle: string;
}
