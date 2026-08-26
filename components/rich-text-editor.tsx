/**
 * App-wide rich text editor.
 *
 * The platform-specific implementation lives in rich-note-editor(.web).tsx for
 * backwards compatibility with older imports. New writing surfaces should use
 * this portable name.
 */
export { default } from "./rich-note-editor";
export type { RichNoteEditorProps as RichTextEditorProps } from "./rich-note-editor.types";
