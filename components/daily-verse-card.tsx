import { useEffect, useState } from "react";
import {
  ImageBackground,
  type ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { DailyVerseTemplate } from "@/src/services/dailyVerseTemplateService";
import { FALLBACK_DAILY_VERSE_TEMPLATE } from "@/src/services/dailyVerseTemplateService";

type DailyVerseCardProps = {
  reference: string;
  text: string;
  template?: DailyVerseTemplate;
};

function verseFontSize(length: number) {
  if (length <= 55) return 27;
  if (length <= 95) return 23;
  if (length <= 145) return 19;
  return 16;
}

/** The exact square artwork used both on Home and in the captured share image. */
export function DailyVerseCard({ reference, text, template }: DailyVerseCardProps) {
  const preferred = template?.imageSource ?? FALLBACK_DAILY_VERSE_TEMPLATE.imageSource;
  const [source, setSource] = useState<ImageSourcePropType>(preferred);
  const fontSize = verseFontSize(text.length);

  useEffect(() => setSource(preferred), [preferred]);

  return (
    <View style={styles.card} collapsable={false}>
      <ImageBackground
        source={source}
        resizeMode="cover"
        style={styles.background}
        imageStyle={styles.image}
        onError={() => setSource(FALLBACK_DAILY_VERSE_TEMPLATE.imageSource)}
      >
        <View style={styles.versePanel}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={8}
            style={[styles.verse, { fontSize, lineHeight: fontSize * 1.35 }]}
          >
            “{text.trim()}”
          </Text>
        </View>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.reference}>
          {reference}
        </Text>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    aspectRatio: 1,
    overflow: "hidden",
    backgroundColor: "#03245D",
  },
  background: { flex: 1 },
  image: { width: "100%", height: "100%" },
  versePanel: {
    position: "absolute",
    left: "9.5%",
    right: "9.5%",
    top: "31%",
    height: "48%",
    alignItems: "center",
    justifyContent: "center",
  },
  verse: {
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: -0.45,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.22)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  reference: {
    position: "absolute",
    left: "6%",
    right: "53%",
    bottom: "7.3%",
    color: "#A9DFFF",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.25,
  },
});
