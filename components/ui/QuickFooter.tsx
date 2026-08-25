import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/use-app-theme";

type MenuKind = "resources" | "profile" | null;

const RESOURCE_LINKS = [
  { label: "Bible", detail: "Read Scripture", icon: "book-outline" as const, path: "/bible" },
  { label: "Songs", detail: "Hymns and worship", icon: "musical-notes-outline" as const, path: "/categories" },
  { label: "Playlists", detail: "Your singing orders", icon: "list-circle-outline" as const, path: "/playlists" },
  { label: "Studies", detail: "Biblical research", icon: "library-outline" as const, path: "/studies" },
  { label: "Notes", detail: "Write and sync", icon: "document-text-outline" as const, path: "/notes" },
];

const PROFILE_LINKS = [
  { label: "Profile", detail: "Account and sign in", icon: "person-circle-outline" as const, path: "/account" },
  { label: "Settings", detail: "Theme, language and reading", icon: "settings-outline" as const, path: "/settings" },
  { label: "About", detail: "About Advent Pro", icon: "information-circle-outline" as const, path: "/about" },
];

export default function QuickFooter() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const [menu, setMenu] = useState<MenuKind>(null);

  const resourcesActive = ["/bible", "/categories", "/songs", "/song/", "/studies", "/notes", "/playlists"].some((path) => pathname.startsWith(path));
  const profileActive = ["/account", "/settings", "/about"].some((path) => pathname.startsWith(path));
  const links = menu === "resources" ? RESOURCE_LINKS : PROFILE_LINKS;

  const go = (path: string) => {
    setMenu(null);
    if (!pathname.startsWith(path) || path === "/") router.replace(path as never);
  };

  const Tab = ({ label, icon, active, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; active: boolean; onPress: () => void }) => (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={styles.tab}>
      <View style={[styles.tabIcon, active && { backgroundColor: `${colors.tint}14` }]}>
        <Ionicons name={active ? (icon.replace("-outline", "") as keyof typeof Ionicons.glyphMap) : icon} size={size(23)} color={active ? colors.tint : colors.mutedText} />
      </View>
      <Text numberOfLines={1} style={[styles.tabLabel, { color: active ? colors.tint : colors.mutedText, fontFamily, fontSize: size(10), fontWeight: active ? "800" : "600" }]}>{label}</Text>
    </Pressable>
  );

  return (
    <>
      <View style={[styles.footer, { minHeight: 62 + insets.bottom, paddingBottom: insets.bottom, backgroundColor: darkMode ? "#0B1220" : "#FFFFFF", borderTopColor: colors.border }]}>
        <Tab label="Home" icon="home-outline" active={pathname === "/"} onPress={() => go("/")} />
        <Tab label="Resources" icon="grid-outline" active={resourcesActive} onPress={() => setMenu("resources")} />
        <Tab label="Media" icon="play-circle-outline" active={pathname.startsWith("/media")} onPress={() => go("/media")} />
        <Tab label="Profile" icon="person-circle-outline" active={profileActive} onPress={() => setMenu("profile")} />
      </View>

      <Modal visible={menu !== null} transparent animationType="fade" onRequestClose={() => setMenu(null)}>
        <Pressable style={styles.backdrop} onPress={() => setMenu(null)}>
          <Pressable onPress={(event) => event.stopPropagation()} style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14), backgroundColor: darkMode ? "#111827" : "#FFFFFF", borderColor: colors.border }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.text, fontFamily }]}>{menu === "resources" ? "Resources" : "Profile"}</Text>
            {links.map((item) => (
              <Pressable key={item.path} accessibilityRole="button" onPress={() => go(item.path)} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
                <View style={[styles.menuIcon, { backgroundColor: `${colors.tint}16` }]}><Ionicons name={item.icon} size={22} color={colors.tint} /></View>
                <View style={styles.menuCopy}>
                  <Text style={[styles.menuLabel, { color: colors.text, fontFamily }]}>{item.label}</Text>
                  <Text style={[styles.menuDetail, { color: colors.mutedText, fontFamily }]}>{item.detail}</Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color={colors.mutedText} />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 999, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 6, ...Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.07, shadowRadius: 9 }, android: { elevation: 12 } }) },
  tab: { flex: 1, minHeight: 61, alignItems: "center", justifyContent: "center", paddingTop: 5 },
  tabIcon: { minWidth: 48, height: 30, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  tabLabel: { marginTop: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(2,6,23,.48)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, paddingHorizontal: 18, paddingTop: 9 },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 13 },
  sheetTitle: { fontSize: 20, fontWeight: "900", marginBottom: 8 },
  menuRow: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 13, borderRadius: 15, paddingHorizontal: 8 },
  menuIcon: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  menuCopy: { flex: 1 }, menuLabel: { fontSize: 15, fontWeight: "800" }, menuDetail: { fontSize: 11, marginTop: 2 }, pressed: { opacity: 0.65 },
});
