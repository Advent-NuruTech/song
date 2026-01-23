import { Link, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";

import songsEn from "@/assets/languages/english.json";
import songsLuo from "@/assets/languages/luo.json";
import songsSw from "@/assets/languages/swahili.json";

type Song = {
  key: string;
  hymnNumber: number;
  language: string;
  title: string;
  stanzas: string[][];
  chorus: string[] | null;
};

export default function SongsScreen() {
  const { lang } = useLocalSearchParams<{ lang: string }>();
  const [query, setQuery] = useState("");

  const songsObject =
    lang === "en"
      ? songsEn
      : lang === "sw"
      ? songsSw
      : songsLuo;

  /** Convert → sort → filter */
  const songs = useMemo(() => {
    return Object.entries(songsObject)
      .map(([key, value]: any) => ({
        key,
        ...value,
      }))
      .sort((a, b) => a.hymnNumber - b.hymnNumber)
      .filter((song) => {
        if (!query.trim()) return true;

        const q = query.toLowerCase();
        const lyrics = song.stanzas.flat().join(" ").toLowerCase();

        return (
          song.title.toLowerCase().includes(q) ||
          song.hymnNumber.toString().includes(q) ||
          lyrics.includes(q)
        );
      });
  }, [songsObject, query]);

  // Different placeholder text based on language
  const placeholder =
    lang === "sw"
      ? "Tafuta namba, kichwa, au mistari…"
      : lang === "luo"
      ? "Many gi namba , kata wiye malo, kata weche mingeyo e werno…"
      : "Search number, title, or lyrics…";

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <TextInput
        placeholder={placeholder}
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />

      <FlatList
        data={songs}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Link
            href={{
              pathname: "/song/[id]",
              params: { id: item.key, lang },
            }}
            style={styles.songItem}
          >
            <Text style={styles.number}>{item.hymnNumber}.</Text>
            <Text style={styles.title}>{item.title}</Text>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },

  search: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    marginTop: 36,
    marginBottom: 16,
  },

  songItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  number: {
    fontSize: 18,
    fontWeight: "600",
    width: 50,
    color: "#555",
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
});
