import { useAppTheme } from "@/hooks/use-app-theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring
} from "react-native-reanimated";

const NURUTECH_URL = "https://adventnurutech.xyz";
const DONATE_PAGE_URL = "https://adventnurutech.xyz/donate";
const NURUTECH_ABOUT_URL = "https://adventnurutech.xyz/about";
const APP_VERSION = "1.0.0"; // Replace with actual version


const PLAYSTORE_URL = "https://play.google.com/store/apps/details?id=com.adventpro";
const APPSTORE_URL = "https://apps.apple.com/app/advent-pro/id000000000";


const CALL_NUMBER = "+254759167209"; 
const WHATSAPP_NUMBER = "+254105178685"; 
const WHATSAPP_MESSAGE = "Hello, I'm using Advent Pro app and would like to get in touch.";

export default function AboutScreen() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const [whatsappAvailable, setWhatsappAvailable] = useState(true);
  
  // Animation values
  const scrollY = useSharedValue(0);
  const headerOpacity = useSharedValue(1);
  const cardsAnim = [
    useSharedValue(0), // header card
    useSharedValue(0), // about nurutech card
    useSharedValue(0), // about app card
    useSharedValue(0), // features card
    useSharedValue(0), // support card
    useSharedValue(0), // contact card
    useSharedValue(0), // share card
    useSharedValue(0), // version card
  ];

  const openNurutech = () => Linking.openURL(NURUTECH_URL);
  const openDonatePage = () => Linking.openURL(DONATE_PAGE_URL);
  const openNurutechAbout = () => Linking.openURL(NURUTECH_ABOUT_URL);

  const handleCall = () => {
    Linking.openURL(`tel:${CALL_NUMBER}`);
  };

  const handleWhatsApp = async () => {
    const encodedMessage = encodeURIComponent(WHATSAPP_MESSAGE);
    const whatsappUrl = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encodedMessage}`;
    const webWhatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    
    try {
    
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // If WhatsApp app is not installed, open web WhatsApp
        setWhatsappAvailable(false);
        Alert.alert(
          "WhatsApp Not Installed",
          "Would you like to open WhatsApp Web instead?",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Open WhatsApp Web", 
              onPress: () => Linking.openURL(webWhatsappUrl) 
            }
          ]
        );
      }
    } catch (error) {
      console.error("Error opening WhatsApp:", error);
      Alert.alert(
        "Error",
        "Unable to open WhatsApp. Please make sure WhatsApp is installed or try the web version.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Open WhatsApp Web", 
            onPress: () => Linking.openURL(webWhatsappUrl) 
          }
        ]
      );
    }
  };

  const shareApp = async () => {
    try {
      await Share.share({
        message:
          "🎵 Discover all types of useful study  guides, songs and hymns Advent Pro! 📖\n\n" +
          "A comprehensive offline resource for spiritual growth with:\n" +
          "• 500+ hymns with lyrics\n" +
          "• Bible study topics\n" +
          "• Daily devotionals\n" +
          "• All available OFFLINE\n\n" +
          "Download now:\n" +
          "Android: " + PLAYSTORE_URL + "\n" +
          "iOS: " + APPSTORE_URL + "\n\n" +
          "Powered by Advent Nurutech",
        title: "Advent Pro - health and truth"
      });
    } catch (error) {
      console.error("Error sharing app:", error);
    }
  };

  // Initialize animations on mount
  useEffect(() => {
    const animateCards = () => {
      cardsAnim.forEach((anim, index) => {
        anim.value = withDelay(
          index * 100, // Staggered delay
          withSpring(1, {
            damping: 12,
            stiffness: 100,
          })
        );
      });
    };

    animateCards();
  }, []);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      
      // Header fade out on scroll
      headerOpacity.value = interpolate(
        event.contentOffset.y,
        [0, 100],
        [1, 0],
        Extrapolate.CLAMP
      );
    },
  });

  // Animated styles for header
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, 100],
          [0, -20],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  // Animated styles for cards
  const createCardAnimation = (index: number) => useAnimatedStyle(() => ({
    opacity: cardsAnim[index].value,
    transform: [
      {
        translateY: interpolate(
          cardsAnim[index].value,
          [0, 1],
          [50, 0],
          Extrapolate.CLAMP
        ),
      },
      {
        scale: interpolate(
          cardsAnim[index].value,
          [0, 1],
          [0.9, 1],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  // Floating icon animations
  const floatingIconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, 50, 100],
          [0, -10, -20],
          Extrapolate.CLAMP
        ),
      },
    ],
    opacity: interpolate(
      scrollY.value,
      [0, 100],
      [1, 0.8],
      Extrapolate.CLAMP
    ),
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Header with flying animation */}
        <Animated.View
          style={[
            styles.headerCard,
            {
              backgroundColor: darkMode ? "#0B3D91" : "#0B4AA6",
              shadowColor: "#000",
            },
            headerAnimatedStyle,
            createCardAnimation(0),
          ]}
        >
          {/* Floating icons */}
          <Animated.View style={[styles.floatingIcons, floatingIconStyle]}>
            <Ionicons name="book" size={size(32)} color="rgba(255,255,255,0.3)" style={styles.floatingIcon} />
            <Ionicons name="musical-notes" size={size(28)} color="rgba(255,255,255,0.3)" style={[styles.floatingIcon, { top: 20, left: '60%' }]} />
            <Ionicons name="heart" size={size(24)} color="rgba(255,255,255,0.3)" style={[styles.floatingIcon, { top: 40, left: '20%' }]} />
          </Animated.View>
          
          <Text
            style={[
              styles.appName,
              { color: "#FFFFFF", fontSize: size(28), fontFamily },
            ]}
          >
            Advent Pro
          </Text>

          <View style={styles.nurutechLinks}>
            <Pressable onPress={openNurutech} style={styles.poweredByContainer}>
              <Text
                style={[
                  styles.poweredBy,
                  { color: "rgba(219,234,254,0.95)", fontSize: size(13), fontFamily },
                ]}
              >
                Powered by Advent Nurutech
              </Text>
              <Ionicons name="open-outline" size={size(12)} color="rgba(219,234,254,0.7)" />
            </Pressable>
            
            <Pressable onPress={openNurutechAbout} style={styles.learnMoreContainer}>
              <Text
                style={[
                  styles.learnMore,
                  { color: "rgba(219,234,254,0.85)", fontSize: size(12), fontFamily },
                ]}
              >
                Learn more about Advent Nurutech →
              </Text>
            </Pressable>
          </View>
        </Animated.View>

    {/* About This App */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: darkMode ? "#000" : "#0f172a",
            },
            createCardAnimation(2),
          ]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={size(24)} color={colors.tint} />
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, fontSize: size(18), fontFamily, marginLeft: 8 },
              ]}
            >
              About This App
            </Text>
          </View>

          <Text
            style={[
              styles.bodyText,
              { color: colors.text, fontSize: size(15), fontFamily },
            ]}
          >
            Advent Pro is built to become one of the most useful platforms in the world. 
            A Digital Hub bringing together reformers' resources and collections into one 
            unified platform.
          </Text>

          <Text
            style={[
              styles.bodyText,
              {
                color: colors.text,
                fontSize: size(15),
                fontFamily,
                marginTop: 12,
              },
            ]}
          >
            Our main goal is to provide comprehensive study resources that work
            fully offline, ensuring access anytime and anywhere. Alongside these
            materials, hymns and songs accompany believers, strengthening faith and
            cheering the spiritual journey.
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: darkMode ? "#000" : "#0f172a",
            },
            createCardAnimation(3),
          ]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="checkmark-circle" size={size(24)} color={colors.tint} />
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, fontSize: size(18), fontFamily, marginLeft: 8 },
              ]}
            >
              What You Can Do
            </Text>
          </View>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="search" size={size(16)} color={colors.tint} style={styles.featureIcon} />
              <Text style={[styles.featureText, { color: colors.text, fontFamily }]}>
                Search hymns by title or lyrics
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="folder-open" size={size(16)} color={colors.tint} style={styles.featureIcon} />
              <Text style={[styles.featureText, { color: colors.text, fontFamily }]}>
                Explore studies by topic
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="cloud-offline" size={size(16)} color={colors.tint} style={styles.featureIcon} />
              <Text style={[styles.featureText, { color: colors.text, fontFamily }]}>
                Fully offline access
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Support Development - IMPROVED */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: darkMode ? "#000" : "#0f172a",
            },
            createCardAnimation(4),
          ]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="heart" size={size(24)} color="#DC2626" />
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, fontSize: size(18), fontFamily, marginLeft: 8 },
              ]}
            >
              Support Development
            </Text>
          </View>

          <Text
            style={[
              styles.bodyText,
              { color: colors.text, fontSize: size(15), fontFamily },
            ]}
          >
            Your support helps us maintain, update, and add new features to Advent Pro. 
            All donations go directly towards development costs and server maintenance.
          </Text>

          <View style={styles.donationOptions}>
            <Pressable onPress={openDonatePage} style={styles.donationButton}>
              <Ionicons name="logo-paypal" size={size(24)} color="#0070BA" />
              <View style={styles.donationButtonTextContainer}>
                <Text style={[styles.donationButtonTitle, { color: colors.text, fontFamily }]}>
                  PayPal Donation
                </Text>
                <Text style={[styles.donationButtonDesc, { color: colors.mutedText, fontFamily }]}>
                  One-time or recurring donations
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={size(20)} color={colors.mutedText} />
            </Pressable>

            <View style={styles.localDonation}>
              <Text style={[styles.localDonationTitle, { color: colors.text, fontFamily }]}>
                Local Payment Options (Tanzania)
              </Text>
              
              <View style={styles.paymentMethod}>
                <Ionicons name="phone-portrait" size={size(18)} color={colors.tint} />
                <Text style={[styles.paymentMethodTitle, { color: colors.text, fontFamily }]}>
                  M-Pesa Paybill
                </Text>
              </View>
              <View style={styles.paymentDetails}>
                <Text style={[styles.paymentDetail, { color: colors.mutedText, fontFamily }]}>
                  <Text style={styles.paymentLabel}>Paybill Number:</Text> 522522
                </Text>
                <Text style={[styles.paymentDetail, { color: colors.mutedText, fontFamily }]}>
                  <Text style={styles.paymentLabel}>Account Number:</Text> 1330640322
                </Text>
                <Text style={[styles.paymentDetail, { color: colors.mutedText, fontFamily }]}>
                  <Text style={styles.paymentLabel}>Account Name:</Text> Byron Onyango
                </Text>
              </View>

              
            </View>
          </View>

         
        </Animated.View>

        {/* Contact & Development Services - FIXED WHATSAPP */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: darkMode ? "#000" : "#0f172a",
            },
            createCardAnimation(5),
          ]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="call" size={size(24)} color={colors.tint} />
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, fontSize: size(18), fontFamily, marginLeft: 8 },
              ]}
            >
              Contact & Development Services
            </Text>
          </View>

          <Text
            style={[
              styles.bodyText,
              { color: colors.text, fontSize: size(15), fontFamily, marginBottom: 16 },
            ]}
          >
            Need help with the app or interested in custom development services 
            for your church/organization etc  Contact us:
          </Text>

          <View style={styles.contactButtons}>
            <Pressable onPress={handleCall} style={[styles.contactButton, { backgroundColor: colors.tint }]}>
              <Ionicons name="call-outline" size={size(20)} color="#FFFFFF" />
              <View style={styles.contactButtonTextContainer}>
                <Text style={[styles.contactButtonText, { fontSize: size(14), fontFamily }]}>
                  Call Us
                </Text>
                <Text style={[styles.contactButtonSubtext, { fontSize: size(12), fontFamily }]}>
                  {CALL_NUMBER}
                </Text>
              </View>
            </Pressable>

            <Pressable 
              onPress={handleWhatsApp} 
              style={[
                styles.contactButton, 
                { 
                  backgroundColor: whatsappAvailable ? '#25D366' : '#666',
                  marginTop: 12 
                }
              ]}
            >
              <Ionicons name="logo-whatsapp" size={size(20)} color="#FFFFFF" />
              <View style={styles.contactButtonTextContainer}>
                <Text style={[styles.contactButtonText, { fontSize: size(14), fontFamily }]}>
                  WhatsApp
                </Text>
                <Text style={[styles.contactButtonSubtext, { fontSize: size(12), fontFamily }]}>
                  {WHATSAPP_NUMBER}
                </Text>
              </View>
              {!whatsappAvailable && (
                <View style={styles.webBadge}>
                  <Text style={styles.webBadgeText}>Web</Text>
                </View>
              )}
            </Pressable>
          </View>

          <Text style={[styles.developmentNote, { color: colors.mutedText, fontFamily }]}>
            We offer custom app development for churches, ministries, and religious organizations.
            Contact us for a free consultation.
          </Text>
        </Animated.View>

        {/* Share App */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: darkMode ? "#000" : "#0f172a",
            },
            createCardAnimation(6),
          ]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="share-social" size={size(24)} color={colors.tint} />
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, fontSize: size(18), fontFamily, marginLeft: 8 },
              ]}
            >
              Share Advent Pro
            </Text>
          </View>

          <Text
            style={[
              styles.bodyText,
              { color: colors.text, fontSize: size(15), fontFamily },
            ]}
          >
            Share this app with friends and relatives so they can also benefit
            from offline study resources, hymns and songs.
          </Text>

          <Pressable onPress={shareApp} style={styles.shareButton}>
            <Ionicons name="share-outline" size={size(20)} color="#FFFFFF" />
            <Text
              style={[
                styles.shareButtonText,
                { fontSize: size(15), fontFamily, marginLeft: 8 },
              ]}
            >
              Share App
            </Text>
          </Pressable>
        </Animated.View>



        {/* Version & Thank You */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: darkMode ? "#000" : "#0f172a",
            },
            createCardAnimation(7),
          ]}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="heart-circle" size={size(24)} color="#DC2626" />
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, fontSize: size(18), fontFamily, marginLeft: 8 },
              ]}
            >
              Thank You!
            </Text>
          </View>

          <Text
            style={[
              styles.bodyText,
              { color: colors.text, fontSize: size(15), fontFamily },
            ]}
          >
            Thank you for using Advent Pro. Your support helps us continue developing
            and improving this app to serve the community better.
          </Text>

          <View style={styles.versionContainer}>
            <Text
              style={[
                styles.versionText,
                { color: colors.mutedText, fontSize: size(13), fontFamily },
              ]}
            >
              Version {APP_VERSION}
            </Text>
            <Text
              style={[
                styles.copyrightText,
                { color: colors.mutedText, fontSize: size(12), fontFamily, marginTop: 8 },
              ]}
            >
              © {new Date().getFullYear()} Advent Nurutech. All rights reserved.
            </Text>
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
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
  floatingIcons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingIcon: {
    position: 'absolute',
  },
  appName: {
    fontWeight: "800",
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  nurutechLinks: {
    alignItems: 'center',
    marginTop: 8,
  },
  poweredByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  poweredBy: {
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  learnMoreContainer: {
    marginTop: 4,
  },
  learnMore: {
    fontWeight: "500",
    letterSpacing: 0.2,
  },
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "700",
  },
  bodyText: {
    lineHeight: 24,
    marginBottom: 12,
  },
  nurutechFeatures: {
    marginVertical: 16,
  },
  nurutechFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 6,
  },
  nurutechFeatureText: {
    fontSize: 15,
    lineHeight: 20,
    marginLeft: 10,
  },
  nurutechButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  nurutechButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  featuresList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIcon: {
    marginRight: 10,
  },
  featureText: {
    fontSize: 15,
    lineHeight: 20,
  },
  donationOptions: {
    marginTop: 16,
  },
  donationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    marginBottom: 20,
  },
  donationButtonTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  donationButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  donationButtonDesc: {
    fontSize: 13,
  },
  localDonation: {
    marginTop: 8,
  },
  localDonationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentMethodTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  paymentDetails: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  paymentDetail: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  paymentLabel: {
    fontWeight: '600',
    color: '#333',
  },
  donationNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 16,
    textAlign: 'center',
  },
  contactButtons: {
    marginTop: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contactButtonTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontWeight: "600",
  },
  contactButtonSubtext: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  webBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  webBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  developmentNote: {
    fontSize: 13,
    marginTop: 16,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontWeight: "600",
  },
  versionContainer: {
    marginTop: 20,
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  versionText: {
    fontWeight: "600",
  },
  copyrightText: {
    textAlign: 'center',
    lineHeight: 18,
  },
});