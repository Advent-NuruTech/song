import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useAuth } from "@/src/auth/AuthContext";
import { supabase } from "@/src/auth/supabaseClient";

const ROLE_LABELS: Record<string, string> = {
  reader: "Reader", contributor: "Contributor", editor: "Editor", publisher: "Publisher",
  moderator: "Moderator", media_manager: "Media manager", user_manager: "User manager", super_admin: "Super admin",
};

export default function AccountScreen() {
  const { colors, fontFamily, size } = useAppTheme();
  const auth = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || password.length < 8) return Alert.alert("Check details", "Enter a valid email and a password of at least 8 characters.");
    setBusy(true);
    try {
      if (mode === "signin") await auth.signIn(email, password);
      else {
        const confirmationNeeded = await auth.signUp(email, password, displayName);
        if (confirmationNeeded) Alert.alert("Check your email", "Open the confirmation link, then return and sign in.");
      }
    } catch (e) { Alert.alert("Account error", (e as Error).message); }
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

  const textStyle = { color: colors.text, fontFamily };
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Pressable onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={24} color={colors.text}/></Pressable>
    <Text style={[styles.heading, textStyle, { fontSize: size(28) }]}>Your account</Text>
    {!auth.configured ? <Text style={[styles.notice, textStyle]}>Online accounts are not configured in this build.</Text> : auth.user ? <>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.name, textStyle]}>{auth.profile?.display_name || auth.user.email}</Text>
        <Text style={[styles.muted, { color: colors.mutedText }]}>{auth.user.email}</Text>
        <Text style={[styles.label, textStyle]}>Roles</Text>
        <View style={styles.chips}>{(auth.roles.length ? auth.roles : ["reader"]).map((role) => <View key={role} style={[styles.chip,{backgroundColor:colors.surface}]}><Text style={[textStyle,{fontSize:size(13)}]}>{ROLE_LABELS[role] || role}</Text></View>)}</View>
        <Text style={[styles.label, textStyle]}>Available capabilities</Text>
        <Text style={[styles.muted,{color:colors.mutedText}]}>{auth.permissions.length ? auth.permissions.join(" • ") : "Reading and personal account features"}</Text>
      </View>
      <Pressable style={[styles.button,{backgroundColor:colors.tint}]} onPress={() => void auth.refreshAccess()}><Text style={styles.buttonText}>Refresh access</Text></Pressable>
      <Pressable style={[styles.outline,{borderColor:colors.border}]} onPress={() => void auth.signOut()}><Text style={[textStyle,{fontWeight:"700"}]}>Sign out</Text></Pressable>
      <Pressable style={styles.deleteButton} onPress={requestDeletion}><Text style={styles.deleteText}>Request account deletion</Text></Pressable>
      <Text style={[styles.legal,{color:colors.mutedText}]}>Deletion requests remove the account and associated personal data after security and legal checks. Some audit or published records may be retained when legally necessary.</Text>
    </> : <>
      <Text style={[styles.muted,{color:colors.mutedText}]}>Sign in to synchronize your identity and access features assigned by administrators. Reading remains available offline without an account.</Text>
      {mode === "signup" && <TextInput style={[styles.input,{color:colors.text,borderColor:colors.border}]} placeholder="Display name" placeholderTextColor={colors.mutedText} value={displayName} onChangeText={setDisplayName}/>} 
      <TextInput style={[styles.input,{color:colors.text,borderColor:colors.border}]} placeholder="Email" placeholderTextColor={colors.mutedText} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}/>
      <TextInput style={[styles.input,{color:colors.text,borderColor:colors.border}]} placeholder="Password (8+ characters)" placeholderTextColor={colors.mutedText} secureTextEntry value={password} onChangeText={setPassword}/>
      <Pressable disabled={busy} style={[styles.button,{backgroundColor:colors.tint,opacity:busy ? 0.6 : 1}]} onPress={submit}><Text style={styles.buttonText}>{busy?"Please wait…":mode==="signin"?"Sign in":"Create account"}</Text></Pressable>
      <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")}><Text style={[styles.switch,{color:colors.tint}]}>{mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}</Text></Pressable>
    </>}
  </ScrollView>;
}

const styles=StyleSheet.create({content:{padding:24,paddingTop:54,paddingBottom:60},back:{marginBottom:22},heading:{fontWeight:"800",marginBottom:10},card:{borderWidth:1,borderRadius:18,padding:18,marginTop:20},name:{fontSize:20,fontWeight:"800"},muted:{fontSize:14,lineHeight:21},label:{fontWeight:"800",marginTop:20,marginBottom:8},chips:{flexDirection:"row",flexWrap:"wrap",gap:8},chip:{paddingHorizontal:12,paddingVertical:7,borderRadius:20},input:{borderWidth:1,borderRadius:12,padding:14,marginTop:14,fontSize:16},button:{padding:15,borderRadius:12,alignItems:"center",marginTop:18},buttonText:{color:"#fff",fontWeight:"800"},outline:{padding:15,borderRadius:12,borderWidth:1,alignItems:"center",marginTop:12},switch:{fontWeight:"700",textAlign:"center",marginTop:20},notice:{padding:16,borderRadius:12},deleteButton:{alignItems:"center",padding:14,marginTop:12},deleteText:{color:"#C62828",fontWeight:"800"},legal:{fontSize:12,lineHeight:18,marginTop:12}});
