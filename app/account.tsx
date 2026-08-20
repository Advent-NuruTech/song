import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/src/auth/AuthContext";
import { supabase } from "@/src/auth/supabaseClient";

const ROLE_LABELS: Record<string, string> = {
  reader: "Member", contributor: "Contributor", editor: "Editor", publisher: "Publisher",
  moderator: "Moderator", media_manager: "Media manager", user_manager: "User manager", super_admin: "Super admin",
};

type FieldProps = {
  label: string; icon: keyof typeof MaterialIcons.glyphMap; value: string;
  onChangeText: (value: string) => void; placeholder: string;
  colors: ReturnType<typeof useAppTheme>["colors"]; secure?: boolean; visible?: boolean;
  onToggleVisibility?: () => void; keyboardType?: "default" | "email-address";
  autoComplete?: "name" | "email" | "password" | "new-password";
};

function FormField({ label, icon, value, onChangeText, placeholder, colors, secure, visible, onToggleVisibility, keyboardType = "default", autoComplete }: FieldProps) {
  return <View style={styles.fieldWrap}>
    <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
    <View style={[styles.inputShell, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
      <MaterialIcons name={icon} size={20} color={colors.mutedText} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.subtleText}
        style={[styles.input, { color: colors.text }]} autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
        autoCorrect={false} keyboardType={keyboardType} autoComplete={autoComplete} secureTextEntry={Boolean(secure && !visible)} />
      {secure ? <Pressable accessibilityLabel={visible ? "Hide password" : "Show password"} hitSlop={10} onPress={onToggleVisibility}>
        <MaterialIcons name={visible ? "visibility-off" : "visibility"} size={21} color={colors.mutedText} />
      </Pressable> : null}
    </View>
  </View>;
}

export default function AccountScreen() {
  const { colors, darkMode } = useAppTheme();
  const auth = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);

  useEffect(() => {
    setProfileName(auth.profile?.display_name || auth.user?.user_metadata?.display_name || "");
    setProfileEmail(auth.user?.email || "");
  }, [auth.profile?.display_name, auth.user?.email, auth.user?.user_metadata?.display_name]);

  const initials = useMemo(() => {
    const source = profileName || profileEmail || "A";
    return source.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  }, [profileEmail, profileName]);

  const submitAuth = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return Alert.alert("Check your email", "Enter a complete email address, such as name@example.com.");
    if (password.length < 8) return Alert.alert("Password too short", "Use at least 8 characters for your password.");
    if (mode === "signup" && displayName.trim().length < 2) return Alert.alert("Add your name", "Enter the name you want other readers to see.");
    if (mode === "signup" && password !== confirmPassword) return Alert.alert("Passwords do not match", "Re-enter the same password in both fields.");
    setBusy(true);
    try {
      if (mode === "signin") await auth.signIn(cleanEmail, password);
      else {
        const confirmationNeeded = await auth.signUp(cleanEmail, password, displayName);
        if (confirmationNeeded) {
          Alert.alert("Confirm your email", "We sent you a secure confirmation link. Open it, then return to sign in.");
          setMode("signin"); setPassword(""); setConfirmPassword("");
        }
      }
    } catch (error) { Alert.alert(mode === "signin" ? "Couldn’t sign in" : "Couldn’t create account", (error as Error).message); }
    finally { setBusy(false); }
  };

  const saveName = async () => {
    setBusy(true);
    try { await auth.updateDisplayName(profileName); Alert.alert("Profile updated", "Your display name has been saved."); }
    catch (error) { Alert.alert("Couldn’t update profile", (error as Error).message); }
    finally { setBusy(false); }
  };
  const saveEmail = async () => {
    const cleanEmail = profileEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return Alert.alert("Check your email", "Enter a valid email address.");
    if (cleanEmail === auth.user?.email?.toLowerCase()) return Alert.alert("No change", "This is already your account email.");
    setBusy(true);
    try {
      const confirmationNeeded = await auth.updateEmail(cleanEmail);
      Alert.alert(confirmationNeeded ? "Confirm your new email" : "Email updated", confirmationNeeded ? "Open the confirmation link sent to your new email address to finish the change." : "Your sign-in email has been changed.");
    } catch (error) { Alert.alert("Couldn’t update email", (error as Error).message); }
    finally { setBusy(false); }
  };
  const savePassword = async () => {
    if (newPassword.length < 8) return Alert.alert("Password too short", "Use at least 8 characters.");
    if (newPassword !== newPasswordConfirm) return Alert.alert("Passwords do not match", "Re-enter the same password in both fields.");
    setBusy(true);
    try { await auth.updatePassword(newPassword); setNewPassword(""); setNewPasswordConfirm(""); Alert.alert("Password updated", "Your new password is ready to use."); }
    catch (error) { Alert.alert("Couldn’t update password", (error as Error).message); }
    finally { setBusy(false); }
  };
  const requestDeletion = () => Alert.alert("Delete account", "Request deletion of your account and associated personal data? This cannot be undone after processing.", [
    { text: "Cancel", style: "cancel" },
    { text: "Request deletion", style: "destructive", onPress: async () => {
      const { error } = await supabase.rpc("request_account_deletion");
      if (error) Alert.alert("Request failed", error.message);
      else Alert.alert("Request received", "Your deletion request is pending. You will be signed out now.", [{ text: "OK", onPress: () => void auth.signOut() }]);
    } },
  ]);

  if (!auth.configured) return <View style={[styles.centerState, { backgroundColor: colors.background }]}><MaterialIcons name="cloud-off" size={36} color={colors.mutedText} /><Text style={[styles.stateTitle, { color: colors.text }]}>Accounts are unavailable</Text><Text style={[styles.stateCopy, { color: colors.mutedText }]}>Connect this build to Supabase to enable secure accounts.</Text></View>;
  if (auth.loading) return <View style={[styles.centerState, { backgroundColor: colors.background }]}><Text style={{ color: colors.mutedText }}>Loading your profile…</Text></View>;

  if (!auth.user) return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
      <View style={[styles.authHero, { backgroundColor: darkMode ? "#101E35" : "#EEF6FF", borderColor: colors.border }]}>
        <View style={styles.logoHalo}><Image source={require("@/assets/images/icon.png")} style={styles.logo} /></View>
        <Text style={[styles.authTitle, { color: colors.text }]}>Welcome to Advent Pro</Text>
        <Text style={[styles.authSubtitle, { color: colors.mutedText }]}>Join the conversation, save your reactions, and keep one secure identity across your devices.</Text>
      </View>
      <View style={[styles.authCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.formTitle, { color: colors.text }]}>{mode === "signin" ? "Login" : "Create account"}</Text>
        <Text style={[styles.formHint, { color: colors.mutedText }]}>{mode === "signin" ? "Use your email and password to continue." : "Your name will appear beside comments you post."}</Text>
        {mode === "signup" ? <FormField label="Full name" icon="person-outline" value={displayName} onChangeText={setDisplayName} placeholder="Your name" colors={colors} autoComplete="name" /> : null}
        <FormField label="Email address" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="name@example.com" colors={colors} keyboardType="email-address" autoComplete="email" />
        <FormField label="Password" icon="lock-outline" value={password} onChangeText={setPassword} placeholder="At least 8 characters" colors={colors} secure visible={passwordVisible} onToggleVisibility={() => setPasswordVisible((value) => !value)} autoComplete={mode === "signup" ? "new-password" : "password"} />
        {mode === "signup" ? <FormField label="Confirm password" icon="lock-outline" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Enter your password again" colors={colors} secure visible={confirmVisible} onToggleVisibility={() => setConfirmVisible((value) => !value)} autoComplete="new-password" /> : null}
        <Pressable disabled={busy} onPress={() => void submitAuth()} style={[styles.primaryButton, { backgroundColor: colors.tint, opacity: busy ? 0.65 : 1 }]}><Text style={[styles.primaryButtonText, { color: darkMode ? "#0B1220" : "#FFFFFF" }]}>{busy ? "Please wait…" : mode === "signin" ? "Sign in securely" : "Create my account"}</Text>{!busy ? <MaterialIcons name="arrow-forward" size={19} color={darkMode ? "#0B1220" : "#FFFFFF"} /> : null}</Pressable>
        <View style={styles.secureNote}><MaterialIcons name="verified-user" size={16} color={colors.mutedText} /><Text style={[styles.secureNoteText, { color: colors.mutedText }]}>Your password is encrypted and never stored in the app.</Text></View>
        <View style={[styles.accountSwitch, { borderTopColor: colors.border }]}>
          <Text style={[styles.accountSwitchText, { color: colors.mutedText }]}>{mode === "signin" ? "Don’t have an account?" : "Already have an account?"}</Text>
          <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")} hitSlop={8}>
            <Text style={[styles.accountSwitchAction, { color: colors.tint }]}>{mode === "signin" ? "Create" : "Login"}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;

  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.profileContent} keyboardShouldPersistTaps="handled">
      <View style={[styles.profileHero, { backgroundColor: darkMode ? "#10213A" : "#EAF4FF" }]}><View style={[styles.avatar, { backgroundColor: colors.tint }]}><Text style={[styles.avatarText, { color: darkMode ? "#0B1220" : "#FFFFFF" }]}>{initials}</Text></View><View style={styles.profileHeroCopy}><Text style={[styles.profileTitle, { color: colors.text }]}>{profileName || "Your profile"}</Text><Text style={[styles.profileEmail, { color: colors.mutedText }]}>{auth.user.email}</Text><View style={styles.roleRow}>{(auth.roles.length ? auth.roles : ["reader"]).map((role) => <View key={role} style={[styles.roleChip, { backgroundColor: darkMode ? "#1E3654" : "#FFFFFF" }]}><MaterialIcons name="verified" size={14} color={colors.tint} /><Text style={[styles.roleText, { color: colors.text }]}>{ROLE_LABELS[role] || role}</Text></View>)}</View></View></View>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}><SectionHeader icon="person-outline" title="Personal details" subtitle="How you appear in the Advent Pro community" colors={colors} /><FormField label="Display name" icon="badge" value={profileName} onChangeText={setProfileName} placeholder="Your name" colors={colors} autoComplete="name" /><Pressable disabled={busy} onPress={() => void saveName()} style={[styles.secondaryButton, { borderColor: colors.tint }]}><Text style={[styles.secondaryButtonText, { color: colors.tint }]}>Save name</Text></Pressable></View>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}><SectionHeader icon="alternate-email" title="Email address" subtitle="Used for sign-in and account recovery" colors={colors} /><FormField label="Email address" icon="mail-outline" value={profileEmail} onChangeText={setProfileEmail} placeholder="name@example.com" colors={colors} keyboardType="email-address" autoComplete="email" /><Pressable disabled={busy} onPress={() => void saveEmail()} style={[styles.secondaryButton, { borderColor: colors.tint }]}><Text style={[styles.secondaryButtonText, { color: colors.tint }]}>Update email</Text></Pressable></View>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}><SectionHeader icon="lock-outline" title="Password & security" subtitle="Choose a new password with at least 8 characters" colors={colors} /><FormField label="New password" icon="lock-outline" value={newPassword} onChangeText={setNewPassword} placeholder="New secure password" colors={colors} secure visible={newPasswordVisible} onToggleVisibility={() => setNewPasswordVisible((value) => !value)} autoComplete="new-password" /><FormField label="Confirm new password" icon="lock-outline" value={newPasswordConfirm} onChangeText={setNewPasswordConfirm} placeholder="Enter it again" colors={colors} secure visible={newPasswordVisible} onToggleVisibility={() => setNewPasswordVisible((value) => !value)} autoComplete="new-password" /><Pressable disabled={busy} onPress={() => void savePassword()} style={[styles.secondaryButton, { borderColor: colors.tint }]}><Text style={[styles.secondaryButtonText, { color: colors.tint }]}>Change password</Text></Pressable></View>
      <Pressable onPress={() => void auth.signOut()} style={[styles.signOutButton, { backgroundColor: colors.card, borderColor: colors.border }]}><MaterialIcons name="logout" size={20} color={colors.text} /><Text style={[styles.signOutText, { color: colors.text }]}>Sign out</Text></Pressable>
      <Pressable onPress={requestDeletion} style={styles.deleteButton}><Text style={styles.deleteText}>Request account deletion</Text></Pressable><Text style={[styles.legal, { color: colors.mutedText }]}>Deletion requests remove your account and personal data after required security and legal checks.</Text><Pressable onPress={() => router.push("/privacy")}><Text style={[styles.privacyLink, { color: colors.tint }]}>View privacy policy</Text></Pressable>
    </ScrollView>
  </KeyboardAvoidingView>;
}

