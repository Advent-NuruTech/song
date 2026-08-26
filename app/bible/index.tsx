import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import {
  type BibleBook,
  type BibleVersionRow,
  getBooks,
  getSelectedVersionId,
  installBibleVersion,
  listBibleVersions,
  setSelectedVersionId,
} from "@/src/services/bibleService";

export default function BibleHome() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const router = useRouter();

  const [versions, setVersions] = useState<BibleVersionRow[]>([]);
  const [selected, setSelected] = useState<BibleVersionRow | null>(null);
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);

  const loadFor = useCallback(async (version: BibleVersionRow | null) => {
    if (!version) {
      setBooks([]);
      return;
    }
    if (version.installed) {
      setBooks(await getBooks(version.id));
    } else {
      setBooks([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    const list = await listBibleVersions();
    setVersions(list);
    if (!list.length) {
      setSelected(null);
      setLoading(false);
      return;
    }
    const savedId = await getSelectedVersionId();
    const current =
      list.find((v) => v.id === savedId) ??
      list.find((v) => v.installed) ??
      list[0];
    setSelected(current);
    await loadFor(current);
    setLoading(false);
  }, [loadFor]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      refresh().catch((e) => {
        if (active) {
          console.warn("Bible load failed:", e);
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }, [refresh])
  );

  const pickVersion = useCallback(
    async (version: BibleVersionRow) => {
      setSelected(version);
      await setSelectedVersionId(version.id);
      await loadFor(version);
    },
    [loadFor]
  );

  const handleInstall = useCallback(async () => {
    if (!selected || installing) return;
    setInstalling(true);
    setProgress(0);
    try {
      const ok = await installBibleVersion(selected.id, (done, total) => {
        setProgress(total ? done / total : 0);
      });
      if (ok) {
        const updated = (await listBibleVersions()).find(
          (v) => v.id === selected.id
        );
        if (updated) {
          setSelected(updated);
          setVersions((prev) =>
            prev.map((v) => (v.id === updated.id ? updated : v))
          );
          await loadFor(updated);
        }
      }
    } catch (e) {
      console.warn("Install failed:", e);
    } finally {
      setInstalling(false);
    }
  }, [selected, installing, loadFor]);

  const openBook = useCallback(
    (book: BibleBook) => {
      if (!selected) return;
      router.push({
        pathname: "/bible/chapters",
        params: { version: selected.id, book: book.book },
      });
    },
    [router, selected]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: size(28), fontFamily }]}>
          Holy Bible
        </Text>
        <Text style={[styles.headerSub, { color: colors.mutedText, fontSize: size(14), fontFamily }]}>
          {selected ? selected.name : "No versions available"}
        </Text>

        {/* Version chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {versions.map((v) => {
            const active = selected?.id === v.id;
            return (
              <Pressable
                key={v.id}
                onPress={() => pickVersion(v)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : "transparent",
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? colors.onPrimary : colors.text, fontFamily, fontSize: size(13) },
                  ]}
                >
                  {v.abbreviation || v.name}
                </Text>
                {!v.installed && (
                  <Ionicons
                    name="cloud-download-outline"
                    size={size(13)}
                    color={active ? colors.onPrimary : colors.mutedText}
                    style={{ marginLeft: 5 }}
                  />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : !selected ? (
        <View style={styles.center}>
          <Text style={[styles.muted, { color: colors.mutedText, fontFamily, fontSize: size(15) }]}>
            No Bible versions found.
          </Text>
        </View>
      ) : !selected.installed ? (
        <View style={styles.center}>
          <Ionicons name="book-outline" size={48} color={colors.tint} />
          <Text style={[styles.installTitle, { color: colors.text, fontFamily, fontSize: size(18) }]}>
            {selected.name}
          </Text>
          <Text style={[styles.muted, { color: colors.mutedText, fontFamily, fontSize: size(14) }]}>
            {selected.source === "remote"
              ? "Download this version to read offline."
              : "Install this version to start reading."}
          </Text>

          {installing ? (
            <View style={styles.progressWrap}>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: colors.primary, width: `${Math.round(progress * 100)}%` },
                  ]}
                />
              </View>
              <Text style={[styles.muted, { color: colors.mutedText, fontFamily, fontSize: size(13) }]}>
                Installing… {Math.round(progress * 100)}%
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={handleInstall}
              style={[styles.installBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="download-outline" size={18} color={colors.onPrimary} />
              <Text style={[styles.installBtnText, { color: colors.onPrimary, fontFamily, fontSize: size(15) }]}>
                {selected.source === "remote" ? "Download" : "Install"}
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => item.book}
          numColumns={2}
          columnWrapperStyle={styles.bookRow}
          contentContainerStyle={styles.bookList}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openBook(item)}
              style={[styles.bookCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text
                numberOfLines={1}
                style={[styles.bookName, { color: colors.text, fontFamily, fontSize: size(15) }]}
              >
                {item.book}
              </Text>
              <Text style={[styles.bookMeta, { color: colors.mutedText, fontFamily, fontSize: size(12) }]}>
                {item.chapterCount} ch.
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
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontWeight: "800" },
  headerSub: { marginTop: 2, fontWeight: "500" },
  chips: { gap: 8, paddingTop: 14, paddingRight: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: { fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 12 },
  muted: { textAlign: "center", lineHeight: 20 },
  installTitle: { fontWeight: "800", marginTop: 4 },
  installBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  installBtnText: { fontWeight: "700" },
  progressWrap: { width: "80%", alignItems: "center", gap: 8, marginTop: 8 },
  progressTrack: { width: "100%", height: 8, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 999 },
  bookList: { padding: 16, paddingBottom: 120 },
  bookRow: { gap: 12 },
  bookCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  bookName: { fontWeight: "700" },
  bookMeta: { marginTop: 4 },
});
