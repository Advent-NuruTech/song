import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { WebView } from "react-native-webview";

import { BibleInsertPicker, type BibleInsertion } from "./bible-insert-picker";
import type { RichNoteEditorProps } from "./rich-note-editor.types";

type Tool = { icon: keyof typeof Ionicons.glyphMap; label: string; command: string; value?: string };
const TOOLS: Tool[] = [
  { icon: "text", label: "Paragraph", command: "formatBlock", value: "p" },
  { icon: "text-outline", label: "Heading", command: "formatBlock", value: "h2" },
  { icon: "logo-buffer", label: "Bold", command: "bold" },
  { icon: "at", label: "Italic", command: "italic" },
  { icon: "remove-outline", label: "Underline", command: "underline" },
  { icon: "list", label: "Bulleted list", command: "insertUnorderedList" },
  { icon: "list-outline", label: "Numbered list", command: "insertOrderedList" },
];

export default function RichNoteEditor(props: RichNoteEditorProps) {
  const webView = useRef<WebView>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("https://");
  const [bibleOpen, setBibleOpen] = useState(false);

  const source = useMemo(() => ({ html: editorDocument(props.initialHtml, props.cardColor, props.textColor, props.tint) }), [props.cardColor, props.initialHtml, props.textColor, props.tint]);
  const send = (command: string, value?: string) => webView.current?.postMessage(JSON.stringify({ command, value }));

  const insertImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsEditing: false, quality: 0.72, base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;
    send("insertImage", `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`);
  };

  const insertLink = () => {
    const url = /^https?:\/\//i.test(linkUrl.trim()) ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    send("insertLink", JSON.stringify({ url, text: linkText.trim() }));
    setLinkOpen(false);
    setLinkText("");
    setLinkUrl("https://");
  };

  const insertBible = (passage: BibleInsertion) => {
    send("insertBible", passage.html);
    return true;
  };

  return (
    <View style={[styles.shell, { borderColor: props.borderColor, backgroundColor: props.cardColor }]}>
      <View style={[styles.toolbar, { borderBottomColor: props.borderColor }]}>
        {TOOLS.map((tool) => (
          <Pressable key={tool.label} accessibilityLabel={tool.label} onPress={() => send(tool.command, tool.value)} style={styles.tool}>
            <Ionicons name={tool.icon} size={19} color={props.textColor} />
          </Pressable>
        ))}
        <Pressable accessibilityLabel="Insert a named link" onPress={() => setLinkOpen(true)} style={styles.tool}>
          <Ionicons name="link" size={20} color={props.tint} />
        </Pressable>
        <Pressable accessibilityLabel="Insert an image" onPress={() => void insertImage()} style={styles.tool}>
          <Ionicons name="image-outline" size={20} color={props.tint} />
        </Pressable>
        <Pressable accessibilityLabel="Insert Bible passage" onPress={() => setBibleOpen(true)} style={styles.tool}>
          <Ionicons name="book-outline" size={20} color={props.tint} />
        </Pressable>
      </View>
      <WebView
        ref={webView}
        source={source}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        keyboardDisplayRequiresUserAction={false}
        style={[styles.webview, { backgroundColor: props.cardColor }]}
        onMessage={(event) => {
          try {
            const value = JSON.parse(event.nativeEvent.data) as { type?: string; html?: string; text?: string };
            if (value.type === "bibleCommand") { setBibleOpen(true); return; }
            if (typeof value.html === "string" && typeof value.text === "string") props.onChange(value.html, value.text);
          } catch { /* Ignore unrelated webview messages. */ }
        }}
      />
      <Modal visible={linkOpen} transparent animationType="fade" onRequestClose={() => setLinkOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setLinkOpen(false)}>
          <Pressable style={[styles.dialog, { backgroundColor: props.cardColor, borderColor: props.borderColor }]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.dialogTitle, { color: props.textColor }]}>Insert link</Text>
            <Text style={[styles.label, { color: props.textColor }]}>Words to show</Text>
            <TextInput value={linkText} onChangeText={setLinkText} placeholder="Use selected text" placeholderTextColor="#94A3B8" style={[styles.input, { color: props.textColor, borderColor: props.borderColor }]} />
            <Text style={[styles.label, { color: props.textColor }]}>Web address</Text>
            <TextInput value={linkUrl} onChangeText={setLinkUrl} autoCapitalize="none" keyboardType="url" style={[styles.input, { color: props.textColor, borderColor: props.borderColor }]} />
            <View style={styles.actions}>
              <Pressable onPress={() => setLinkOpen(false)} style={styles.action}><Text style={{ color: props.textColor }}>Cancel</Text></Pressable>
              <Pressable onPress={insertLink} style={[styles.action, { backgroundColor: props.tint }]}><Text style={styles.primaryText}>Insert link</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <BibleInsertPicker visible={bibleOpen} onClose={() => { setBibleOpen(false); send("restoreSelection"); }} onInsert={insertBible} />
    </View>
  );
}

