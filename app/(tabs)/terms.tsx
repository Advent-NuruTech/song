import { Stack } from "expo-router";
import { Platform, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useQuickFooter } from "@/src/context/QuickFooterContext";

export default function TermsOfUseScreen() {
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const { reportScroll } = useQuickFooter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onScroll={(e) => reportScroll(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        <Text style={[styles.heading, { color: colors.text, fontSize: size(30), fontFamily }]}>
          Terms of Use
        </Text>

        <Text style={[styles.text, { color: colors.text, fontSize: size(15), fontFamily }]}>
          By using Advent Pro, you agree to these terms. The app is provided for personal study,
          worship, learning, and spiritual growth.
        </Text>

        <Text style={[styles.title, { color: colors.text, fontSize: size(20), fontFamily }]}>
          Content Usage
        </Text>

        <Text style={[styles.text, { color: colors.text, fontSize: size(15), fontFamily }]}>
          Hymns, studies, and other resources are provided for personal use. Please respect original
          authors, ministries, and copyright holders when sharing or redistributing content.
        </Text>

        <Text style={[styles.title, { color: colors.text, fontSize: size(20), fontFamily }]}>
          User Responsibility
        </Text>

        <Text style={[styles.text, { color: colors.text, fontSize: size(15), fontFamily }]}>
          You are responsible for how you use the app and its content. Advent Pro should not replace
          professional, legal, medical, or spiritual counsel.
        </Text>

        <Text style={[styles.title, { color: colors.text, fontSize: size(20), fontFamily }]}>
          Future Updates
        </Text>

        <Text style={[styles.text, { color: colors.text, fontSize: size(15), fontFamily }]}>
          Features, services, and policies may change as Advent Pro grows. Continued use of the app
          after updates means you accept the revised terms.
        </Text>

        <Text style={[styles.title, { color: colors.text, fontSize: size(20), fontFamily }]}>
          Liability
        </Text>

        <Text style={[styles.text, { color: colors.text, fontSize: size(15), fontFamily }]}>
          The app is provided &quot;as is&quot; without guarantees. The developer is not responsible for data
          loss, interruptions, or device-related issues arising from app usage.
        </Text>

        <Text style={[styles.title, { color: colors.text, fontSize: size(40), fontFamily }]}>
          Contact
        </Text>

        <Text
                 style={[
                   styles.paragraph,
                   {
                     color: colors.text,
                     fontSize: size(15),
                     fontFamily,
                   },
                 ]}
               > If you have questions or
          concerns regarding this
          terms and conditions of use , you can
          contact the Advent Pro
          team through the About
          section inside the app.
        
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  content: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 70 : 52,
    paddingBottom: 40,
  },

  heading: {
    fontWeight: "800",
    marginBottom: 18,
  },

  title: {
    fontWeight: "700",
    marginTop: 22,
    marginBottom: 8,
  },

  text: {
    lineHeight: 24,
    marginBottom: 10,
  },

  paragraph: {
    lineHeight: 24,
    marginBottom: 10,
  },
});
