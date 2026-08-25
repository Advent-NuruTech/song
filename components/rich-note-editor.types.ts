export type RichNoteEditorProps = {
  initialHtml: string;
  onChange: (html: string, text: string) => void;
  darkMode: boolean;
  tint: string;
  textColor: string;
  borderColor: string;
  cardColor: string;
};