function editorDocument(initialHtml: string, cardColor: string, textColor: string, tint: string) {
  const initial = JSON.stringify(initialHtml || "<p></p>").replace(/</g, "\\u003c");
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>
    *{box-sizing:border-box}html,body{margin:0;background:${cardColor};color:${textColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    #editor{min-height:400px;padding:18px;font-size:17px;line-height:1.65;outline:none}#editor:empty:before{content:'Start writing your note...';color:#94a3b8}
    h1{font-size:2em}h2{font-size:1.45em;margin-top:1.2em}blockquote{border-left:4px solid ${tint};padding-left:12px;color:#64748b}a{color:${tint};text-decoration:underline;font-weight:600}
    img{display:block;max-width:100%;height:auto;margin:14px auto;border-radius:10px}li{margin:5px 0}
  </style></head><body><div id="editor" contenteditable="true"></div><script>
    const editor=document.getElementById('editor'); editor.innerHTML=${initial}; let savedRange=null;
    function remember(){const s=getSelection();if(s&&s.rangeCount&&editor.contains(s.anchorNode)) savedRange=s.getRangeAt(0).cloneRange()}
    function restore(){if(!savedRange)return;const s=getSelection();s.removeAllRanges();s.addRange(savedRange)}
    function detectBible(){const s=getSelection();if(!s||!s.rangeCount||!s.isCollapsed||!editor.contains(s.anchorNode)||s.anchorNode.nodeType!==3)return;const node=s.anchorNode,offset=s.anchorOffset,before=(node.textContent||'').slice(0,offset),match=before.match(/(?:^|\\s)(\\/bible)$/i);if(!match)return;const r=document.createRange();r.setStart(node,offset-match[1].length);r.setEnd(node,offset);r.deleteContents();r.collapse(true);savedRange=r.cloneRange();s.removeAllRanges();s.addRange(r);window.ReactNativeWebView.postMessage(JSON.stringify({type:'bibleCommand'}))}
    function emit(){remember();window.ReactNativeWebView.postMessage(JSON.stringify({type:'change',html:editor.innerHTML,text:editor.innerText||''}))}
    document.addEventListener('selectionchange',remember);editor.addEventListener('input',()=>{remember();detectBible();emit()});editor.addEventListener('blur',emit);
    document.addEventListener('message',receive);window.addEventListener('message',receive);
    function receive(event){try{const m=JSON.parse(event.data);editor.focus();restore();
      if(m.command==='insertImage'){document.execCommand('insertHTML',false,'<img src="'+m.value+'" alt="Note image"><p><br></p>')}
      else if(m.command==='insertLink'){const link=JSON.parse(m.value);const selection=getSelection();const shown=link.text||(selection&&selection.toString())||link.url;document.execCommand('insertHTML',false,'<a href="'+link.url.replace(/"/g,'&quot;')+'">'+shown.replace(/</g,'&lt;')+'</a>')}
      else if(m.command==='insertBible'){document.execCommand('insertHTML',false,m.value+'&nbsp;')}
      else if(m.command==='restoreSelection'){return}
      else document.execCommand(m.command,false,m.value||null);emit();}catch(e){}}
    setTimeout(emit,80);
  </script></body></html>`;
}

const styles = StyleSheet.create({
  shell: { borderWidth: 1, borderRadius: 16, overflow: "hidden", minHeight: 500 },
  toolbar: { minHeight: 49, borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center", paddingHorizontal: 5 },
  tool: { width: 39, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 9 },
  webview: { flex: 1, minHeight: 445 },
  backdrop: { flex: 1, justifyContent: "center", padding: 22, backgroundColor: "rgba(2,6,23,.58)" },
  dialog: { borderWidth: 1, borderRadius: 20, padding: 18 }, dialogTitle: { fontSize: 20, fontWeight: "800", marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "700", marginTop: 9, marginBottom: 6 }, input: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, minHeight: 46 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 18 }, action: { minHeight: 42, paddingHorizontal: 16, borderRadius: 11, alignItems: "center", justifyContent: "center" }, primaryText: { color: "#fff", fontWeight: "800" },
});
