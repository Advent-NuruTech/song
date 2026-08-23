import { useState } from "react";
import {
  Image,
  ImageStyle,
  Linking,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from "react-native";

type TextNode = { type: "text"; text: string };
type ElementNode = {
  type: "element";
  tag: string;
  attributes: Record<string, string>;
  children: RichNode[];
};
type RichNode = TextNode | ElementNode;

type InlineToken =
  | { type: "text"; text: string; style: TextStyle; link?: string }
  | { type: "image"; src: string; alt?: string; width?: number; height?: number };

type Props = {
  html: string;
  colors: { text: string; mutedText: string; tint: string; border: string; card: string };
  size: (value: number) => number;
  fontFamily: string;
};

const VOID_TAGS = new Set(["br", "hr", "img", "col"]);
const BLOCK_TAGS = new Set([
  "blockquote", "div", "figure", "h1", "h2", "h3", "h4", "h5", "h6",
  "hr", "img", "ol", "p", "pre", "table", "ul",
]);

export function isRichStudyHtml(value: string) {
  return /<\/?(?:p|div|h[1-6]|span|strong|b|em|i|u|a|img|ul|ol|li|blockquote|br|font)\b/i.test(value);
}

function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function parseAttributes(source: string) {
  const attributes: Record<string, string> = {};
  const pattern = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    attributes[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function parseHtml(source: string): RichNode[] {
  const root: ElementNode = { type: "element", tag: "root", attributes: {}, children: [] };
  const stack: ElementNode[] = [root];
  const pattern = /<!--[\s\S]*?-->|<[^>]+>|[^<]+/g;
  let token: RegExpExecArray | null;

  while ((token = pattern.exec(source)) !== null) {
    const value = token[0];
    if (value.startsWith("<!--")) continue;
    if (!value.startsWith("<")) {
      stack[stack.length - 1].children.push({ type: "text", text: decodeEntities(value) });
      continue;
    }
    const closing = value.match(/^<\/\s*([\w-]+)/);
    if (closing) {
      const tag = closing[1].toLowerCase();
      while (stack.length > 1) {
        const node = stack.pop();
        if (node?.tag === tag) break;
      }
      continue;
    }
    const opening = value.match(/^<\s*([\w-]+)([\s\S]*?)\/?\s*>$/);
    if (!opening) continue;
    const tag = opening[1].toLowerCase();
    const node: ElementNode = {
      type: "element",
      tag,
      attributes: parseAttributes(opening[2]),
      children: [],
    };
    stack[stack.length - 1].children.push(node);
    if (!VOID_TAGS.has(tag) && !/\/\s*>$/.test(value)) stack.push(node);
  }
  return root.children;
}

function numberFromCss(value?: string) {
  if (!value) return undefined;
  const match = value.match(/^([\d.]+)(px|pt|rem|em|%)?$/i);
  if (!match) return undefined;
  const number = Number(match[1]);
  if (!Number.isFinite(number)) return undefined;
  if (match[2]?.toLowerCase() === "pt") return number * (4 / 3);
  if (match[2]?.toLowerCase() === "rem" || match[2]?.toLowerCase() === "em") return number * 16;
  if (match[2] === "%") return (number / 100) * 16;
  return number;
}

function styleFromNode(node: ElementNode, size: Props["size"]): TextStyle {
  const result: TextStyle = {};
  const declarations = (node.attributes.style ?? "").split(";");
  const styleValues: Record<string, string> = {};
  for (const declaration of declarations) {
    const separator = declaration.indexOf(":");
    if (separator < 0) continue;
    styleValues[declaration.slice(0, separator).trim().toLowerCase()] = declaration.slice(separator + 1).trim();
  }

  const fontSize = numberFromCss(styleValues["font-size"]);
  if (fontSize) result.fontSize = size(Math.max(9, Math.min(fontSize, 54)));
  if (styleValues.color) result.color = styleValues.color;
  if (styleValues["background-color"]) result.backgroundColor = styleValues["background-color"];
  if (styleValues["font-family"]) result.fontFamily = styleValues["font-family"].split(",")[0].replace(/["']/g, "").trim();
  if (styleValues["text-align"] && ["auto", "left", "right", "center", "justify"].includes(styleValues["text-align"])) {
    result.textAlign = styleValues["text-align"] as TextStyle["textAlign"];
  }
  const decoration = styleValues["text-decoration"] ?? "";
  if (decoration.includes("underline") && decoration.includes("line-through")) result.textDecorationLine = "underline line-through";
  else if (decoration.includes("underline")) result.textDecorationLine = "underline";
  else if (decoration.includes("line-through")) result.textDecorationLine = "line-through";
  const lineHeight = numberFromCss(styleValues["line-height"]);
  if (lineHeight) result.lineHeight = size(Math.max(12, Math.min(lineHeight, 72)));

  if (["b", "strong"].includes(node.tag)) result.fontWeight = "700";
  if (["em", "i"].includes(node.tag)) result.fontStyle = "italic";
  if (node.tag === "u") result.textDecorationLine = "underline";
  if (["s", "strike"].includes(node.tag)) result.textDecorationLine = "line-through";
  if (node.tag === "code") result.fontFamily = "monospace";
  if (node.tag === "sub") { result.fontSize = size(11); result.transform = [{ translateY: 3 }]; }
  if (node.tag === "sup") { result.fontSize = size(11); result.transform = [{ translateY: -3 }]; }
  if (node.tag === "font") {
    if (node.attributes.face) result.fontFamily = node.attributes.face.split(",")[0].replace(/["']/g, "").trim();
    if (node.attributes.color) result.color = node.attributes.color;
    const legacySize = Number(node.attributes.size);
    if (legacySize >= 1 && legacySize <= 7) result.fontSize = size([10, 13, 16, 18, 24, 32, 48][legacySize - 1]);
  }
  if (styleValues["font-style"] === "italic") result.fontStyle = "italic";
  else if (styleValues["font-style"] === "normal") result.fontStyle = "normal";
  if (/bold|[6-9]00/.test(styleValues["font-weight"] ?? "")) result.fontWeight = "700";
  else if (/normal|[1-5]00/.test(styleValues["font-weight"] ?? "")) result.fontWeight = "400";
  return result;
}

function flattenInline(nodes: RichNode[], size: Props["size"], inherited: TextStyle = {}, link?: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  for (const node of nodes) {
    if (node.type === "text") {
      if (node.text) tokens.push({ type: "text", text: node.text, style: inherited, link });
      continue;
    }
    if (node.tag === "br") {
      tokens.push({ type: "text", text: "\n", style: inherited, link });
      continue;
    }
    if (node.tag === "img" && node.attributes.src) {
      tokens.push({
        type: "image",
        src: node.attributes.src,
        alt: node.attributes.alt,
        width: Number(node.attributes.width) || undefined,
        height: Number(node.attributes.height) || undefined,
      });
      continue;
    }
    const nextStyle = { ...inherited, ...styleFromNode(node, size) };
    const safeHref = node.tag === "a" && /^(?:https?:|mailto:|tel:)/i.test(node.attributes.href ?? "")
      ? node.attributes.href
      : link;
    tokens.push(...flattenInline(node.children, size, nextStyle, safeHref));
  }
  return tokens;
}

function RichImage({ token }: { token: Extract<InlineToken, { type: "image" }> }) {
  const initialRatio = token.width && token.height ? token.width / token.height : 16 / 9;
  const [aspectRatio, setAspectRatio] = useState(initialRatio);
  const imageStyle: StyleProp<ImageStyle> = [styles.image, { aspectRatio }];
  return (
    <Image
      source={{ uri: token.src }}
      style={imageStyle}
      resizeMode="contain"
      accessibilityLabel={token.alt || "Study image"}
      onLoad={(event) => {
        const { width, height } = event.nativeEvent.source;
        if (width && height) setAspectRatio(width / height);
      }}
    />
  );
}

function InlineContent({ tokens, baseStyle }: { tokens: InlineToken[]; baseStyle: StyleProp<TextStyle> }) {
  const groups: InlineToken[][] = [];
  for (const token of tokens) {
    const last = groups[groups.length - 1];
    if (!last || last[0].type !== token.type || token.type === "image") groups.push([token]);
    else last.push(token);
  }
  return (
    <>
      {groups.map((group, groupIndex) => group[0].type === "image" ? (
        <RichImage key={`image-${groupIndex}`} token={group[0] as Extract<InlineToken, { type: "image" }>} />
      ) : (
        <Text key={`text-${groupIndex}`} style={baseStyle}>
          {group.map((item, index) => {
            const token = item as Extract<InlineToken, { type: "text" }>;
            return (
              <Text
                key={index}
                style={[token.style, token.link ? styles.link : null]}
                onPress={token.link ? () => void Linking.openURL(token.link as string) : undefined}
              >
                {token.text}
              </Text>
            );
          })}
        </Text>
      ))}
    </>
  );
}

export function StudyRichContent({ html, colors, size, fontFamily }: Props) {
  const nodes = parseHtml(html);
  const baseText: TextStyle = { color: colors.text, fontSize: size(16), fontFamily, lineHeight: size(28) };

  const renderBlock = (node: RichNode, index: number): React.JSX.Element | null => {
    if (node.type === "text") {
      if (!node.text.trim()) return null;
      return <InlineContent key={index} tokens={flattenInline([node], size)} baseStyle={[styles.paragraph, baseText]} />;
    }

    if (node.tag === "hr") return <View key={index} style={[styles.rule, { backgroundColor: colors.border }]} />;
    if (node.tag === "img") {
      const token = flattenInline([node], size)[0];
      return token?.type === "image" ? <RichImage key={index} token={token} /> : null;
    }
    if (node.tag === "figure") {
      return <View key={index} style={styles.figure}>{node.children.map(renderBlock)}</View>;
    }
    if (node.tag === "ul" || node.tag === "ol") {
      const items = node.children.filter((child): child is ElementNode => child.type === "element" && child.tag === "li");
      return (
        <View key={index} style={styles.list}>
          {items.map((item, itemIndex) => (
            <View key={itemIndex} style={styles.listRow}>
              <Text style={[styles.bullet, baseText, { color: colors.mutedText }]}>{node.tag === "ol" ? `${itemIndex + 1}.` : "•"}</Text>
              <View style={styles.listBody}><InlineContent tokens={flattenInline(item.children, size)} baseStyle={[baseText, styles.listText]} /></View>
            </View>
          ))}
        </View>
      );
    }
    if (node.tag === "table") {
      const rows = node.children.flatMap((section) => section.type === "element" && ["tbody", "thead", "tfoot"].includes(section.tag) ? section.children : [section]);
      return (
        <View key={index} style={[styles.table, { borderColor: colors.border }]}>
          {rows.filter((row): row is ElementNode => row.type === "element" && row.tag === "tr").map((row, rowIndex) => (
            <View key={rowIndex} style={styles.tableRow}>
              {row.children.filter((cell): cell is ElementNode => cell.type === "element" && ["td", "th"].includes(cell.tag)).map((cell, cellIndex) => (
                <View key={cellIndex} style={[styles.tableCell, { borderColor: colors.border }]}>
                  <InlineContent tokens={flattenInline(cell.children, size)} baseStyle={[baseText, cell.tag === "th" ? styles.strong : null]} />
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    }

    const tagStyle: TextStyle = styleFromNode(node, size);
    let blockStyle: StyleProp<TextStyle> = [styles.paragraph, baseText, tagStyle];
    if (node.tag === "h1") blockStyle = [styles.h1, baseText, { fontSize: size(32) }, tagStyle];
    if (node.tag === "h2") blockStyle = [styles.h2, baseText, { fontSize: size(26) }, tagStyle];
    if (node.tag === "h3") blockStyle = [styles.h3, baseText, { fontSize: size(21) }, tagStyle];
    if (["h4", "h5", "h6"].includes(node.tag)) blockStyle = [styles.h4, baseText, tagStyle];
    if (node.tag === "blockquote") blockStyle = [styles.quote, baseText, { borderLeftColor: colors.border, color: colors.mutedText }, tagStyle];
    if (node.tag === "figcaption") blockStyle = [styles.caption, baseText, { color: colors.mutedText }, tagStyle];
    if (node.tag === "pre") blockStyle = [styles.pre, baseText, { backgroundColor: colors.card }, tagStyle];

    return <InlineContent key={index} tokens={flattenInline(node.children, size, tagStyle)} baseStyle={blockStyle} />;
  };

  const normalizedNodes: RichNode[] = [];
  let pendingInline: RichNode[] = [];
  const flushInline = () => {
    if (pendingInline.length) normalizedNodes.push({ type: "element", tag: "p", attributes: {}, children: pendingInline });
    pendingInline = [];
  };
  for (const node of nodes) {
    if (node.type === "element" && BLOCK_TAGS.has(node.tag)) {
      flushInline();
      normalizedNodes.push(node);
    } else {
      pendingInline.push(node);
    }
  }
  flushInline();

  return <View>{normalizedNodes.map(renderBlock)}</View>;
}

const styles = StyleSheet.create({
  paragraph: { marginBottom: 18 },
  h1: { fontWeight: "800", lineHeight: 39, marginTop: 20, marginBottom: 14 },
  h2: { fontWeight: "700", lineHeight: 34, marginTop: 28, marginBottom: 13 },
  h3: { fontWeight: "700", lineHeight: 28, marginTop: 22, marginBottom: 10 },
  h4: { fontWeight: "700", marginTop: 18, marginBottom: 8 },
  strong: { fontWeight: "700" },
  quote: { borderLeftWidth: 4, paddingLeft: 14, marginVertical: 14, fontStyle: "italic" },
  pre: { padding: 12, borderRadius: 8, fontFamily: "monospace" },
  caption: { textAlign: "center", fontSize: 13, marginTop: -8, marginBottom: 18 },
  link: { color: "#1155CC", textDecorationLine: "underline" },
  image: { width: "100%", maxHeight: 560, marginVertical: 16, borderRadius: 8 },
  figure: { marginBottom: 12 },
  rule: { height: 1, marginVertical: 24 },
  list: { marginBottom: 18, paddingLeft: 4 },
  listRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 7 },
  bullet: { width: 30, lineHeight: 28 },
  listBody: { flex: 1 },
  listText: { marginBottom: 0 },
  table: { borderWidth: 1, marginVertical: 16 },
  tableRow: { flexDirection: "row" },
  tableCell: { flex: 1, borderWidth: StyleSheet.hairlineWidth, padding: 8 },
});
