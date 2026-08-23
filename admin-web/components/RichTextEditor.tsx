"use client";

import {
  ClipboardEvent,
  DragEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./RichTextEditor.module.css";

export type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  ariaLabel?: string;
  uploadImage?: (source: File | string) => Promise<string>;
  onBusyChange?: (busy: boolean) => void;
};

const ALLOWED_TAGS = new Set([
  "A", "B", "BLOCKQUOTE", "BR", "CODE", "COL", "COLGROUP", "DIV", "EM",
  "FIGCAPTION", "FIGURE", "FONT", "H1", "H2", "H3", "H4", "H5", "H6",
  "HR", "I", "IMG", "LI", "OL", "P", "PRE", "S", "SPAN", "STRIKE",
  "STRONG", "SUB", "SUP", "TABLE", "TBODY", "TD", "TFOOT", "TH", "THEAD",
  "TR", "U", "UL",
]);

const ALLOWED_STYLES = new Set([
  "background-color", "color", "font-family", "font-size", "font-style",
  "font-weight", "letter-spacing", "line-height", "margin-left", "text-align",
  "text-decoration", "text-indent", "vertical-align", "white-space", "width",
]);

const SIZE_MAP: Record<string, string> = {
  "1": "10px", "2": "13px", "3": "16px", "4": "18px", "5": "24px",
  "6": "32px", "7": "48px",
};

function isSafeUrl(value: string, image = false) {
  const trimmed = value.trim();
  if (image && /^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(trimmed)) return true;
  return /^(?:https?:|mailto:|tel:)/i.test(trimmed);
}

