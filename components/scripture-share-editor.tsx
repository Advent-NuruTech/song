import { Check, Copy, Share2, X } from "@/components/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { copyScriptureExcerpt, shareScriptureExcerpt } from "@/src/services/shareService";

type Selection = { start: number; end: number };

type ScriptureShareEditorProps = {
  visible: boolean;
  onClose: () => void;
  reference: string;
  text: string;
  onCopied?: () => void;
};

export function ScriptureShareEditor({
  visible,
  onClose,
  reference,
  text,
  onCopied,
}: ScriptureShareEditorProps) {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const inputRef = useRef<TextInput>(null);
  const [draft, setDraft] = useState(text);
  const [selection, setSelection] = useState<Selection>({ start: 0, end: text.length });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDraft(text);
    setSelection({ start: 0, end: text.length });
    setCopied(false);
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, [text, visible]);

  const excerpt = useMemo(() => {
    const start = Math.min(selection.start, selection.end);
    const end = Math.max(selection.start, selection.end);
    const highlighted = draft.slice(start, end).trim();
    return highlighted || draft.trim();
  }, [draft, selection]);

  const hasHighlight = selection.start !== selection.end;

  const copy = async () => {
    if (!excerpt) return;
    const ok = await copyScriptureExcerpt(reference, excerpt);
    if (!ok) return;
    setCopied(true);
    onCopied?.();
  };

  const share = () => {
    if (!excerpt) return;
    void shareScriptureExcerpt(reference, excerpt);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.dialog,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Text style={[styles.eyebrow, { color: colors.tint, fontFamily }]}>CHOOSE EXACT TEXT</Text>
              <Text
                style={[styles.title, { color: colors.text, fontFamily, fontSize: size(19) }]}
                numberOfLines={1}
              >
                {reference}
              </Text>
            </View>
            <Pressable accessibilityLabel="Close text selector" onPress={onClose} style={styles.close}>
              <X size={22} color={colors.mutedText} />
            </Pressable>
          </View>

          <Text style={[styles.help, { color: colors.mutedText, fontFamily, fontSize: size(13) }]}>
            Drag the selection handles to choose a word, part of a verse, or several verses. You can also edit the text.
          </Text>

          <TextInput
            ref={inputRef}
            multiline
            value={draft}
            onChangeText={setDraft}
            selection={selection}
            onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
            selectTextOnFocus
            textAlignVertical="top"
            style={[
              styles.editor,
              {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: colors.border,
                fontFamily,
                fontSize: size(17),
                lineHeight: size(27),
              },
            ]}
          />

          <View style={styles.selectionRow}>
            <Text style={[styles.selectionHint, { color: colors.mutedText, fontFamily }]}>
              {hasHighlight ? `${excerpt.length} characters selected` : "No highlight — actions use all text"}
            </Text>
            <Pressable
              onPress={() => setSelection({ start: 0, end: draft.length })}
              hitSlop={8}
            >
              <Text style={[styles.selectAll, { color: colors.tint, fontFamily }]}>Select all</Text>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Pressable
              disabled={!excerpt}
              onPress={() => void copy()}
              style={[styles.action, { borderColor: colors.border, opacity: excerpt ? 1 : 0.45 }]}
            >
              {copied ? <Check size={18} color={colors.tint} /> : <Copy size={18} color={colors.text} />}
              <Text style={[styles.actionText, { color: colors.text, fontFamily }]}>
                {copied ? "Copied" : hasHighlight ? "Copy selected" : "Copy all"}
              </Text>
            </Pressable>
            <Pressable
              disabled={!excerpt}
              onPress={share}
              style={[
                styles.action,
                styles.primaryAction,
                { backgroundColor: colors.tint, opacity: excerpt ? 1 : 0.45 },
              ]}
            >
              <Share2 size={18} color={darkMode ? "#0B1220" : "#FFFFFF"} />
              <Text
                style={[
                  styles.actionText,
                  { color: darkMode ? "#0B1220" : "#FFFFFF", fontFamily },
                ]}
              >
                {hasHighlight ? "Share selected" : "Share all"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 20,
  },
  dialog: {
    width: "100%",
    maxWidth: 620,
    maxHeight: "86%",
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  header: { flexDirection: "row", alignItems: "center" },
  titleWrap: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginBottom: 4 },
  title: { fontWeight: "800" },
  close: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  help: { lineHeight: 19, marginTop: 12, marginBottom: 14 },
  editor: {
    minHeight: 180,
    maxHeight: 380,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  selectionRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  selectionHint: { flex: 1, fontSize: 11 },
  selectAll: { fontSize: 13, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 10 },
  action: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
  },
  primaryAction: { borderWidth: 0 },
  actionText: { fontSize: 13, fontWeight: "800" },
});
