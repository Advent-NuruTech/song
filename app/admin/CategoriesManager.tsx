import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useAdminMode } from "@/src/admin/adminAccess";
import {
  CategoryUpsertInput,
  StudyCategoryRow,
  deleteStudyCategory,
  listStudyCategories,
  upsertStudyCategory,
} from "@/src/services/adminService";

const EMPTY_FORM: CategoryUpsertInput = {
  name: "",
  displayName: "",
  color: "#2563EB",
  icon: "book",
  description: "",
  sortOrder: 0,
};

export default function CategoriesManager() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const { enabled, loading, refresh } = useAdminMode();

  const [categories, setCategories] = useState<StudyCategoryRow[]>([]);
  const [form, setForm] = useState<CategoryUpsertInput>(EMPTY_FORM);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [screenLoading, setScreenLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    setScreenLoading(true);
    try {
      const rows = await listStudyCategories();
      setCategories(rows);
    } catch (error) {
      Alert.alert(
        "Load failed",
        (error as Error)?.message || "Could not load categories."
      );
    } finally {
      setScreenLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void loadCategories();
    }, [refresh, loadCategories])
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingName(null);
  };

  const handleEdit = (item: StudyCategoryRow) => {
    setEditingName(item.name);
    setForm({
      name: item.name,
      displayName: item.displayName,
      color: item.color,
      icon: item.icon,
      description: item.description,
      sortOrder: item.sortOrder,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertStudyCategory(form, editingName ?? undefined);
      resetForm();
      await loadCategories();
    } catch (error) {
      Alert.alert("Save failed", (error as Error)?.message || "Could not save category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: StudyCategoryRow) => {
    Alert.alert(
      "Delete category",
      item.usageCount > 0
        ? `Cannot delete "${item.name}" because it has ${item.usageCount} studies.`
        : `Delete "${item.name}" category?`,
      item.usageCount > 0
        ? [{ text: "OK" }]
        : [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                void (async () => {
                  try {
                    await deleteStudyCategory(item.name);
                    await loadCategories();
                  } catch (error) {
                    Alert.alert(
                      "Delete failed",
                      (error as Error)?.message || "Could not delete category."
                    );
                  }
                })();
              },
            },
          ]
    );
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
          Manage Categories
        </Text>
      </View>

      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text, fontSize: size(16), fontFamily },
          ]}
        >
          {editingName ? `Edit: ${editingName}` : "Add New Category"}
        </Text>

        <FormField
          label="Name (key)"
          value={form.name}
          onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
          placeholder="e.g. prophecy"
          editable={!editingName}
          colors={colors}
          size={size}
          fontFamily={fontFamily}
        />

        <FormField
          label="Display Name"
          value={form.displayName}
          onChangeText={(text) => setForm((prev) => ({ ...prev, displayName: text }))}
          placeholder="e.g. Prophecy"
          colors={colors}
          size={size}
          fontFamily={fontFamily}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <FormField
              label="Color"
              value={form.color}
              onChangeText={(text) => setForm((prev) => ({ ...prev, color: text }))}
              placeholder="#2563EB"
              colors={colors}
              size={size}
              fontFamily={fontFamily}
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormField
              label="Icon"
              value={form.icon}
              onChangeText={(text) => setForm((prev) => ({ ...prev, icon: text }))}
              placeholder="book"
              colors={colors}
              size={size}
              fontFamily={fontFamily}
            />
          </View>
        </View>

        <FormField
          label="Description"
          value={form.description}
          onChangeText={(text) => setForm((prev) => ({ ...prev, description: text }))}
          placeholder="Optional description"
          colors={colors}
          size={size}
          fontFamily={fontFamily}
        />

        <FormField
          label="Sort Order"
          value={String(form.sortOrder)}
          onChangeText={(text) =>
            setForm((prev) => ({
              ...prev,
              sortOrder: Number.parseInt(text, 10) || 0,
            }))
          }
          keyboardType="number-pad"
          placeholder="0"
          colors={colors}
          size={size}
          fontFamily={fontFamily}
        />

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => void handleSave()}
            disabled={saving}
            style={[
              styles.actionButton,
              { backgroundColor: colors.tint, opacity: saving ? 0.7 : 1 },
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.actionButtonText,
                  { color: "#FFFFFF", fontSize: size(14), fontFamily },
                ]}
              >
                {editingName ? "Update Category" : "Add Category"}
              </Text>
            )}
          </Pressable>

          {editingName && (
            <Pressable
              onPress={resetForm}
              style={[
                styles.secondaryButton,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  { color: colors.text, fontSize: size(14), fontFamily },
                ]}
              >
                Cancel
              </Text>
            </Pressable>
          )}
        </View>

        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text, fontSize: size(16), fontFamily, marginTop: 20 },
          ]}
        >
          Existing Categories
        </Text>

        <FlatList
          data={categories}
          keyExtractor={(item) => item.name}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View
              style={[
                styles.categoryCard,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <View style={styles.categoryHeader}>
                <View style={styles.categoryTitleRow}>
                  <View
                    style={[
                      styles.colorDot,
                      {
                        backgroundColor: item.color || "#2563EB",
                        borderColor: colors.border,
                      },
                    ]}
                  />
                  <View style={styles.categoryTextBlock}>
                    <Text
                      style={[
                        styles.categoryName,
                        { color: colors.text, fontSize: size(15), fontFamily },
                      ]}
                    >
                      {item.displayName || item.name}
                    </Text>
                    <Text
                      style={[
                        styles.categoryMeta,
                        { color: colors.mutedText, fontSize: size(12), fontFamily },
                      ]}
                    >
                      {item.name} • icon: {item.icon || "book"} • order: {item.sortOrder}
                    </Text>
                  </View>
                </View>

                <View style={styles.countBadge}>
                  <Text
                    style={[
                      styles.countText,
                      { color: colors.mutedText, fontSize: size(11), fontFamily },
                    ]}
                  >
                    {item.usageCount} studies
                  </Text>
                </View>
              </View>

              {!!item.description && (
                <Text
                  style={[
                    styles.categoryDescription,
                    { color: colors.mutedText, fontSize: size(12), fontFamily },
                  ]}
                >
                  {item.description}
                </Text>
              )}

              <View style={styles.categoryActions}>
                <Pressable
                  onPress={() => handleEdit(item)}
                  style={[styles.rowButton, { borderColor: colors.border }]}
                >
                  <Ionicons name="create-outline" size={size(16)} color={colors.text} />
                  <Text
                    style={[
                      styles.rowButtonText,
                      { color: colors.text, fontSize: size(13), fontFamily },
                    ]}
                  >
                    Edit
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(item)}
                  style={[
                    styles.rowButton,
                    { borderColor: item.usageCount > 0 ? colors.border : "#EF4444" },
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={size(16)}
                    color={item.usageCount > 0 ? colors.mutedText : "#EF4444"}
                  />
                  <Text
                    style={[
                      styles.rowButtonText,
                      {
                        color: item.usageCount > 0 ? colors.mutedText : "#EF4444",
                        fontSize: size(13),
                        fontFamily,
                      },
                    ]}
                  >
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: colors.text, fontSize: size(15), fontFamily },
                ]}
              >
                No categories yet
              </Text>
            </View>
          }
        />
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
  keyboardType,
  colors,
  size,
  fontFamily,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  editable?: boolean;
  keyboardType?: "default" | "number-pad";
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
        keyboardType={keyboardType}
        style={[
          styles.input,
          {
            borderColor: colors.border,
            backgroundColor: editable ? colors.card : `${colors.border}55`,
            color: colors.text,
            fontSize: size(15),
            fontFamily,
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
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: 14,
    paddingBottom: 36,
  },
  sectionTitle: {
    fontWeight: "700",
    marginBottom: 12,
  },
  fieldWrap: {
    marginBottom: 10,
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
  row: {
    flexDirection: "row",
    gap: 10,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontWeight: "700",
  },
  listContent: {
    gap: 10,
  },
  categoryCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  categoryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryTextBlock: {
    flex: 1,
  },
  categoryName: {
    fontWeight: "700",
  },
  categoryMeta: {
    marginTop: 2,
    fontWeight: "500",
  },
  countBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  countText: {
    fontWeight: "700",
  },
  categoryDescription: {
    lineHeight: 18,
  },
  categoryActions: {
    flexDirection: "row",
    gap: 8,
  },
  rowButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  rowButtonText: {
    fontWeight: "600",
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyTitle: {
    fontWeight: "700",
  },
});
