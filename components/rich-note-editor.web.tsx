import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import { BibleInsertPicker, type BibleInsertion } from "./bible-insert-picker";
import type { RichNoteEditorProps } from "./rich-note-editor.types";

export default function RichNoteEditor(props: RichNoteEditorProps) {
  const { width } = useWindowDimensions();
  const editor = useRef<HTMLDivElement | null>(null);
  const savedRange = useRef<Range | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("https://");
  const [bibleOpen, setBibleOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [focused, setFocused] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const updateInset = () => {
      const viewport = window.visualViewport;
      setKeyboardInset(viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0);
    };
    updateInset();
    window.addEventListener("resize", updateInset);
    window.visualViewport?.addEventListener("resize", updateInset);
    window.visualViewport?.addEventListener("scroll", updateInset);
    return () => {
      window.removeEventListener("resize", updateInset);
      window.visualViewport?.removeEventListener("resize", updateInset);
      window.visualViewport?.removeEventListener("scroll", updateInset);
    };
  }, []);

  useEffect(() => {
    if (!maximized) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !bibleOpen && !linkOpen) setMaximized(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [bibleOpen, linkOpen, maximized]);

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
  const emit = () => {
    const element = editor.current;
    if (!element) return;
    if (props.maxLength && element.innerText.length > props.maxLength) {
      element.innerText = element.innerText.slice(0, props.maxLength);
    }
    props.onChange(element.innerHTML || "<p></p>", element.innerText || "");
  };
  const command = (name: string, value?: string) => { restore(); document.execCommand("styleWithCSS", false, "true"); document.execCommand(name, false, value); remember(); emit(); };
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
    range.deleteContents();
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange.current = range.cloneRange();
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

  const tools: { icon?: keyof typeof Ionicons.glyphMap; glyph?: string; label: string; action: () => void; glyphStyle?: "bold" | "italic" | "underline" }[] = [
    { glyph: "B", glyphStyle: "bold", label: "Bold", action: () => command("bold") },
    { glyph: "I", glyphStyle: "italic", label: "Italic", action: () => command("italic") },
    { glyph: "U", glyphStyle: "underline", label: "Underline", action: () => command("underline") },
    { glyph: "A", glyphStyle: "bold", label: "Text color", action: () => command("foreColor", props.tint) },
    { icon: "color-fill-outline", label: "Highlight", action: () => command("hiliteColor", "#FFF59D") },
    { icon: "list", label: "Bulleted list", action: () => command("insertUnorderedList") },
    { icon: "list-outline", label: "Numbered list", action: () => command("insertOrderedList") },
    { icon: "reorder-three-outline", label: "Align left", action: () => command("justifyLeft") },
    { icon: "menu-outline", label: "Align center", action: () => command("justifyCenter") },
    { icon: "arrow-undo-outline", label: "Undo", action: () => command("undo") },
    { icon: "arrow-redo-outline", label: "Redo", action: () => command("redo") },
    { glyph: "P", label: "Paragraph", action: () => command("formatBlock", "p") },
    { glyph: "H", glyphStyle: "bold", label: "Heading", action: () => command("formatBlock", "h2") },
    { glyph: "Tx", label: "Clear formatting", action: () => command("removeFormat") },
  ];
  const mobileEditor = width <= 900;
  const dockedToolbar = mobileEditor && focused;
  const toolbarStyle: CSSProperties = {
    position: dockedToolbar ? "fixed" : "sticky",
    top: dockedToolbar ? undefined : 0,
    right: dockedToolbar ? 0 : undefined,
    bottom: dockedToolbar ? keyboardInset : undefined,
    left: dockedToolbar ? 0 : undefined,
    zIndex: dockedToolbar ? 9500 : 20,
    display: mobileEditor && !focused ? "none" : "flex",
    alignItems: "center",
    minHeight: dockedToolbar ? 58 : 49,
    padding: dockedToolbar ? "7px max(8px, env(safe-area-inset-right)) max(7px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left))" : "4px 5px",
    overflowX: "auto",
    overflowY: "hidden",
    whiteSpace: "nowrap",
    borderTop: dockedToolbar ? `1px solid ${props.borderColor}` : undefined,
    borderBottom: dockedToolbar ? undefined : `1px solid ${props.borderColor}`,
    background: props.darkMode ? "#172033" : "#EAF1F8",
    boxShadow: dockedToolbar ? "0 -5px 18px rgba(15, 23, 42, 0.14)" : "none",
    scrollbarWidth: "thin",
  };

  return (
    <View style={[styles.shell, props.compact && styles.compactShell, props.seamless && styles.seamlessShell, maximized && styles.maximizedShell, { borderColor: props.borderColor, backgroundColor: props.cardColor }]}>
      <div role="toolbar" aria-label="Text formatting" style={toolbarStyle}>
        {tools.map((tool) => <Pressable key={tool.label} accessibilityLabel={tool.label} onPress={tool.action} style={styles.tool}>{tool.icon ? <Ionicons name={tool.icon} size={19} color={props.textColor} /> : <Text style={[styles.toolGlyph, { color: props.textColor }, tool.glyphStyle === "bold" && styles.boldGlyph, tool.glyphStyle === "italic" && styles.italicGlyph, tool.glyphStyle === "underline" && styles.underlineGlyph]}>{tool.glyph}</Text>}</Pressable>)}
        <Pressable accessibilityLabel="Insert a named link" onPress={() => { remember(); setLinkOpen(true); }} style={styles.tool}><Ionicons name="link" size={20} color={props.tint} /></Pressable>
        <Pressable accessibilityLabel="Insert an image" onPress={() => { remember(); void insertImage(); }} style={styles.tool}><Ionicons name="image-outline" size={20} color={props.tint} /></Pressable>
        <Pressable accessibilityLabel="Insert Bible passage" onPress={() => { remember(); setBibleOpen(true); }} style={styles.tool}><Ionicons name="book-outline" size={20} color={props.tint} /></Pressable>
        <Pressable accessibilityLabel={maximized ? "Restore editor size" : "Maximize editor"} onPress={() => setMaximized((current) => !current)} style={styles.tool}><Ionicons name={maximized ? "contract-outline" : "expand-outline"} size={20} color={props.tint} /></Pressable>
      </div>
      <div
        ref={editor}
        contentEditable={props.editable !== false}
        suppressContentEditableWarning
        onInput={() => { remember(); detectBibleCommand(); emit(); }}
        onKeyUp={remember}
        onMouseUp={remember}
        dangerouslySetInnerHTML={{ __html: props.initialHtml || "<p></p>" }}
        aria-label="Rich text editor"
        aria-multiline="true"
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onBeforeInput={(event) => {
          if (!props.maxLength || event.nativeEvent.inputType.startsWith("delete")) return;
          if ((editor.current?.innerText.length ?? 0) >= props.maxLength) event.preventDefault();
        }}
        data-placeholder={props.placeholder ?? (props.compact ? "Write something…" : "Start writing your note…")}
        style={{ minHeight: maximized ? 0 : (props.minHeight ?? (props.compact ? 96 : 270)), flex: maximized ? 1 : undefined, paddingTop: props.compact ? 10 : 14, paddingRight: props.seamless ? 0 : (props.compact ? 12 : 18), paddingBottom: dockedToolbar ? 88 : (props.compact ? 12 : 34), paddingLeft: props.seamless ? 0 : (props.compact ? 12 : 18), outline: "none", overflowY: maximized ? "auto" : "visible", color: props.textColor, background: props.cardColor, fontFamily: "system-ui, sans-serif", fontSize: props.compact ? 15 : 17, lineHeight: 1.65 }}
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
  shell: { borderWidth: 1, borderRadius: 16, overflow: "hidden", minHeight: 320 }, maximizedShell: { position: "fixed", top: 10, right: 10, bottom: 10, left: 10, zIndex: 9000, borderRadius: 16 }, toolbar: { minHeight: 49, borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center", paddingHorizontal: 5 }, tool: { width: 39, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 9 },
  seamlessShell: { borderWidth: 0, borderRadius: 0 }, compactShell: { minHeight: 146 }, toolbarContent: { minHeight: 49, flexDirection: "row", alignItems: "center", paddingHorizontal: 5 }, mobileDockedToolbar: { position: "fixed", left: 0, right: 0, zIndex: 9500, borderTopWidth: 1, borderBottomWidth: 0, shadowColor: "#0F172A", shadowOffset: { width: 0, height: -4 }, shadowOpacity: .14, shadowRadius: 12 },
  toolGlyph: { fontSize: 17, fontWeight: "600" }, boldGlyph: { fontWeight: "900" }, italicGlyph: { fontStyle: "italic" }, underlineGlyph: { textDecorationLine: "underline" },
  backdrop: { flex: 1, justifyContent: "center", padding: 22, backgroundColor: "rgba(2,6,23,.58)" }, dialog: { borderWidth: 1, borderRadius: 20, padding: 18 }, dialogTitle: { fontSize: 20, fontWeight: "800", marginBottom: 14 }, label: { fontSize: 12, fontWeight: "700", marginTop: 9, marginBottom: 6 }, input: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, minHeight: 46 }, actions: { flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 18 }, action: { minHeight: 42, paddingHorizontal: 16, borderRadius: 11, alignItems: "center", justifyContent: "center" }, primaryText: { color: "#fff", fontWeight: "800" },
});
