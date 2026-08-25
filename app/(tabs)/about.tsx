import { useAppTheme } from "@/hooks/use-app-theme";
import {
  ADMIN_MODE_TAP_TARGET,
  getRemainingAdminTaps,
  isAdminModeEnabled,
  setAdminModeEnabled,
} from "@/src/admin/adminAccess";
import { useQuickFooter } from "@/src/context/QuickFooterContext";
import { useDonationReturnState } from "@/hooks/useDonationReturnState";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";

const NURUTECH_URL = "https://adventnurutech.xyz";
const NURUTECH_ABOUT_URL = "https://adventnurutech.xyz/about";
const APP_VERSION = "1.2.0";

const DOWNLOAD_URL = "https://play.google.com/store/apps/details?id=com.adventpro";

const CALL_NUMBER = "+254759167209";
const WHATSAPP_NUMBER = "+254142225233";
const WHATSAPP_MESSAGE = "Hello, I'm using Advent Pro app and would like to get in touch.";

export default function AboutScreen() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const { reportScroll } = useQuickFooter();
  const { openSupport } = useDonationReturnState();

  const [whatsappAvailable, setWhatsappAvailable] = useState(true);
  const [adminEnabled, setAdminEnabled] = useState(false);
  const [versionTapCount, setVersionTapCount] = useState(0);

  const appVersion = Constants.expoConfig?.version || Constants.manifest?.version || APP_VERSION;

  // Animation values
  const scrollY = useSharedValue(0);
  const headerOpacity = useSharedValue(1);

  const cardHeaderAnim = useSharedValue(0);
  const aboutAnim = useSharedValue(0);
  const featuresAnim = useSharedValue(0);
  const supportAnim = useSharedValue(0);
  const legalAnim = useSharedValue(0);
  const contactAnim = useSharedValue(0);
  const shareAnim = useSharedValue(0);
  const versionAnim = useSharedValue(0);

  const cardHeaderStyle = useAnimatedStyle(() => ({
    opacity: cardHeaderAnim.value,
    transform: [
      {
        translateY: interpolate(cardHeaderAnim.value, [0, 1], [50, 0], Extrapolate.CLAMP),
      },
      {
        scale: interpolate(cardHeaderAnim.value, [0, 1], [0.9, 1], Extrapolate.CLAMP),
      },
    ],
  }));

  const aboutCardStyle = useAnimatedStyle(() => ({
    opacity: aboutAnim.value,
    transform: [
      { translateY: interpolate(aboutAnim.value, [0, 1], [50, 0], Extrapolate.CLAMP) },
      { scale: interpolate(aboutAnim.value, [0, 1], [0.9, 1], Extrapolate.CLAMP) },
    ],
  }));

  const featuresCardStyle = useAnimatedStyle(() => ({
    opacity: featuresAnim.value,
    transform: [
      { translateY: interpolate(featuresAnim.value, [0, 1], [50, 0], Extrapolate.CLAMP) },
      { scale: interpolate(featuresAnim.value, [0, 1], [0.9, 1], Extrapolate.CLAMP) },
    ],
  }));

  const supportCardStyle = useAnimatedStyle(() => ({
    opacity: supportAnim.value,
    transform: [
      { translateY: interpolate(supportAnim.value, [0, 1], [50, 0], Extrapolate.CLAMP) },
      { scale: interpolate(supportAnim.value, [0, 1], [0.9, 1], Extrapolate.CLAMP) },
    ],
  }));

  const legalCardStyle = useAnimatedStyle(() => ({
    opacity: legalAnim.value,
    transform: [
      { translateY: interpolate(legalAnim.value, [0, 1], [50, 0], Extrapolate.CLAMP) },
      { scale: interpolate(legalAnim.value, [0, 1], [0.9, 1], Extrapolate.CLAMP) },
    ],
  }));

  const contactCardStyle = useAnimatedStyle(() => ({
    opacity: contactAnim.value,
    transform: [
      { translateY: interpolate(contactAnim.value, [0, 1], [50, 0], Extrapolate.CLAMP) },
      { scale: interpolate(contactAnim.value, [0, 1], [0.9, 1], Extrapolate.CLAMP) },
    ],
  }));

  const shareCardStyle = useAnimatedStyle(() => ({
    opacity: shareAnim.value,
    transform: [
      { translateY: interpolate(shareAnim.value, [0, 1], [50, 0], Extrapolate.CLAMP) },
      { scale: interpolate(shareAnim.value, [0, 1], [0.9, 1], Extrapolate.CLAMP) },
    ],
  }));

  const versionCardStyle = useAnimatedStyle(() => ({
    opacity: versionAnim.value,
    transform: [
      { translateY: interpolate(versionAnim.value, [0, 1], [50, 0], Extrapolate.CLAMP) },
      { scale: interpolate(versionAnim.value, [0, 1], [0.9, 1], Extrapolate.CLAMP) },
    ],
  }));

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [
      {
        translateY: interpolate(scrollY.value, [0, 100], [0, -20], Extrapolate.CLAMP),
      },
    ],
  }));

  const floatingIconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(scrollY.value, [0, 50, 100], [0, -10, -20], Extrapolate.CLAMP),
      },
    ],
    opacity: interpolate(scrollY.value, [0, 100], [1, 0.8], Extrapolate.CLAMP),
  }));

  // Handlers
  const openNurutech = () => Linking.openURL(NURUTECH_URL);
  const openDonatePage = () => void openSupport();
  const openNurutechAbout = () => Linking.openURL(NURUTECH_ABOUT_URL);
  const openAdminDashboard = () => router.push("/admin/AdminDashboard");

  const handleCall = () => Linking.openURL(`tel:${CALL_NUMBER}`);

  const handleWhatsApp = async () => {
    const encodedMessage = encodeURIComponent(WHATSAPP_MESSAGE);
    const whatsappUrl = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encodedMessage}`;
    const webWhatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        setWhatsappAvailable(false);
        Alert.alert(
          "WhatsApp Not Installed",
          "Would you like to open WhatsApp Web instead?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open WhatsApp Web", onPress: () => Linking.openURL(webWhatsappUrl) },
          ]
        );
      }
    } catch {
      setWhatsappAvailable(false);
      Alert.alert("Error", "Unable to open WhatsApp.", [
        { text: "Cancel", style: "cancel" },
        { text: "Open WhatsApp Web", onPress: () => Linking.openURL(webWhatsappUrl) },
      ]);
    }
  };

  const shareApp = async () => {
    try {
      await Share.share({
        message:
          `Discover all types of useful study guides, songs and hymns in Advent Pro!\n\n` +
          `A comprehensive offline resource for spiritual growth with:\n` +
          `- 500+ hymns with lyrics\n` +
          `- Bible study topics\n` +
          `- Daily devotionals\n` +
          `- All available offline\n\n` +
          `Download now:\n${DOWNLOAD_URL}\n\nPowered by Advent Nurutech`,
        title: "Advent Pro",
      });
    } catch (error) {
      console.error("Error sharing app:", error);
    }
  };

  // Initialize animations
  useEffect(() => {
    cardHeaderAnim.value = withDelay(0, withSpring(1, { damping: 12, stiffness: 100 }));
    aboutAnim.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 100 }));
    featuresAnim.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 100 }));
    supportAnim.value = withDelay(300, withSpring(1, { damping: 12, stiffness: 100 }));
    legalAnim.value = withDelay(400, withSpring(1, { damping: 12, stiffness: 100 }));
    contactAnim.value = withDelay(500, withSpring(1, { damping: 12, stiffness: 100 }));
    shareAnim.value = withDelay(600, withSpring(1, { damping: 12, stiffness: 100 }));
    versionAnim.value = withDelay(700, withSpring(1, { damping: 12, stiffness: 100 }));
  }, [aboutAnim, cardHeaderAnim, contactAnim, featuresAnim, legalAnim, shareAnim, supportAnim, versionAnim]);

  // Admin mode
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const enabled = await isAdminModeEnabled();
      if (mounted) setAdminEnabled(enabled);
    })();
    return () => { mounted = false; };
  }, []);

  const handleVersionTap = () => {
    if (adminEnabled) {
      openAdminDashboard();
      return;
    }

    const nextCount = versionTapCount + 1;
    if (nextCount >= ADMIN_MODE_TAP_TARGET) {
      void (async () => {
        try {
          await setAdminModeEnabled(true);
          setAdminEnabled(true);
          setVersionTapCount(0);
          Alert.alert("Admin Mode Enabled");
        } catch (error) {
          Alert.alert("Failed to enable admin mode", (error as Error)?.message || "Try again.");
        }
      })();
      return;
    }

    setVersionTapCount(nextCount);
    const remaining = getRemainingAdminTaps(nextCount);
    if (remaining <= 2) {
      Alert.alert("Admin Mode", `${remaining} more tap(s) to enable admin mode.`);
    }
  };

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      runOnJS(reportScroll)(event.contentOffset.y);

      headerOpacity.value = interpolate(
        event.contentOffset.y,
        [0, 100],
        [1, 0],
        Extrapolate.CLAMP
      );
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.headerCard,
            { backgroundColor: darkMode ? "#0B3D91" : "#0B4AA6" },
            headerAnimatedStyle,
            cardHeaderStyle,
          ]}
        >
          <Animated.View style={[styles.floatingIcons, floatingIconStyle]}>
            <Ionicons name="book" size={size(32)} color="rgba(255,255,255,0.3)" style={styles.floatingIcon} />
            <Ionicons name="musical-notes" size={size(28)} color="rgba(255,255,255,0.3)" style={[styles.floatingIcon, { top: 20, left: '60%' }]} />
            <Ionicons name="heart" size={size(24)} color="rgba(255,255,255,0.3)" style={[styles.floatingIcon, { top: 40, left: '20%' }]} />
          </Animated.View>

          <Text style={[styles.appName, { color: "#FFFFFF", fontSize: size(28), fontFamily }]}>
            Advent Pro
          </Text>

          <View style={styles.nurutechLinks}>
            <Pressable onPress={openNurutech} style={styles.poweredByContainer}>
              <Text style={[styles.poweredBy, { color: "rgba(219,234,254,0.95)", fontSize: size(13), fontFamily }]}>
                Powered by Advent Nurutech
              </Text>
              <Ionicons name="open-outline" size={size(12)} color="rgba(219,234,254,0.7)" />
            </Pressable>

            <Pressable onPress={openNurutechAbout} style={styles.learnMoreContainer}>
              <Text style={[styles.learnMore, { color: "rgba(219,234,254,0.85)", fontSize: size(12), fontFamily }]}>
                Learn more about Advent Nurutech
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* About This App */}
        <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, aboutCardStyle]}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={size(24)} color={colors.tint} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: size(18), fontFamily, marginLeft: 8 }]}>
              About This App
            </Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.text, fontSize: size(15), fontFamily }]}>
            Advent Pro is built to become one of the most useful platforms in the world. 
            A Digital Hub bringing together reformers&apos; resources and collections into one unified platform.
          </Text>
          <Text style={[styles.bodyText, { color: colors.text, fontSize: size(15), fontFamily, marginTop: 12 }]}>
            Our main goal is to provide comprehensive study resources that work fully offline...
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, featuresCardStyle]}>
          <View style={styles.cardHeader}>
            <Ionicons name="checkmark-circle" size={size(24)} color={colors.tint} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: size(18), fontFamily, marginLeft: 8 }]}>
              What You Can Do
            </Text>
          </View>
          <View style={styles.featuresList}>
            {["Search hymns by title or lyrics", "Explore studies by topic", "Fully offline access"].map((text, i) => (
              <View key={i} style={styles.featureItem}>
                <Ionicons name={["search", "folder-open", "cloud-offline"][i] as any} size={size(16)} color={colors.tint} style={styles.featureIcon} />
                <Text style={[styles.featureText, { color: colors.text, fontFamily }]}>{text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Voluntary mission support */}
        <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, supportCardStyle]}>
          <View style={styles.cardHeader}>
            <Ionicons name="heart" size={size(24)} color="#DC2626" />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: size(18), fontFamily, marginLeft: 8 }]}>
              Support the Work
            </Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.text, fontSize: size(15), fontFamily }]}>
            Present Truth Mission Support helps with server costs, app maintenance, content infrastructure, development, and future improvements.
          </Text>
          <Text style={[styles.bodyText, { color: colors.mutedText, fontSize: size(13), fontFamily }]}>
            This is completely voluntary and does not unlock or restrict any Advent Pro feature or content.
          </Text>

          <View style={styles.donationOptions}>
            <Pressable onPress={openDonatePage} style={styles.donationButton}>
              <Ionicons name="heart-outline" size={size(24)} color={colors.tint} />
              <View style={styles.donationButtonTextContainer}>
                <Text style={[styles.donationButtonTitle, { color: colors.text, fontFamily }]}>Proceed to Support</Text>
                <Text style={[styles.donationButtonDesc, { color: colors.mutedText, fontFamily }]}>Give any amount from KES 20 through Paystack</Text>
              </View>
              <Ionicons name="chevron-forward" size={size(20)} color={colors.mutedText} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Legal & Policies */}
        <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, legalCardStyle]}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text" size={size(24)} color={colors.tint} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: size(18), fontFamily, marginLeft: 8 }]}>
              Legal & Policies
            </Text>
          </View>
          <View style={styles.linkList}>
            <Link href="/privacy" asChild><Pressable style={[styles.linkItem, { borderColor: colors.border }]}><Text style={[styles.linkText, { color: colors.tint, fontFamily }]}>Privacy Policy</Text></Pressable></Link>
            <Link href="/terms" asChild><Pressable style={[styles.linkItem, { borderColor: colors.border }]}><Text style={[styles.linkText, { color: colors.tint, fontFamily }]}>Terms of Use</Text></Pressable></Link>
          </View>
        </Animated.View>

        {/* Contact */}
        <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, contactCardStyle]}>
          <View style={styles.cardHeader}>
            <Ionicons name="call" size={size(24)} color={colors.tint} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: size(18), fontFamily, marginLeft: 8 }]}>
              Contact & Development Services
            </Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.text, fontSize: size(15), fontFamily, marginBottom: 16 }]}>
            Need help with the app or interested in custom development services? Contact us:
          </Text>

          <View style={styles.contactButtons}>
            <Pressable onPress={handleCall} style={[styles.contactButton, { backgroundColor: colors.primary }]}>
              <Ionicons name="call-outline" size={size(20)} color={colors.onPrimary} />
              <View style={styles.contactButtonTextContainer}>
                <Text style={[styles.contactButtonText, { fontSize: size(14), fontFamily }]}>Call Us</Text>
                <Text style={[styles.contactButtonSubtext, { fontSize: size(12), fontFamily }]}>{CALL_NUMBER}</Text>
              </View>
            </Pressable>

            <Pressable onPress={handleWhatsApp} style={[styles.contactButton, { backgroundColor: whatsappAvailable ? '#25D366' : '#666', marginTop: 12 }]}>
              <Ionicons name="logo-whatsapp" size={size(20)} color="#FFFFFF" />
              <View style={styles.contactButtonTextContainer}>
                <Text style={[styles.contactButtonText, { fontSize: size(14), fontFamily }]}>WhatsApp</Text>
                <Text style={[styles.contactButtonSubtext, { fontSize: size(12), fontFamily }]}>{WHATSAPP_NUMBER}</Text>
              </View>
              {!whatsappAvailable && <View style={styles.webBadge}><Text style={styles.webBadgeText}>Web</Text></View>}
            </Pressable>
          </View>

          <Text style={[styles.developmentNote, { color: colors.mutedText, fontFamily }]}>
            We offer custom app development for churches, ministries, and religious organizations.
          </Text>
        </Animated.View>

        {/* Share */}
        <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, shareCardStyle]}>
          <View style={styles.cardHeader}>
            <Ionicons name="share-social" size={size(24)} color={colors.tint} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: size(18), fontFamily, marginLeft: 8 }]}>
              Share Advent Pro
            </Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.text, fontSize: size(15), fontFamily }]}>
            Share this app with friends and relatives so they can also benefit from offline study resources.
          </Text>
          <Pressable onPress={shareApp} style={styles.shareButton}>
            <Ionicons name="share-outline" size={size(20)} color="#FFFFFF" />
            <Text style={[styles.shareButtonText, { fontSize: size(15), fontFamily, marginLeft: 8 }]}>Share App</Text>
          </Pressable>
        </Animated.View>

        {/* Version */}
        <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, versionCardStyle]}>
          <View style={styles.cardHeader}>
            <Ionicons name="heart-circle" size={size(24)} color="#DC2626" />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: size(18), fontFamily, marginLeft: 8 }]}>
              Thank You!
            </Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.text, fontSize: size(15), fontFamily }]}>
            Thank you for using Advent Pro.
          </Text>

          <View style={styles.versionContainer}>
            <Pressable onPress={handleVersionTap} style={styles.versionTapArea}>
              <Text style={[styles.versionText, { color: colors.mutedText, fontSize: size(13), fontFamily }]}>
                Version {appVersion}
              </Text>
            </Pressable>

            {!adminEnabled && versionTapCount > 0 && (
              <Text style={[styles.adminHintText, { color: colors.mutedText, fontSize: size(12), fontFamily }]}>
                {getRemainingAdminTaps(versionTapCount)} tap(s) away from admin mode
              </Text>
            )}

            {adminEnabled && (
              <Pressable onPress={openAdminDashboard} style={[styles.adminButton, { backgroundColor: colors.primary }]}>
                <Ionicons name="shield-checkmark-outline" size={size(16)} color={colors.onPrimary} />
                <Text style={[styles.adminButtonText, { color: colors.onPrimary, fontSize: size(13), fontFamily }]}>
                  Open Admin Dashboard
                </Text>
              </Pressable>
            )}

            <Text style={[styles.copyrightText, { color: colors.mutedText, fontSize: size(12), fontFamily, marginTop: 8 }]}>
              Copyright {new Date().getFullYear()} Advent Nurutech. All rights reserved.
            </Text>
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

// Styles kept intact but slightly more compact
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  headerCard: {
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    marginBottom: 24,
    marginTop: 40,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  floatingIcons: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  floatingIcon: { position: 'absolute' },
  appName: { fontWeight: "800", letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  nurutechLinks: { alignItems: 'center', marginTop: 8 },
  poweredByContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  poweredBy: { fontWeight: "600", letterSpacing: 0.3 },
  learnMoreContainer: { marginTop: 4 },
  learnMore: { fontWeight: "500", letterSpacing: 0.2 },
  card: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontWeight: "700" },
  bodyText: { lineHeight: 24, marginBottom: 12 },
  featuresList: { marginTop: 8 },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  featureIcon: { marginRight: 10 },
  featureText: { fontSize: 15, lineHeight: 20 },
  donationOptions: { marginTop: 16 },
  donationButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.02)', marginBottom: 20 },
  donationButtonTextContainer: { flex: 1, marginLeft: 12 },
  donationButtonTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  donationButtonDesc: { fontSize: 13 },
  localDonation: { marginTop: 8 },
  localDonationTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  paymentMethod: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  paymentMethodTitle: { fontSize: 15, fontWeight: '600', marginLeft: 8 },
  paymentDetails: { backgroundColor: 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 8, marginBottom: 16 },
  paymentDetail: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  paymentLabel: { fontWeight: '600' },
  linkList: { marginTop: 16, gap: 12 },
  linkItem: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.03)' },
  linkText: { fontWeight: '700', fontSize: 15 },
  contactButtons: { marginTop: 8 },
  contactButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  contactButtonTextContainer: { flex: 1, marginLeft: 12 },
  contactButtonText: { color: '#FFFFFF', fontWeight: "600" },
  contactButtonSubtext: { color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  webBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  webBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  developmentNote: { fontSize: 13, marginTop: 16, fontStyle: 'italic', textAlign: 'center' },
  shareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, marginTop: 20, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  shareButtonText: { color: '#FFFFFF', fontWeight: "600" },
  versionContainer: { marginTop: 20, alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' },
  versionText: { fontWeight: "600" },
  versionTapArea: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  adminHintText: { marginTop: 4, fontWeight: "500" },
  adminButton: { marginTop: 10, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  adminButtonText: { fontWeight: "700" },
  copyrightText: { textAlign: 'center', lineHeight: 18 },
});



