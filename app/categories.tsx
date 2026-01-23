import { Link } from "expo-router";
import {
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { languages } from "./config/languages";
import { getSongCount } from "./utils/songLoader";

export default function CategoriesScreen() {
  const renderLanguageItem = ({ item }: any) => {
    const count = getSongCount(item.code);

    return (
      <Link
        href={{
          pathname: "/songs",
          params: { lang: item.code },
        }}
        asChild
      >
        {/* PRESSABLE is required for Link to work */}
        <Pressable style={styles.card}>
          <View
            style={[
              styles.labelContainer,
              { backgroundColor: `${item.color}20` },
            ]}
          >
            <Text style={[styles.labelText, { color: item.color }]}>
              {item.iconText}
            </Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{item.name}</Text>

              {item.enabled && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{count}</Text>
                </View>
              )}
            </View>

            <Text style={styles.description}>{item.description}</Text>
          </View>

          <View style={styles.arrowContainer}>
            <Text style={styles.arrowText}>›</Text>
          </View>
        </Pressable>
      </Link>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <FlatList
        data={languages}
        keyExtractor={(item) => item.code}
        renderItem={renderLanguageItem}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <Text style={styles.header}>Languages</Text>
            <Text style={styles.subHeader}>
              Select a language to explore songs
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              More languages are coming. Stay tuned!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 24,
  },
  header: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  subHeader: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 6,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  labelContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  labelText: {
    fontSize: 16,
    fontWeight: "800",
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  badge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3B82F6",
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 20,
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  arrowText: {
    fontSize: 22,
    color: "#9CA3AF",
    fontWeight: "700",
    lineHeight: 22,
  },
  footer: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  footerText: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
  },
});
