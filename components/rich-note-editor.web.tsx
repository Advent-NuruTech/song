import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { BibleInsertPicker, type BibleInsertion } from "./bible-insert-picker";
import type { RichNoteEditorProps } from "./rich-note-editor.types";

export default function RichNoteEditor(props: RichNoteEditorProps) {
  const editor = useRef<HTMLDivElement | null>(null);
  const savedRange = useRef<Range | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("https://");
  const [bibleOpen, setBibleOpen] = useState(false);

  const remember = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && editor.current?.contains(selection.anchorNode)) savedRange.current = selection.getRangeAt(0).cloneRange();
  };
  const restore = () => {
    editor.current?.focus();
    if (!savedRange.current) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(savedRange.current);
  };
  const emit = () => props.onChange(editor.current?.innerHTML || "<p></p>", editor.current?.innerText || "");
  const command = (name: string, value?: string) => { restore(); document.execCommand(name, false, value); emit(); };
  const detectBibleCommand = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !selection.isCollapsed || !editor.current?.contains(selection.anchorNode)) return;
    const node = selection.anchorNode;
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const offset = selection.anchorOffset;
    const before = node.textContent?.slice(0, offset) ?? "";
    const match = before.match(/(?:^|\s)(\/bible)$/i);
    if (!match) return;
    const range = document.createRange();
    range.setStart(node, offset - match[1].length);
    range.setEnd(node, offset);
    savedRange.current = range;
    setBibleOpen(true);
  };
  const insertBible = (passage: BibleInsertion) => {
    restore();
    document.execCommand("insertHTML", false, `${passage.html}&nbsp;`);
    remember();
    emit();
    return true;
  };
  const insertImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.72, base64: true });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;
    command("insertHTML", `<img src="data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}" alt="Note image"><p><br></p>`);
  };
  const insertLink = () => {
    restore();
    const rawUrl = linkUrl.trim();
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const selected = window.getSelection()?.toString() || "";
    const shown = linkText.trim() || selected || url;
    const anchor = document.createElement("a"); anchor.href = url; anchor.textContent = shown;
    document.execCommand("insertHTML", false, anchor.outerHTML);
    emit(); setLinkOpen(false); setLinkText(""); setLinkUrl("https://");
  };

  const tools: { icon: keyof typeof Ionicons.glyphMap; label: string; action: () => void }[] = [
    { icon: "text", label: "Paragraph", action: () => command("formatBlock", "p") },
    { icon: "text-outline", label: "Heading", action: () => command("formatBlock", "h2") },
    { icon: "logo-buffer", label: "Bold", action: () => command("bold") },
    { icon: "at", label: "Italic", action: () => command("italic") },
    { icon: "remove-outline", label: "Underline", action: () => command("underline") },
    { icon: "list", label: "Bulleted list", action: () => command("insertUnorderedList") },
    { icon: "list-outline", label: "Numbered list", action: () => command("insertOrderedList") },
  ];

  return (
    <View style={[styles.shell, { borderColor: props.borderColor, backgroundColor: props.cardColor }]}>
      <View style={[styles.toolbar, { borderBottomColor: props.borderColor }]}>
        {tools.map((tool) => <Pressable key={tool.label} accessibilityLabel={tool.label} onPress={tool.action} style={styles.tool}><Ionicons name={tool.icon} size={19} color={props.textColor} /></Pressable>)}
        <Pressable accessibilityLabel="Insert a named link" onPress={() => { remember(); setLinkOpen(true); }} style={styles.tool}><Ionicons name="link" size={20} color={props.tint} /></Pressable>
        <Pressable accessibilityLabel="Insert an image" onPress={() => { remember(); void insertImage(); }} style={styles.tool}><Ionicons name="image-outline" size={20} color={props.tint} /></Pressable>
        <Pressable accessibilityLabel="Insert Bible passage" onPress={() => { remember(); setBibleOpen(true); }} style={styles.tool}><Ionicons name="book-outline" size={20} color={props.tint} /></Pressable>
      </View>
      <div
        ref={editor}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { remember(); detectBibleCommand(); emit(); }}
        onKeyUp={remember}
        onMouseUp={remember}
        dangerouslySetInnerHTML={{ __html: props.initialHtml || "<p></p>" }}
        data-placeholder="Start writing your note..."
        style={{ minHeight: 445, padding: 18, outline: "none", color: props.textColor, background: props.cardColor, fontFamily: "system-ui, sans-serif", fontSize: 17, lineHeight: 1.65 }}
      />
      <Modal visible={linkOpen} transparent animationType="fade" onRequestClose={() => setLinkOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setLinkOpen(false)}>
          <Pressable style={[styles.dialog, { backgroundColor: props.cardColor, borderColor: props.borderColor }]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.dialogTitle, { color: props.textColor }]}>Insert link</Text>
            <Text style={[styles.label, { color: props.textColor }]}>Words to show</Text>
            <TextInput value={linkText} onChangeText={setLinkText} placeholder="Use selected text" placeholderTextColor="#94A3B8" style={[styles.input, { color: props.textColor, borderColor: props.borderColor }]} />
            <Text style={[styles.label, { color: props.textColor }]}>Web address</Text>
            <TextInput value={linkUrl} onChangeText={setLinkUrl} autoCapitalize="none" style={[styles.input, { color: props.textColor, borderColor: props.borderColor }]} />
            <View style={styles.actions}><Pressable onPress={() => setLinkOpen(false)} style={styles.action}><Text style={{ color: props.textColor }}>Cancel</Text></Pressable><Pressable onPress={insertLink} style={[styles.action, { backgroundColor: props.tint }]}><Text style={styles.primaryText}>Insert link</Text></Pressable></View>
          </Pressable>
        </Pressable>
      </Modal>
      <BibleInsertPicker visible={bibleOpen} onClose={() => { setBibleOpen(false); requestAnimationFrame(restore); }} onInsert={insertBible} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { borderWidth: 1, borderRadius: 16, overflow: "hidden", minHeight: 500 }, toolbar: { minHeight: 49, borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center", paddingHorizontal: 5 }, tool: { width: 39, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 9 },
  backdrop: { flex: 1, justifyContent: "center", padding: 22, backgroundColor: "rgba(2,6,23,.58)" }, dialog: { borderWidth: 1, borderRadius: 20, padding: 18 }, dialogTitle: { fontSize: 20, fontWeight: "800", marginBottom: 14 }, label: { fontSize: 12, fontWeight: "700", marginTop: 9, marginBottom: 6 }, input: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, minHeight: 46 }, actions: { flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 18 }, action: { minHeight: 42, paddingHorizontal: 16, borderRadius: 11, alignItems: "center", justifyContent: "center" }, primaryText: { color: "#fff", fontWeight: "800" },
});
