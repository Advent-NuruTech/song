import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useAdminMode } from "@/src/admin/adminAccess";
import { chooseAboutGalleryImages, chooseAboutPrimaryImage, getAboutPageContent, saveAboutPageContent, type AboutGalleryImage } from "@/src/services/aboutPageService";

export default function AboutManager() {
  const { colors, size, fontFamily } = useAppTheme();
  const { enabled, loading, refresh } = useAdminMode();
  const [story, setStory] = useState("");
  const [primaryImageUri, setPrimaryImageUri] = useState<string | null>(null);
  const [gallery, setGallery] = useState<AboutGalleryImage[]>([]);
  const [busy, setBusy] = useState<"load" | "images" | "save" | null>("load");

  const load = useCallback(async () => {
    setBusy("load");
    try {
      const page = await getAboutPageContent();
      setStory(page.story); setPrimaryImageUri(page.primaryImageUri); setGallery(page.gallery);
    } catch (error) {
      Alert.alert("Couldn’t load About page", (error as Error).message);
    } finally { setBusy(null); }
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); void load(); }, [load, refresh]));

  const addImages = async () => {
    setBusy("images");
    try {
      const additions = await chooseAboutGalleryImages();
      setGallery((current) => [...current, ...additions]);
    } catch (error) {
      Alert.alert("Couldn’t add images", (error as Error).message);
    } finally { setBusy(null); }
  };

  const changeMainImage = async () => {
    setBusy("images");
    try {
      const image = await chooseAboutPrimaryImage();
      if (!image) return;
      setPrimaryImageUri(image.uri);
    } catch (error) {
      Alert.alert("Couldn’t change main image", (error as Error).message);
    } finally { setBusy(null); }
  };

  const restoreDefaultImage = () => {
    if (!primaryImageUri) return;
    Alert.alert("Restore default image", "Use the bundled Byron Onyango image again?", [
      { text: "Cancel", style: "cancel" },
      { text: "Restore", onPress: () => setPrimaryImageUri(null) },
    ]);
  };

  const removeImage = (image: AboutGalleryImage) => {
    Alert.alert("Remove image", "Remove this image from the offline About gallery?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => setGallery((current) => current.filter((item) => item.id !== image.id)) },
    ]);
  };

  const save = async () => {
    setBusy("save");
    try {
      await saveAboutPageContent({ story, primaryImageUri, gallery });
      Alert.alert("About page saved", "Your story and gallery are available offline on this device.");
      router.back();
    } catch (error) {
      Alert.alert("Couldn’t save About page", (error as Error).message);
    } finally { setBusy(null); }
  };

  if (loading || busy === "load") return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.tint} /></View>;
  if (!enabled) return <View style={[styles.center, { backgroundColor: colors.background }]}><Ionicons name="lock-closed-outline" size={size(34)} color={colors.mutedText} /><Text style={[styles.locked, { color: colors.text, fontFamily }]}>Admin Mode is required.</Text><Pressable onPress={() => router.replace("/(tabs)/about")}><Text style={{ color: colors.tint, fontFamily }}>Back to About</Text></Pressable></View>;

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}><Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={size(22)} color={colors.text} /></Pressable><View><Text style={[styles.title, { color: colors.text, fontSize: size(19), fontFamily }]}>Edit About Page</Text><Text style={[styles.subtitle, { color: colors.mutedText, fontFamily }]}>Saved locally for offline use</Text></View></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.label, { color: colors.text, fontFamily }]}>The Story Behind Advent Pro</Text>
      <Text style={[styles.help, { color: colors.mutedText, fontFamily }]}>Separate paragraphs with a blank line. These edits stay on this device and work offline.</Text>
      <TextInput value={story} onChangeText={setStory} multiline textAlignVertical="top" style={[styles.storyInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, fontFamily }]} placeholder="Write the Advent Pro story" placeholderTextColor={colors.subtleText} />

      <View style={styles.galleryHeader}><View><Text style={[styles.label, { color: colors.text, fontFamily }]}>Main image and photo gallery</Text><Text style={[styles.help, { color: colors.mutedText, fontFamily }]}>The supplied Byron Onyango image is the default. Replace it or restore it at any time, then add as many more photos as needed.</Text></View><View style={styles.imageActions}><Pressable disabled={busy !== null} onPress={() => void changeMainImage()} style={[styles.addButton, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}>{busy === "images" ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Ionicons name="image-outline" size={size(18)} color={colors.onPrimary} />}<Text style={[styles.addButtonText, { color: colors.onPrimary, fontFamily }]}>Change main image</Text></Pressable>{primaryImageUri ? <Pressable disabled={busy !== null} onPress={restoreDefaultImage} style={[styles.restoreButton, { borderColor: colors.border }]}><Text style={[styles.restoreText, { color: colors.text, fontFamily }]}>Use default</Text></Pressable> : null}<Pressable disabled={busy !== null} onPress={() => void addImages()} style={[styles.addButton, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}><Ionicons name="images-outline" size={size(18)} color={colors.onPrimary} /><Text style={[styles.addButtonText, { color: colors.onPrimary, fontFamily }]}>Add images</Text></Pressable></View></View>
      {gallery.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>{gallery.map((image) => <View key={image.id} style={[styles.imageTile, { backgroundColor: colors.card, borderColor: colors.border }]}><Image source={{ uri: image.uri }} resizeMode="contain" style={styles.image} /><Pressable onPress={() => removeImage(image)} style={styles.remove}><Ionicons name="close" size={18} color="#fff" /></Pressable></View>)}</ScrollView> : <View style={[styles.empty, { borderColor: colors.border }]}><Text style={[styles.help, { color: colors.mutedText, fontFamily }]}>No extra photos yet.</Text></View>}
      <Pressable disabled={busy !== null} onPress={() => void save()} style={[styles.saveButton, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}>{busy === "save" ? <ActivityIndicator color={colors.onPrimary} /> : <><Ionicons name="checkmark-circle-outline" size={size(20)} color={colors.onPrimary} /><Text style={[styles.saveText, { color: colors.onPrimary, fontFamily }]}>Save offline About page</Text></>}</Pressable>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }, locked: { fontSize: 17, fontWeight: "800" }, header: { minHeight: 66, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }, back: { width: 42, height: 42, alignItems: "center", justifyContent: "center" }, title: { fontWeight: "900" }, subtitle: { fontSize: 11, marginTop: 3 }, content: { padding: 18, paddingBottom: 42 }, label: { fontSize: 16, fontWeight: "900", marginBottom: 6 }, help: { fontSize: 12, lineHeight: 18 }, storyInput: { minHeight: 360, borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15, lineHeight: 23, marginTop: 10 }, galleryHeader: { marginTop: 24, gap: 12 }, imageActions: { gap: 9 }, addButton: { minHeight: 44, alignSelf: "flex-start", borderRadius: 11, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 7 }, addButtonText: { fontWeight: "900", fontSize: 13 }, restoreButton: { alignSelf: "flex-start", minHeight: 40, justifyContent: "center", paddingHorizontal: 13, borderRadius: 10, borderWidth: 1 }, restoreText: { fontWeight: "800", fontSize: 13 }, gallery: { paddingTop: 14, gap: 12 }, imageTile: { height: 195, width: 150, borderWidth: 1, borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center" }, image: { width: "100%", height: "100%" }, remove: { position: "absolute", top: 7, right: 7, width: 30, height: 30, borderRadius: 15, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center" }, empty: { borderWidth: 1, borderStyle: "dashed", borderRadius: 12, padding: 16, marginTop: 14 }, saveButton: { minHeight: 52, borderRadius: 14, marginTop: 28, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, saveText: { fontWeight: "900" },
});
