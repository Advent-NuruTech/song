import { Stack } from "expo-router";
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useQuickFooter } from "@/src/context/QuickFooterContext";

export default function PrivacyPolicyScreen() {
  const {
    colors,
    size,
    fontFamily,
    darkMode,
  } = useAppTheme();

  const { reportScroll } =
    useQuickFooter();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      <Stack.Screen
        options={{
          title: "Privacy Policy",
          headerShown: false,
        }}
      />

      <StatusBar
        barStyle={
          darkMode
            ? "light-content"
            : "dark-content"
        }
        backgroundColor={
          colors.background
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
        onScroll={(event) =>
          reportScroll(
            event.nativeEvent.contentOffset.y
          )
        }
        scrollEventThrottle={16}
      >
        <Text
          style={[
            styles.heading,
            {
              color: colors.text,
              fontSize: size(30),
              fontFamily,
            },
          ]}
        >
          Privacy Policy
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
        >
          Advent Pro is designed
          to work mainly offline
          and store data locally
          on your device for a
          fast and lightweight
          experience.
        </Text>

        <Text
          style={[
            styles.paragraph,
            {
              color:
                colors.mutedText,
              fontSize: size(15),
              fontFamily,
            },
          ]}
        >
          At this stage, the app
          does not collect
          personal information,
          use advertising
          trackers, or share user
          data with third parties.
        </Text>

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
              fontSize: size(20),
              fontFamily,
            },
          ]}
        >
          Local Storage
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
        >
          Songs, studies,
          settings, language
          preferences, dark mode,
          and reading preferences
          may be stored locally on
          your device to improve
          performance and offline
          access.
        </Text>

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
              fontSize: size(20),
              fontFamily,
            },
          ]}
        >
          Future Features
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
        >
          As Advent Pro grows,
          future updates may
          introduce optional
          online features such as
          cloud sync,
          authentication,
          notifications, backups,
          or personalized
          experiences.
        </Text>

        <Text
          style={[
            styles.paragraph,
            {
              color:
                colors.mutedText,
              fontSize: size(15),
              fontFamily,
            },
          ]}
        >
          If data collection or
          online services are
          added in future
          versions, this privacy
          policy will be updated
          clearly before those
          features are expanded.
        </Text>

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
              fontSize: size(20),
              fontFamily,
            },
          ]}
        >
          Permissions
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
        >
          The app only requests
          permissions necessary
          for app functionality
          and system features. It
          does not intentionally
          request unnecessary
          access to sensitive
          device information.
        </Text>

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
              fontSize: size(20),
              fontFamily,
            },
          ]}
        >
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
        >
          If you have questions or
          concerns regarding this
          privacy policy, you can
          contact the Advent Pro
          team through the About
          section inside the app.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 24,
    paddingTop:
      Platform.OS === "ios"
        ? 70
        : 52,
    paddingBottom: 40,
  },

  heading: {
    fontWeight: "800",
    marginBottom: 18,
  },

  sectionTitle: {
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 10,
  },

  paragraph: {
    lineHeight: 25,
    marginBottom: 12,
    fontWeight: "500",
  },
});