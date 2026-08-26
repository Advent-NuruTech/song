import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useAdminMode } from "@/src/admin/adminAccess";
import {
  getCategoryNames,
  getStudiesCategories,
  getStudyForEdit,
  upsertStudy,
} from "@/src/services/adminService";

export default function EditStudy() {
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  const isCreate = mode === "create" || !id;

  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const { enabled, loading } = useAdminMode();

  const [studyId, setStudyId] = useState("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [screenLoading, setScreenLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const screenTitle = useMemo(
    () => (isCreate ? "Add Study" : "Edit Study"),
    [isCreate]
  );

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [categoryRows, studiesCategories] = await Promise.all([
          getCategoryNames(),
          getStudiesCategories(),
        ]);

        if (!active) return;

        const merged = Array.from(new Set([...categoryRows, ...studiesCategories])).sort(
          (a, b) => a.localeCompare(b)
        );

        setCategories(merged);
        if (isCreate && !category && merged.length > 0) {
          setCategory(merged[0]);
        }
      } catch (error) {
        console.error("Failed loading categories for study editor:", error);
      }
    })();

    return () => {
      active = false;
    };
  }, [isCreate, category]);

  useEffect(() => {
    let active = true;

    if (isCreate || !id) {
      return () => {
        active = false;
      };
    }

    setScreenLoading(true);
    void (async () => {
      try {
        const study = await getStudyForEdit(id);
        if (!study || !active) return;

        setStudyId(study.id);
        setCategory(study.category ?? "");
        setTitle(study.title ?? "");
        setSubtitle(study.subtitle ?? "");
        setAuthor(study.author ?? "");
        setContent(study.content ?? "");
        setIsFeatured(study.isFeatured === 1);
      } catch (error) {
        Alert.alert("Load failed", (error as Error)?.message || "Failed to load study.");
      } finally {
        if (active) setScreenLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id, isCreate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertStudy(
        {
          id: studyId,
          category,
          title,
          subtitle,
          content,
          author,
          isFeatured,
        },
        isCreate ? undefined : id
      );

      Alert.alert("Saved", "Study has been saved successfully.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      const message = (error as Error)?.message || "Could not save study.";
      if (message.includes("UNIQUE constraint failed")) {
        Alert.alert("Save failed", "A study with this ID already exists.");
      } else {
        Alert.alert("Save failed", message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || screenLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!enabled) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.lockedText, { color: colors.text, fontSize: size(16), fontFamily }]}>
          Admin mode is disabled.
        </Text>
        <Pressable
          onPress={() => router.replace("/(tabs)/about")}
          style={[styles.simpleButton, { backgroundColor: colors.tint }]}
        >
          <Text
            style={[
              styles.simpleButtonText,
              { color: "#FFFFFF", fontSize: size(14), fontFamily },
            ]}
          >
            Go to About
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border, backgroundColor: colors.card },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={size(22)} color={colors.text} />
        </Pressable>
        <Text
          style={[
            styles.headerTitle,
            { color: colors.text, fontSize: size(19), fontFamily },
          ]}
        >
          {screenTitle}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.formContent}
        showsVerticalScrollIndicator={false}
      >
        <FormField
          label="Study ID"
          value={studyId}
          onChangeText={setStudyId}
          editable={isCreate}
          placeholder="e.g. study_001"
          colors={colors}
          size={size}
          fontFamily={fontFamily}
        />

        <Text
          style={[
            styles.fieldLabel,
            { color: colors.mutedText, fontSize: size(12), fontFamily },
          ]}
        >
          Category
        </Text>

        {categories.length ? (
          <FlatList
            horizontal
            data={categories}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.categoryList}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => {
              const selected = item === category;
              return (
                <Pressable
                  onPress={() => setCategory(item)}
                  style={[
                    styles.categoryChip,
                    {
                      borderColor: selected ? colors.tint : colors.border,
                      backgroundColor: selected ? colors.tint : colors.card,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      {
                        color: selected ? "#FFFFFF" : colors.text,
                        fontSize: size(13),
                        fontFamily,
                      },
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            }}
          />
        ) : (
          <View
            style={[
              styles.emptyCategories,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <Text
              style={[
                styles.emptyCategoriesText,
                { color: colors.mutedText, fontSize: size(13), fontFamily },
              ]}
            >
              No categories found. Create one first.
            </Text>
            <Pressable
              onPress={() => router.push("/admin/CategoriesManager")}
              style={[styles.manageCategoriesButton, { borderColor: colors.tint }]}
            >
              <Text
                style={[
                  styles.manageCategoriesText,
                  { color: colors.tint, fontSize: size(13), fontFamily },
                ]}
              >
                Manage Categories
              </Text>
            </Pressable>
          </View>
        )}

        <FormField
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Study title"
          colors={colors}
          size={size}
          fontFamily={fontFamily}
        />

        <FormField
          label="Subtitle"
          value={subtitle}
          onChangeText={setSubtitle}
          placeholder="Optional subtitle"
          colors={colors}
          size={size}
          fontFamily={fontFamily}
        />

        <FormField
          label="Author"
          value={author}
          onChangeText={setAuthor}
          placeholder="Optional"
          colors={colors}
          size={size}
          fontFamily={fontFamily}
        />

        <FormField
          label="Content"
          value={content}
          onChangeText={setContent}
          multiline
          minHeight={240}
          placeholder="Write study content..."
          colors={colors}
          size={size}
          fontFamily={fontFamily}
        />

        <View
          style={[
            styles.syntaxHelp,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Text
            style={[
              styles.syntaxTitle,
              { color: colors.text, fontSize: size(13), fontFamily },
            ]}
          >
            Formatting Supported
          </Text>
          <Text
            style={[
              styles.syntaxText,
              { color: colors.mutedText, fontSize: size(12), fontFamily },
            ]}
          >
            Use `**bold**` for bold text.
          </Text>
          <Text
            style={[
              styles.syntaxText,
              { color: colors.mutedText, fontSize: size(12), fontFamily },
            ]}
          >
            Use `[color=#DC2626]text[/color]` for colored text.
          </Text>
          <Text
            style={[
              styles.syntaxText,
              { color: colors.mutedText, fontSize: size(12), fontFamily },
            ]}
          >
            Any `https://...` or `www...` link is auto-detected and clickable.
          </Text>
        </View>

        <View
          style={[
            styles.featuredRow,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Text
            style={[
              styles.featuredLabel,
              { color: colors.text, fontSize: size(14), fontFamily },
            ]}
          >
            Mark as featured
          </Text>
          <Switch value={isFeatured} onValueChange={setIsFeatured} />
        </View>

        <Pressable
          onPress={() => void handleSave()}
          disabled={saving}
          style={[styles.saveButton, { backgroundColor: colors.tint, opacity: saving ? 0.7 : 1 }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text
              style={[
                styles.saveButtonText,
                { color: "#FFFFFF", fontSize: size(15), fontFamily },
              ]}
            >
              Save Study
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  multiline = false,
  minHeight,
  colors,
  size,
  fontFamily,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  editable?: boolean;
  multiline?: boolean;
  minHeight?: number;
  colors: {
    border: string;
    card: string;
    text: string;
    subtleText: string;
    mutedText: string;
  };
  size: (value: number) => number;
  fontFamily: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text
        style={[
          styles.fieldLabel,
          { color: colors.mutedText, fontSize: size(12), fontFamily },
        ]}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subtleText}
        editable={editable}
        multiline={multiline}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            backgroundColor: editable ? colors.card : `${colors.border}55`,
            color: colors.text,
            fontSize: size(15),
            fontFamily,
            minHeight: minHeight ?? 46,
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  lockedText: {
    fontWeight: "600",
    marginBottom: 12,
  },
  simpleButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  simpleButtonText: {
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    marginLeft: 10,
    fontWeight: "700",
  },
  formContent: {
    padding: 14,
    paddingBottom: 36,
  },
  fieldWrap: {
    marginBottom: 12,
  },
  fieldLabel: {
    marginBottom: 6,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: "500",
  },
  categoryList: {
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipText: {
    fontWeight: "600",
  },
  emptyCategories: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  emptyCategoriesText: {
    fontWeight: "500",
  },
  manageCategoriesButton: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  manageCategoriesText: {
    fontWeight: "600",
  },
  featuredRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  featuredLabel: {
    fontWeight: "600",
  },
  syntaxHelp: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    gap: 4,
  },
  syntaxTitle: {
    fontWeight: "700",
    marginBottom: 2,
  },
  syntaxText: {
    fontWeight: "500",
    lineHeight: 18,
  },
  saveButton: {
    marginTop: 6,
    borderRadius: 12,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontWeight: "700",
  },
});
