import { Stack } from "expo-router";
import { Platform, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useQuickFooter } from "@/src/context/QuickFooterContext";

const sections = [
  ["Information we process", "If you create an account, we process your email address, display name, encrypted authentication credentials, account identifier, assigned roles, and security/session information. Passwords are handled by our authentication provider and are not visible to Advent Pro. We also process content you submit and records needed to prevent abuse and protect published material."],
  ["Offline and device data", "Downloaded songs, studies, Bible versions, settings, search indexes, and temporary cached content may be stored on your device. The app uses this data to remain useful without a connection. Clearing app data or uninstalling may remove local information that has not synchronized."],
  ["How we use information", "We use information to authenticate accounts, provide requested features, synchronize access roles, deliver and correct content, maintain security, respond to support requests, and comply with legal obligations. We do not sell personal information or use it for third-party behavioral advertising."],
  ["Service providers", "Advent Pro uses Supabase for authentication, database, and synchronization services, and may use hosting, content-delivery, error-monitoring, or email providers as the service develops. Providers process information only to operate the service under their own security and privacy commitments."],
  ["Sharing", "We share information only with service providers acting for us, when you intentionally publish or share content, when required by law, or when necessary to protect users, the service, and the public. Account roles may be visible to authorized administrators."],
  ["Retention and deletion", "We retain account information while your account is active and as reasonably needed for security, disputes, legal duties, backups, and audit integrity. You may request account and associated personal-data deletion through adventnurutech.xyz or the contact options in About. Before public Google Play release, the same deletion request must also be available from a public web URL entered in Play Console."],
  ["Security", "We use authenticated sessions, database row-level security, role-based permissions, encrypted network transport, and audit records. No method is completely secure; protect your password and report suspected account misuse promptly."],
  ["Children", "The service is not designed to collect personal information from children without appropriate parent or guardian involvement. Contact us if you believe a child supplied personal data that should be removed."],
  ["International processing", "Our providers may process information in countries other than yours. We take reasonable steps to use providers and safeguards appropriate to the information processed."],
  ["Your choices", "You can use core offline reading without an account, sign out at any time, control downloads through device settings, correct profile information, and request access to or deletion of personal information subject to applicable law."],
  ["Policy changes", "We may update this policy when features or legal requirements change. We will update the effective date and provide additional notice when a change materially affects how personal information is used."],
  ["Contact", "Privacy questions and deletion requests can be sent through https://adventnurutech.xyz or through the call and WhatsApp options in the app's About page."],
];

export default function PrivacyPolicyScreen() {
  const { colors, size, fontFamily, darkMode } = useAppTheme(); const { reportScroll } = useQuickFooter();
  return <View style={[styles.container,{backgroundColor:colors.background}]}><Stack.Screen options={{headerShown:false}}/><StatusBar barStyle={darkMode?"light-content":"dark-content"} backgroundColor={colors.background}/>
    <ScrollView contentContainerStyle={styles.content} onScroll={e=>reportScroll(e.nativeEvent.contentOffset.y)} scrollEventThrottle={16}>
      <Text style={[styles.heading,{color:colors.text,fontSize:size(30),fontFamily}]}>Privacy Policy</Text>
      <Text style={[styles.date,{color:colors.mutedText,fontFamily}]}>Effective: August 20, 2026</Text>
      <Text style={[styles.paragraph,{color:colors.text,fontSize:size(15),fontFamily}]}>This policy explains how Advent Pro and Advent Nuru Tech process information when you use the mobile application, website, and administration services.</Text>
      {sections.map(([title,body])=><View key={title}><Text style={[styles.title,{color:colors.text,fontSize:size(20),fontFamily}]}>{title}</Text><Text style={[styles.paragraph,{color:colors.text,fontSize:size(15),fontFamily}]}>{body}</Text></View>)}
    </ScrollView></View>;
}
const styles=StyleSheet.create({container:{flex:1},content:{paddingHorizontal:24,paddingTop:Platform.OS==="ios"?70:52,paddingBottom:50},heading:{fontWeight:"800"},date:{marginTop:6,marginBottom:18},title:{fontWeight:"700",marginTop:22,marginBottom:8},paragraph:{lineHeight:24,marginBottom:10}});