function SectionHeader({ icon, title, subtitle, colors }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; subtitle: string; colors: ReturnType<typeof useAppTheme>["colors"] }) {
  return <View style={styles.sectionHeadingRow}><View style={[styles.sectionIcon, { backgroundColor: `${colors.tint}18` }]}><MaterialIcons name={icon} size={22} color={colors.tint} /></View><View style={{ flex: 1 }}><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.sectionSubtitle, { color: colors.mutedText }]}>{subtitle}</Text></View></View>;
}

const styles = StyleSheet.create({
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }, stateTitle: { fontSize: 21, fontWeight: "800", marginTop: 14 }, stateCopy: { fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 7 },
  authContent: { padding: 20, paddingTop: 28, paddingBottom: 60, alignItems: "center" }, authHero: { width: "100%", maxWidth: 560, alignItems: "center", borderWidth: 1, borderRadius: 28, padding: 28, paddingBottom: 34 }, logoHalo: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 7, shadowColor: "#06224A", shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 }, logo: { width: 72, height: 72, borderRadius: 18 }, authTitle: { fontSize: 27, fontWeight: "900", letterSpacing: -0.5, marginTop: 20, textAlign: "center" }, authSubtitle: { maxWidth: 420, textAlign: "center", fontSize: 14, lineHeight: 21, marginTop: 9 }, authCard: { width: "92%", maxWidth: 500, borderWidth: 1, borderRadius: 24, padding: 22, marginTop: -15, shadowColor: "#061A33", shadowOpacity: 0.08, shadowRadius: 22, shadowOffset: { width: 0, height: 9 }, elevation: 4 },
  formTitle: { fontSize: 21, fontWeight: "900" }, formHint: { fontSize: 13, lineHeight: 19, marginTop: 4, marginBottom: 4 },
  fieldWrap: { marginTop: 17 }, fieldLabel: { fontSize: 13, fontWeight: "700", marginBottom: 7 }, inputShell: { minHeight: 52, borderWidth: 1, borderRadius: 13, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10 }, input: { flex: 1, fontSize: 16, paddingVertical: 12 }, primaryButton: { minHeight: 54, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 22 }, primaryButtonText: { fontSize: 15, fontWeight: "900" }, secureNote: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 15 }, secureNoteText: { fontSize: 11, flexShrink: 1 },
  accountSwitch: { borderTopWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 18, paddingTop: 18 }, accountSwitchText: { fontSize: 13 }, accountSwitchAction: { fontSize: 13, fontWeight: "900" },
  profileContent: { padding: 20, paddingTop: 28, paddingBottom: 70, maxWidth: 780, width: "100%", alignSelf: "center" }, profileHero: { borderRadius: 24, padding: 24, flexDirection: "row", alignItems: "center", gap: 18, marginBottom: 18 }, avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" }, avatarText: { fontSize: 25, fontWeight: "900" }, profileHeroCopy: { flex: 1 }, profileTitle: { fontSize: 24, fontWeight: "900" }, profileEmail: { fontSize: 13, marginTop: 3 }, roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 11 }, roleChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: 9, borderRadius: 999 }, roleText: { fontSize: 11, fontWeight: "800" },
  sectionCard: { borderWidth: 1, borderRadius: 20, padding: 20, marginTop: 14 }, sectionHeadingRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 2 }, sectionIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" }, sectionTitle: { fontSize: 17, fontWeight: "900" }, sectionSubtitle: { fontSize: 12, marginTop: 2 }, secondaryButton: { minHeight: 46, borderWidth: 1.5, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 16 }, secondaryButtonText: { fontSize: 14, fontWeight: "900" },
  signOutButton: { minHeight: 52, borderWidth: 1, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24 }, signOutText: { fontWeight: "800" }, deleteButton: { alignItems: "center", padding: 14, marginTop: 7 }, deleteText: { color: "#C62828", fontWeight: "800", fontSize: 13 }, legal: { textAlign: "center", fontSize: 11, lineHeight: 17, paddingHorizontal: 16 }, privacyLink: { textAlign: "center", fontWeight: "800", fontSize: 12, marginTop: 10 },
});
