import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";

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

type SongWithKey = Song & {
  key: string;
  lang: "en" | "sw" | "luo";
};

function highlight(text: string, query: string) {
  if (!query) return text;

  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <Text key={i} style={styles.highlight}>
        {part}
      </Text>
    ) : (
      <Text key={i}>{part}</Text>
    )
  );
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");

  const allSongs: SongWithKey[] = useMemo(() => {
    const toArray = (obj: Record<string, Song>, lang: SongWithKey["lang"]) =>
      Object.entries(obj).map(([key, value]) => ({
        ...value,
        key,
        lang,
      }));

    return [
      ...toArray(songsEn as Record<string, Song>, "en"),
      ...toArray(songsSw as Record<string, Song>, "sw"),
      ...toArray(songsLuo as Record<string, Song>, "luo"),
    ];
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return allSongs.filter((song) => {
      const lyricsText = song.stanzas.flat().join(" ");
      return (
        song.title.toLowerCase().includes(q) ||
        song.hymnNumber.toString().includes(q) ||
        lyricsText.toLowerCase().includes(q)
      );
    });
  }, [query, allSongs]);

  return (
    <View style={styles.container}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="global search across all languages..."
        style={styles.input}
      />

      <FlatList
        data={results}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <Link
            href={{
              pathname: "/song/[id]",
              params: { id: item.key, lang: item.lang },
            }}
            style={styles.songItem}
          >
            <Text style={styles.title}>{highlight(item.title, query)}</Text>
            <Text style={styles.number}>
              {highlight(`#${item.hymnNumber}`, query)}
            </Text>
            <Text style={styles.lyrics}>
              {highlight(item.stanzas.flat().join(" "), query)}
            </Text>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 26 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 12,
     marginTop: 38,
    marginBottom: 16,
  },
  songItem: { padding: 16, borderBottomWidth: 1, borderColor: "#ddd" },
  title: { fontSize: 18, fontWeight: "bold" },
  number: { color: "#555" },
  lyrics: { marginTop: 8, color: "#333" },
  highlight: { backgroundColor: "yellow" },
});
