import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import Constants from "expo-constants";
import { Link, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useDonationReturnState } from "@/hooks/useDonationReturnState";
import { ADMIN_MODE_TAP_TARGET, getRemainingAdminTaps, isAdminModeEnabled, setAdminModeEnabled } from "@/src/admin/adminAccess";
import { DEFAULT_ABOUT_STORY, getAboutPageContent, type AboutPageContent } from "@/src/services/aboutPageService";

const APP_VERSION = "2.0.0";
const DOWNLOAD_URL = "https://play.google.com/store/apps/details?id=com.adventpro";
const BUNDLED_BYRON_IMAGE = "bundled-byron";
const STORY_HEADINGS = new Set(["Why Advent Pro Exists", "About Offline Access", "About the Monthly Support Request", "This Mission Needs More Than Money", "An Invitation to Preachers, Writers, Developers and Content Creators", "The Hope Behind It All"]);

export default function AboutScreen() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const { openSupport } = useDonationReturnState();
  const [content, setContent] = useState<AboutPageContent>({ story: DEFAULT_ABOUT_STORY, primaryImageUri: null, gallery: [] });
  const [adminEnabled, setAdminEnabled] = useState(false);
  const [versionTapCount, setVersionTapCount] = useState(0);
  const appVersion = Constants.expoConfig?.version || Constants.manifest?.version || APP_VERSION;

  const load = useCallback(async () => {
    const [nextContent, enabled] = await Promise.all([getAboutPageContent(), isAdminModeEnabled()]);
    setContent(nextContent); setAdminEnabled(enabled);
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => { void load(); }, [load]);

  const shareApp = async () => {
    try { await Share.share({ title: "Advent Pro", message: `Discover Present Truth resources, studies, songs, and hymns in Advent Pro.\n\nDownload: ${DOWNLOAD_URL}` }); }
    catch (error) { console.warn("Unable to share Advent Pro", error); }
  };

  const handleVersionTap = () => {
    if (adminEnabled) return router.push("/admin/AdminDashboard");
    const nextCount = versionTapCount + 1;
    if (nextCount < ADMIN_MODE_TAP_TARGET) {
      setVersionTapCount(nextCount);
      if (getRemainingAdminTaps(nextCount) <= 2) Alert.alert("Admin Mode", `${getRemainingAdminTaps(nextCount)} more tap(s) to enable admin mode.`);
      return;
    }
    void (async () => {
      await setAdminModeEnabled(true);
      setAdminEnabled(true); setVersionTapCount(0);
      Alert.alert("Admin Mode Enabled", "You can now manage offline app content, including this About page.");
    })();
  };

  const paragraphs = content.story.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const gallery = [{ id: content.primaryImageUri ? "primary-image" : BUNDLED_BYRON_IMAGE, uri: content.primaryImageUri ?? "" }, ...content.gallery];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { backgroundColor: darkMode ? "#123C7A" : "#0B4AA6" }]}>
        <Ionicons name="book-outline" size={size(34)} color="rgba(255,255,255,0.88)" />
        <Text style={[styles.appName, { fontFamily, fontSize: size(29) }]}>Advent Pro</Text>
        <Text style={[styles.byline, { fontFamily, fontSize: size(14) }]}>Built by Byron Onyango</Text>
        <Text style={[styles.heroCopy, { fontFamily, fontSize: size(13) }]}>A focused home for Present Truth resources.</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery}>
          {gallery.map((image) => <View key={image.id} style={[styles.imageFrame, { borderColor: colors.border, backgroundColor: darkMode ? "#111827" : "#F8FAFC" }]}>
            <Image source={image.id === BUNDLED_BYRON_IMAGE ? require("@/assets/images/byron-onyango.png") : { uri: image.uri }} style={styles.profileImage} resizeMode="contain" accessibilityLabel="Byron Onyango and Advent Pro gallery" />
          </View>)}
        </ScrollView>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardTitleRow}><Ionicons name="sparkles-outline" size={size(23)} color={colors.tint} /><Text style={[styles.cardTitle, { color: colors.text, fontSize: size(19), fontFamily }]}>The Story Behind Advent Pro</Text></View>
        {paragraphs.map((paragraph, index) => STORY_HEADINGS.has(paragraph)
          ? <Text key={`${paragraph}-${index}`} style={[styles.storyHeading, { color: colors.text, fontSize: size(17), fontFamily }]}>{paragraph}</Text>
          : <Text key={`${paragraph.slice(0, 24)}-${index}`} style={[styles.storyText, { color: colors.text, fontSize: size(15), fontFamily }]}>{paragraph}</Text>)}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardTitleRow}><Ionicons name="heart-outline" size={size(23)} color="#DC2626" /><Text style={[styles.cardTitle, { color: colors.text, fontSize: size(19), fontFamily }]}>Support the Work</Text></View>
        <Text style={[styles.storyText, { color: colors.text, fontSize: size(15), fontFamily }]}>Support is voluntary. It never locks resources or creates a subscription.</Text>
        <Pressable onPress={() => void openSupport()} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Ionicons name="heart" size={size(18)} color={colors.onPrimary} /><Text style={[styles.primaryButtonText, { color: colors.onPrimary, fontFamily }]}>Support Advent Pro</Text></Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardTitleRow}><Ionicons name="share-social-outline" size={size(23)} color={colors.tint} /><Text style={[styles.cardTitle, { color: colors.text, fontSize: size(19), fontFamily }]}>Share Advent Pro</Text></View>
        <Text style={[styles.storyText, { color: colors.text, fontSize: size(15), fontFamily }]}>Help another sincere seeker find a place to begin.</Text>
        <Pressable onPress={() => void shareApp()} style={[styles.secondaryButton, { borderColor: colors.tint }]}><Ionicons name="share-outline" size={size(18)} color={colors.tint} /><Text style={[styles.secondaryButtonText, { color: colors.tint, fontFamily }]}>Share App</Text></Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardTitleRow}><Ionicons name="document-text-outline" size={size(23)} color={colors.tint} /><Text style={[styles.cardTitle, { color: colors.text, fontSize: size(19), fontFamily }]}>Your Privacy</Text></View>
        <View style={styles.legalLinks}>
          <Link href="/privacy" asChild><Pressable style={[styles.legalLink, { borderColor: colors.border }]}><Text style={[styles.legalText, { color: colors.tint, fontFamily }]}>Privacy Policy</Text></Pressable></Link>
          <Link href="/terms" asChild><Pressable style={[styles.legalLink, { borderColor: colors.border }]}><Text style={[styles.legalText, { color: colors.tint, fontFamily }]}>Terms of Use</Text></Pressable></Link>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable onPress={handleVersionTap} style={styles.versionTapArea}><Text style={[styles.versionText, { color: colors.mutedText, fontSize: size(13), fontFamily }]}>Version {appVersion}</Text></Pressable>
        {!adminEnabled && versionTapCount > 0 ? <Text style={[styles.hint, { color: colors.mutedText, fontFamily }]}>{getRemainingAdminTaps(versionTapCount)} tap(s) away from admin mode</Text> : null}
        {adminEnabled ? <Pressable onPress={() => router.push("/admin/AboutManager" as never)} style={[styles.adminButton, { backgroundColor: colors.primary }]}><Ionicons name="create-outline" size={size(16)} color={colors.onPrimary} /><Text style={[styles.adminButtonText, { color: colors.onPrimary, fontFamily }]}>Edit this offline page</Text></Pressable> : null}
        <Text style={[styles.copyright, { color: colors.mutedText, fontSize: size(12), fontFamily }]}>© {new Date().getFullYear()} Byron Onyango. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 20, paddingBottom: 60 }, hero: { borderRadius: 24, padding: 28, alignItems: "center", marginTop: 26, marginBottom: 18 }, appName: { color: "#fff", fontWeight: "900", marginTop: 8 }, byline: { color: "#E0EDFF", marginTop: 7, fontWeight: "800" }, heroCopy: { color: "#DBEAFE", marginTop: 5, textAlign: "center" },
  card: { borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 16 }, cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 12 }, cardTitle: { fontWeight: "900", flex: 1 }, cardIntro: { lineHeight: 19, marginBottom: 12 }, gallery: { gap: 12, paddingRight: 4 }, imageFrame: { width: 220, height: 300, borderWidth: 1, borderRadius: 15, overflow: "hidden", alignItems: "center", justifyContent: "center" }, profileImage: { width: "100%", height: "100%" },
  storyHeading: { fontWeight: "900", lineHeight: 24, marginTop: 16, marginBottom: 4 }, storyText: { lineHeight: 24, marginBottom: 11 }, primaryButton: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 6 }, primaryButtonText: { fontWeight: "900" }, secondaryButton: { minHeight: 48, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 6 }, secondaryButtonText: { fontWeight: "900" },
  legalLinks: { gap: 10 }, legalLink: { minHeight: 46, borderWidth: 1, borderRadius: 12, justifyContent: "center", paddingHorizontal: 14 }, legalText: { fontWeight: "800" }, footer: { alignItems: "center", paddingVertical: 6 }, versionTapArea: { padding: 8 }, versionText: { fontWeight: "700" }, hint: { fontSize: 12, marginTop: 3 }, adminButton: { flexDirection: "row", gap: 7, alignItems: "center", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginTop: 10 }, adminButtonText: { fontWeight: "900", fontSize: 13 }, copyright: { textAlign: "center", marginTop: 12 },
});
