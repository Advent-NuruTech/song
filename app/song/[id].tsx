import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import PagerView from "react-native-pager-view";

import songsEn from "@/assets/languages/english.json";
import songsLuo from "@/assets/languages/luo.json";
import songsSw from "@/assets/languages/swahili.json";

type Song = {
  hymnNumber: number;
  language: string;
  title: string;
  stanzas: string[][];
  chorus: string[] | null;
};

export default function SongDetailsScreen() {
  const router = useRouter();
  const { id, lang } = useLocalSearchParams<{
    id: string;
    lang: "en" | "sw" | "luo";
  }>();

  const songsObject: Record<string, Song> =
    lang === "en"
      ? (songsEn as Record<string, Song>)
      : lang === "sw"
      ? (songsSw as Record<string, Song>)
      : (songsLuo as Record<string, Song>);

  const songList = Object.entries(songsObject)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => a.hymnNumber - b.hymnNumber);

  const currentIndex = songList.findIndex((s) => s.key === id);
  const song = songList[currentIndex];

  if (!song) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Song not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <PagerView
        style={styles.pager}
        initialPage={currentIndex}
        onPageSelected={() => {
          // NO router.replace here
          // NO URL change = NO blinking
        }}
      >
        {songList.map((item) => (
          <View key={item.key} style={styles.page}>
            <View style={styles.navRow}>
              <TouchableOpacity
                onPress={() => router.push(`/songs?lang=${lang}`)}
              >
                <Text style={styles.back}>← Back to songs</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.header}>
              <Text style={styles.hymnNumber}>{item.hymnNumber}</Text>
              <Text style={styles.title}>{item.title}</Text>
            </View>

            <ScrollView style={styles.lyrics}>
              {item.stanzas.map((stanza, stanzaIndex) => (
                <View key={stanzaIndex} style={styles.stanza}>
                  {stanza.map((line, lineIndex) => (
                    <Text key={lineIndex} style={styles.line}>
                      {line}
                    </Text>
                  ))}

                  {stanzaIndex === 0 && item.chorus && (
                    <View style={styles.chorus}>
                      <Text style={styles.chorusLabel}>Chorus</Text>
                      {item.chorus.map((line, i) => (
                        <Text key={i} style={styles.chorusLine}>
                          {line}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        ))}
      </PagerView>
    </>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  pager: {
    flex: 1,
    backgroundColor: "#fff",
  },
  page: {
    flex: 1,
    padding: 18,
    backgroundColor: "#fff",
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 14,
  },
  back: {
    color: "#2563eb",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  hymnNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
  },
  lyrics: {
    flex: 1,
  },
  stanza: {
    marginBottom: 24,
  },
  line: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
    textAlign: "center",
    marginBottom: 4,
  },
  chorus: {
    marginTop: 16,
    padding: 14,
    backgroundColor: "#F8F9FA",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chorusLabel: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    color: "#444",
  },
  chorusLine: {
    fontSize: 22,
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 4,
  },
  notFound: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 40,
  },
});
