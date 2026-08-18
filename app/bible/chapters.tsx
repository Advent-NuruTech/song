import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ChevronLeft } from "lucide-react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { getBooks } from "@/src/services/bibleService";

export default function ChapterPicker() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const router = useRouter();
  const { version, book } = useLocalSearchParams<{ version: string; book: string }>();

  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!version || !book) return;
      const books = await getBooks(String(version));
      if (!active) return;
      const match = books.find((b) => b.book === book);
      setCount(match?.chapterCount ?? 0);
    })();
    return () => {
      active = false;
    };
  }, [version, book]);

  const open = useCallback(
    (chapter: number) => {
      router.push({
        pathname: "/bible/read",
        params: { version: String(version), book: String(book), chapter: String(chapter) },
      });
    },
    [router, version, book]
  );

  const chapters = count ? Array.from({ length: count }, (_, i) => i + 1) : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: size(22), fontFamily }]}>
          {book}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {count === null ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={chapters}
          keyExtractor={(n) => String(n)}
          numColumns={5}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => open(item)}
              style={[styles.cell, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.cellText, { color: colors.text, fontFamily, fontSize: size(16) }]}>
                {item}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontWeight: "800", flex: 1, textAlign: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  grid: { padding: 16, paddingBottom: 120 },
  row: { gap: 10 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    maxWidth: "18.5%",
  },
  cellText: { fontWeight: "700" },
});
