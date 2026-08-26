export type RichNoteEditorProps = {
  initialHtml: string;
  onChange: (html: string, text: string) => void;
  darkMode: boolean;
  tint: string;
  textColor: string;
  borderColor: string;
  cardColor: string;
  /** Removes the outer card so the document rests directly on the page theme. */
  seamless?: boolean;
  /** A shorter editor intended for comments and other compact writing surfaces. */
  compact?: boolean;
  placeholder?: string;
  minHeight?: number;
  maxLength?: number;
  editable?: boolean;
};