function cleanStyle(styleText: string) {
  if (typeof document === "undefined") return "";
  const source = document.createElement("span");
  source.setAttribute("style", styleText);
  const target = document.createElement("span");

  for (const property of Array.from(source.style)) {
    const name = property.toLowerCase();
    const value = source.style.getPropertyValue(property).trim();
    if (!ALLOWED_STYLES.has(name)) continue;
    if (/url\s*\(|expression\s*\(|javascript:|@import/i.test(value)) continue;
    target.style.setProperty(name, value);
  }

  return target.getAttribute("style") ?? "";
}

/** Keeps document typography and safe media while removing executable markup. */
export function sanitizeRichTextHtml(html: string) {
  if (!html || typeof DOMParser === "undefined") return html;

  const parsed = new DOMParser().parseFromString(html, "text/html");
  parsed.querySelectorAll("script,style,noscript,iframe,object,embed,form,meta,link").forEach((node) => node.remove());

  for (const element of Array.from(parsed.body.querySelectorAll("*")).reverse()) {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    const style = cleanStyle(element.getAttribute("style") ?? "");
    const href = element.tagName === "A" ? element.getAttribute("href") ?? "" : "";
    const src = element.tagName === "IMG" ? element.getAttribute("src") ?? "" : "";
    const alt = element.tagName === "IMG" ? element.getAttribute("alt") ?? "" : "";
    const width = element.getAttribute("width") ?? "";
    const height = element.getAttribute("height") ?? "";
    const face = element.tagName === "FONT" ? element.getAttribute("face") ?? "" : "";
    const color = element.tagName === "FONT" ? element.getAttribute("color") ?? "" : "";
    const size = element.tagName === "FONT" ? element.getAttribute("size") ?? "" : "";

    for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
    if (style) element.setAttribute("style", style);

    if (element.tagName === "A" && isSafeUrl(href)) {
      element.setAttribute("href", href);
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noopener noreferrer");
    }

    if (element.tagName === "IMG") {
      if (!isSafeUrl(src, true)) {
        element.remove();
        continue;
      }
      element.setAttribute("src", src);
      if (alt) element.setAttribute("alt", alt.slice(0, 300));
      if (/^\d{1,5}$/.test(width)) element.setAttribute("width", width);
      if (/^\d{1,5}$/.test(height)) element.setAttribute("height", height);
    }

    if (element.tagName === "FONT") {
      if (face && !/[;{}]/.test(face)) element.setAttribute("face", face.slice(0, 120));
      if (color && !/[;{}]/.test(color)) element.setAttribute("color", color.slice(0, 50));
      if (/^[1-7]$/.test(size)) element.setAttribute("size", size);
    }
  }

  const walker = parsed.createTreeWalker(parsed.body, NodeFilter.SHOW_COMMENT);
  const comments: Node[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((comment) => comment.parentNode?.removeChild(comment));
  return parsed.body.innerHTML.trim();
}

export function richTextToPlainText(value: string) {
  if (!value) return "";
  if (typeof DOMParser === "undefined") return value.replace(/<[^>]+>/g, " ");
  const parsed = new DOMParser().parseFromString(value, "text/html");
  return parsed.body.textContent ?? "";
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function legacyContentToHtml(value: string) {
  if (!value) return "";
  if (/<\/?(?:p|div|h[1-6]|span|strong|b|em|i|u|a|img|ul|ol|li|blockquote|br|font)\b/i.test(value)) {
    return sanitizeRichTextHtml(value);
  }

  const inline = (text: string) => escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/g, '<span style="color: $1">$2</span>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

  const blocks: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flushList = () => {
    if (!list) return;
    const tag = list.ordered ? "ol" : "ul";
    blocks.push(`<${tag}>${list.items.map((item) => `<li>${inline(item)}</li>`).join("")}</${tag}>`);
    list = null;
  };

  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.trim();
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (ordered || bullet) {
      const isOrdered = Boolean(ordered);
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, items: [] };
      }
      list.items.push((ordered?.[1] ?? bullet?.[1]) as string);
      continue;
    }
    flushList();
    if (!line) continue;
    if (line.startsWith("### ")) blocks.push(`<h3>${inline(line.slice(4))}</h3>`);
    else if (line.startsWith("## ")) blocks.push(`<h2>${inline(line.slice(3))}</h2>`);
    else if (line.startsWith("# ")) blocks.push(`<h1>${inline(line.slice(2))}</h1>`);
    else blocks.push(`<p>${inline(line)}</p>`);
  }
  flushList();
  return blocks.join("");
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing your document…",
  minHeight = 360,
  ariaLabel = "Rich text content editor",
  uploadImage,
  onBusyChange,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const lastValueRef = useRef("");
  const savedRangeRef = useRef<Range | null>(null);
  const [textColor, setTextColor] = useState("#111827");
  const [highlightColor, setHighlightColor] = useState("#fff59d");
  const [uploadingImages, setUploadingImages] = useState(0);

  useEffect(() => {
    onBusyChange?.(uploadingImages > 0);
  }, [onBusyChange, uploadingImages]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === lastValueRef.current) return;
    const prepared = legacyContentToHtml(value);
    if (editor.innerHTML !== prepared) editor.innerHTML = prepared;
    lastValueRef.current = value;
  }, [value]);

  const rememberSelection = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    editorRef.current?.focus();
    if (!savedRangeRef.current) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(savedRangeRef.current);
  };

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.querySelectorAll("font[size]").forEach((font) => {
      const size = font.getAttribute("size") ?? "3";
      (font as HTMLElement).style.fontSize = SIZE_MAP[size] ?? "16px";
      font.removeAttribute("size");
    });
    const nextValue = sanitizeRichTextHtml(editor.innerHTML);
    lastValueRef.current = nextValue;
    onChange(nextValue);
  };

  const command = (name: string, argument?: string) => {
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(name, false, argument);
    rememberSelection();
    emitChange();
  };

  const insertHtml = (html: string, range = savedRangeRef.current) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    if (range) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    document.execCommand("insertHTML", false, sanitizeRichTextHtml(html));
    rememberSelection();
    emitChange();
  };

  const fileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image."));
    reader.readAsDataURL(file);
  });

  const insertImageFile = async (file: File, range = savedRangeRef.current) => {
    if (!file.type.startsWith("image/")) return;
    setUploadingImages((count) => count + 1);
    try {
      let src: string;
      try {
        src = uploadImage ? await uploadImage(file) : await fileAsDataUrl(file);
      } catch {
        src = await fileAsDataUrl(file);
      }
      insertHtml(`<img src="${src}" alt="${escapeHtml(file.name)}">`, range);
    } catch (error) {
      window.alert((error as Error).message || "Could not add this image.");
    } finally {
      setUploadingImages((count) => Math.max(0, count - 1));
    }
  };

  const persistHtmlImages = async (html: string) => {
    const sanitized = sanitizeRichTextHtml(html);
    if (!uploadImage || typeof DOMParser === "undefined") return sanitized;
    const parsed = new DOMParser().parseFromString(sanitized, "text/html");
    const images = Array.from(parsed.body.querySelectorAll("img[src]"));
    if (!images.length) return sanitized;

    setUploadingImages((count) => count + images.length);
    await Promise.all(images.map(async (image, index) => {
      const original = image.getAttribute("src") ?? "";
      try {
        let source: File | string = original;
        if (original.startsWith("data:")) {
          const response = await fetch(original);
          const blob = await response.blob();
          source = new File([blob], `pasted-image-${index + 1}.${blob.type.split("/")[1] || "png"}`, { type: blob.type });
        }
        image.setAttribute("src", await uploadImage(source));
      } catch {
        // Keep a safe original URL/data URI if remote persistence is unavailable.
      } finally {
        setUploadingImages((count) => Math.max(0, count - 1));
      }
    }));
    return sanitizeRichTextHtml(parsed.body.innerHTML);
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const html = event.clipboardData.getData("text/html");
    if (html) {
      event.preventDefault();
      const range = savedRangeRef.current;
      const clipboardImage = Array.from(event.clipboardData.files).find((file) => file.type.startsWith("image/"));
      void persistHtmlImages(html).then((persistentHtml) => {
        insertHtml(persistentHtml, range);
        if (!/<img\b/i.test(persistentHtml) && clipboardImage) void insertImageFile(clipboardImage, savedRangeRef.current);
      });
      return;
    }
    const image = Array.from(event.clipboardData.files).find((file) => file.type.startsWith("image/"));
    if (image) {
      event.preventDefault();
      rememberSelection();
      void insertImageFile(image, savedRangeRef.current);
      return;
    }
    const plain = event.clipboardData.getData("text/plain");
    if (plain) {
      event.preventDefault();
      insertHtml(escapeHtml(plain).replace(/\r?\n/g, "<br>"));
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    const image = Array.from(event.dataTransfer.files).find((file) => file.type.startsWith("image/"));
    if (!image) return;
    event.preventDefault();
    void insertImageFile(image);
  };

  const addLink = () => {
    rememberSelection();
    const entered = window.prompt("Paste the link URL");
    if (!entered) return;
    const url = /^https?:\/\//i.test(entered) ? entered : `https://${entered}`;
    if (!isSafeUrl(url)) return;
    restoreSelection();
    const selection = window.getSelection();
    if (selection?.isCollapsed) insertHtml(`<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`);
    else command("createLink", url);
  };

  const onEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    command(event.shiftKey ? "outdent" : "indent");
  };

  const stopMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    rememberSelection();
  };

  return (
    <div className={styles.root}>
      <div className={styles.toolbar} role="toolbar" aria-label="Document formatting">
        <div className={styles.group}>
          <button type="button" className={styles.toolButton} title="Undo" aria-label="Undo" onMouseDown={stopMouseDown} onClick={() => command("undo")}>↶</button>
          <button type="button" className={styles.toolButton} title="Redo" aria-label="Redo" onMouseDown={stopMouseDown} onClick={() => command("redo")}>↷</button>
        </div>
        <span className={styles.divider} />
        <select className={`${styles.toolSelect} ${styles.blockSelect}`} defaultValue="p" aria-label="Paragraph style" onMouseDown={rememberSelection} onChange={(e) => command("formatBlock", e.target.value)}>
          <option value="p">Normal text</option><option value="h1">Title</option><option value="h2">Heading 1</option><option value="h3">Heading 2</option><option value="blockquote">Quote</option>
        </select>
        <select className={`${styles.toolSelect} ${styles.fontSelect}`} defaultValue="Arial" aria-label="Font family" onMouseDown={rememberSelection} onChange={(e) => command("fontName", e.target.value)}>
          <option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Times New Roman">Times New Roman</option><option value="Verdana">Verdana</option><option value="Tahoma">Tahoma</option><option value="Trebuchet MS">Trebuchet MS</option><option value="Courier New">Courier New</option>
        </select>
        <select className={`${styles.toolSelect} ${styles.sizeSelect}`} defaultValue="3" aria-label="Font size" onMouseDown={rememberSelection} onChange={(e) => command("fontSize", e.target.value)}>
          <option value="1">10</option><option value="2">13</option><option value="3">16</option><option value="4">18</option><option value="5">24</option><option value="6">32</option><option value="7">48</option>
        </select>
        <span className={styles.divider} />
        <div className={styles.group}>
          <button type="button" className={styles.toolButton} title="Bold" aria-label="Bold" style={{ fontWeight: 800 }} onMouseDown={stopMouseDown} onClick={() => command("bold")}>B</button>
          <button type="button" className={styles.toolButton} title="Italic" aria-label="Italic" style={{ fontStyle: "italic" }} onMouseDown={stopMouseDown} onClick={() => command("italic")}>I</button>
          <button type="button" className={styles.toolButton} title="Underline" aria-label="Underline" style={{ textDecoration: "underline" }} onMouseDown={stopMouseDown} onClick={() => command("underline")}>U</button>
          <label className={styles.colorButton} title="Text color" aria-label="Text color">A<span className={styles.colorUnderline} style={{ background: textColor }} /><input type="color" value={textColor} onMouseDown={rememberSelection} onChange={(e) => { setTextColor(e.target.value); command("foreColor", e.target.value); }} /></label>
          <label className={styles.colorButton} title="Highlight color" aria-label="Highlight color">✎<span className={styles.colorUnderline} style={{ background: highlightColor }} /><input type="color" value={highlightColor} onMouseDown={rememberSelection} onChange={(e) => { setHighlightColor(e.target.value); command("hiliteColor", e.target.value); }} /></label>
        </div>
        <span className={styles.divider} />
        <div className={styles.group}>
          <button type="button" className={styles.toolButton} title="Insert link" aria-label="Insert link" onMouseDown={stopMouseDown} onClick={addLink}>🔗</button>
          <button type="button" className={styles.toolButton} title="Remove link" aria-label="Remove link" onMouseDown={stopMouseDown} onClick={() => command("unlink")}>⛓</button>
          <button type="button" className={styles.toolButton} title="Insert image" aria-label="Insert image" onMouseDown={stopMouseDown} onClick={() => imageInputRef.current?.click()}>▣</button>
        </div>
        <span className={styles.divider} />
        <div className={styles.group}>
          <button type="button" className={styles.toolButton} title="Bulleted list" aria-label="Bulleted list" onMouseDown={stopMouseDown} onClick={() => command("insertUnorderedList")}>•≡</button>
          <button type="button" className={styles.toolButton} title="Numbered list" aria-label="Numbered list" onMouseDown={stopMouseDown} onClick={() => command("insertOrderedList")}>1≡</button>
          <button type="button" className={styles.toolButton} title="Align left" aria-label="Align left" onMouseDown={stopMouseDown} onClick={() => command("justifyLeft")}>☰</button>
          <button type="button" className={styles.toolButton} title="Align center" aria-label="Align center" onMouseDown={stopMouseDown} onClick={() => command("justifyCenter")}>≡</button>
          <button type="button" className={styles.toolButton} title="Clear formatting" aria-label="Clear formatting" onMouseDown={stopMouseDown} onClick={() => command("removeFormat")}>Tx</button>
        </div>
      </div>

      <div
        ref={editorRef}
        className={styles.editor}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline="true"
        data-placeholder={placeholder}
        style={{ minHeight }}
        onInput={(_: FormEvent<HTMLDivElement>) => { rememberSelection(); emitChange(); }}
        onKeyUp={rememberSelection}
        onMouseUp={rememberSelection}
        onBlur={rememberSelection}
        onKeyDown={onEditorKeyDown}
        onPaste={handlePaste}
        onDrop={handleDrop}
      />
      <div className={styles.hint} role="status">
        {uploadingImages > 0
          ? `Uploading ${uploadingImages} image${uploadingImages === 1 ? "" : "s"}…`
          : "Paste from Google Docs or Word to retain fonts, sizes, colors, links, lists, and images."}
      </div>
      <input
        ref={imageInputRef}
        className={styles.hiddenInput}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void insertImageFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
