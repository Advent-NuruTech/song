import { Link, Stack, useLocalSearchParams } from "expo-router";
import { ChevronLeft, ExternalLink } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";
import {
  Study,
  getCategoryColor,
  getStudyById
} from "@/src/services/studiesService";

// Enhanced Markdown parser with proper formatting
const renderMarkdownContent = (text: string, colors: any, size: (num: number) => number, fontFamily: string) => {
  if (!text) return null;
  
  const lines = text.split('\n');
  const elements: React.JSX.Element[] = [];
  let inList = false;
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <View key={`list-${elements.length}`} style={styles.listContainer}>
          {listItems.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Text style={styles.listBullet}>•</Text>
              <Text style={[
                styles.listText,
                {
                  color: colors.text,
                  fontSize: size(16),
                  fontFamily,
                  lineHeight: size(28),
                }
              ]}>
                {item.trim()}
              </Text>
            </View>
          ))}
        </View>
      );
      listItems = [];
    }
    inList = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      flushList();
      elements.push(<View key={`space-${i}`} style={styles.paragraphSpacing} />);
      continue;
    }

    // Check for headings
    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <Text
          key={`h2-${i}`}
          style={[
            styles.heading2,
            {
              color: colors.text,
              fontSize: size(24),
              fontFamily,
            }
          ]}
        >
          {line.substring(3)}
        </Text>
      );
    } 
    else if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <Text
          key={`h3-${i}`}
          style={[
            styles.heading3,
            {
              color: colors.text,
              fontSize: size(20),
              fontFamily,
            }
          ]}
        >
          {line.substring(4)}
        </Text>
      );
    }
    // Check for numbered list
    else if (/^\d+\.\s/.test(line)) {
      if (!inList) inList = true;
      listItems.push(line.replace(/^\d+\.\s/, ''));
    }
    // Check for bullet points
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) inList = true;
      listItems.push(line.substring(2));
    }
    // Check for bold text
    else if (line.includes('**')) {
      flushList();
      const parts = line.split('**');
      const boldParts = parts.map((part, index) => {
        if (index % 2 === 1) {
          return (
            <Text key={index} style={[
              styles.boldText,
              {
                color: colors.text,
                fontSize: size(16),
                fontFamily,
              }
            ]}>
              {part}
            </Text>
          );
        }
        return (
          <Text key={index} style={[
            styles.paragraph,
            {
              color: colors.text,
              fontSize: size(16),
              fontFamily,
              lineHeight: size(28),
            }
          ]}>
            {part}
          </Text>
        );
      });
      elements.push(
        <Text key={`bold-${i}`} style={styles.boldContainer}>
          {boldParts}
        </Text>
      );
    }
    // Check for URLs
    else if (/(https?:\/\/[^\s]+)/g.test(line)) {
      flushList();
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = line.split(urlRegex);
      
      const urlElements = parts.map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <Pressable
              key={index}
              onPress={() => Linking.openURL(part)}
              style={[
                styles.linkContainer,
                {
                  backgroundColor: colors.tint + '20',
                  borderColor: colors.tint + '40',
                }
              ]}
            >
              <Text style={[
                styles.linkText,
                {
                  color: colors.tint || '#4285F4',
                  fontSize: size(16),
                  fontFamily,
                }
              ]}>
                {part}
              </Text>
              <ExternalLink size={size(14)} color={colors.tint || '#4285F4'} />
            </Pressable>
          );
        }
        return (
          <Text key={index} style={[
            styles.paragraph,
            {
              color: colors.text,
              fontSize: size(16),
              fontFamily,
              lineHeight: size(28),
            }
          ]}>
            {part}
          </Text>
        );
      });
      
      elements.push(
        <View key={`link-${i}`} style={styles.lineContainer}>
          {urlElements}
        </View>
      );
    }
    // Regular paragraph
    else {
      if (inList) {
        listItems[listItems.length - 1] += ' ' + line;
      } else {
        flushList();
        elements.push(
          <Text
            key={`para-${i}`}
            style={[
              styles.paragraph,
              {
                color: colors.text,
                fontSize: size(16),
                fontFamily,
                lineHeight: size(28),
              }
            ]}
          >
            {line}
          </Text>
        );
      }
    }
  }
  
  flushList(); // Flush any remaining list items
  return elements;
};

export default function StudyDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors, size, fontFamily, darkMode } = useAppTheme();
  const [study, setStudy] = useState<Study | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    let isMounted = true;

    const loadStudy = async () => {
      try {
        if (!id) return;
        
        const data = await getStudyById(id);
        if (isMounted) {
          setStudy(data);
        }
      } catch (error) {
        console.error("Failed to load study:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadStudy();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowHeader(offsetY < 100);
    scrollY.setValue(offsetY);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={darkMode ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />
        <View style={styles.loadingContainer}>
          <Text
            style={[
              styles.loadingText,
              { color: colors.mutedText, fontSize: size(16), fontFamily },
            ]}
          >
            Loading study...
          </Text>
        </View>
      </View>
    );
  }

  if (!study) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={darkMode ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />
        <View style={styles.errorContainer}>
          <Text
            style={[
              styles.errorText,
              { color: colors.mutedText, fontSize: size(16), fontFamily },
            ]}
          >
            Study not found
          </Text>
        </View>
      </View>
    );
  }

  const color = getCategoryColor(study.category);
  const wordCount = study.wordCount || 0;
  const readingTime = Math.ceil(wordCount / 250);

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -200],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80, 100],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          title: study.title 
        }} 
      />
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Animated Header - Disappears on scroll */}
      <Animated.View 
        style={[
          styles.headerContainer, 
          { 
            backgroundColor: colors.card,
            transform: [{ translateY: headerTranslateY }],
            opacity: headerOpacity,
            borderBottomColor: colors.border,
          }
        ]}
      >
        <Link href="/studies" asChild>
          <Pressable style={styles.backButton}>
            <ChevronLeft size={size(24)} color={colors.text} />
          </Pressable>
        </Link>
        
        <View style={styles.headerContent}>
          {/* Category */}
          <View style={styles.categoryRow}>
            <View style={[styles.categoryDot, { backgroundColor: color }]} />
            <Text
              style={[
                styles.categoryText,
                {
                  color: colors.mutedText,
                  fontSize: size(14),
                  fontFamily,
                }
              ]}
            >
              {study.category}
            </Text>
          </View>

          {/* Title */}
          <Text
            style={[
              styles.studyTitle,
              {
                color: colors.text,
                fontSize: size(24),
                fontFamily,
              }
            ]}
            numberOfLines={2}
          >
            {study.title}
          </Text>

          {/* Subtitle */}
          {study.subtitle && (
            <Text
              style={[
                styles.studySubtitle,
                {
                  color: colors.mutedText,
                  fontSize: size(16),
                  fontFamily,
                }
              ]}
              numberOfLines={2}
            >
              {study.subtitle}
            </Text>
          )}
        </View>
      </Animated.View>

      {/* Content with scroll handling */}
      <ScrollView 
        ref={scrollViewRef}
        style={[styles.scrollContainer, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Study Content with proper Markdown rendering */}
        <View style={styles.content}>
          {renderMarkdownContent(study.content, colors, size, fontFamily)}
          
          {/* Metadata at the end */}
          <View style={[
            styles.footerMetadata,
            { borderTopColor: colors.border }
          ]}>
            {study.author && (
              <Text
                style={[
                  styles.author,
                  {
                    color: colors.text,
                    fontSize: size(14),
                    fontFamily,
                  }
                ]}
              >
                By {study.author}
              </Text>
            )}
            
            {(wordCount > 0 || readingTime > 0) && (
              <Text
                style={[
                  styles.stats,
                  {
                    color: colors.subtleText,
                    fontSize: size(13),
                    fontFamily,
                  }
                ]}
              >
                {readingTime > 0 && `${readingTime} min read`}
                {wordCount > 0 && readingTime > 0 && ' • '}
                {wordCount > 0 && `${wordCount.toLocaleString()} words`}
              </Text>
            )}
          </View>

          {/* Last Updated */}
          <View style={styles.footer}>
            <Text
              style={[
                styles.footerText,
                {
                  color: colors.mutedText,
                  fontSize: size(12),
                  fontFamily,
                }
              ]}
            >
              Last updated: {new Date(study.updatedAt || study.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating back button when header is hidden */}
      {!showHeader && (
        <Link href="/studies" asChild>
          <Pressable style={[
            styles.floatingBackButton,
            { 
              backgroundColor: colors.card, 
              borderColor: colors.border,
              shadowColor: darkMode ? '#000' : '#000',
            }
          ]}>
            <ChevronLeft size={size(20)} color={colors.text} />
            <Text style={[
              styles.floatingBackText,
              { color: colors.text, fontSize: size(14), fontFamily }
            ]}>
              Back
            </Text>
          </Pressable>
        </Link>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 100 : 80,
  },
  loadingText: {
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 100 : 80,
  },
  errorText: {
    fontWeight: "500",
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: Platform.OS === "ios" ? 90 : 70,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: Platform.OS === "ios" ? 90 : 70,
    zIndex: 1,
    padding: 8,
  },
  headerContent: {
    alignItems: "center",
    marginTop: 8,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryText: {
    fontWeight: "600",
  },
  studyTitle: {
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 30,
  },
  studySubtitle: {
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "500",
    marginBottom: 16,
  },
  metadata: {
    alignItems: "center",
    gap: 6,
  },
  author: {
    fontWeight: "500",
  },
  stats: {
    fontWeight: "500",
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: Platform.OS === "ios" ? 200 : 250, // Space for header
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  content: {
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  heading2: {
    fontWeight: "700",
    marginTop: 32,
    marginBottom: 16,
    lineHeight: 32,
  },
  heading3: {
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 12,
    lineHeight: 26,
  },
  paragraph: {
    marginBottom: 20,
    textAlign: "justify",
  },
  paragraphSpacing: {
    height: 16,
  },
  boldContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  boldText: {
    fontWeight: "700",
    textAlign: "justify",
  },
  listContainer: {
    marginBottom: 20,
    marginLeft: 8,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  listBullet: {
    width: 24,
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  listText: {
    flex: 1,
    textAlign: "justify",
  },
  lineContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 20,
  },
  linkContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginVertical: 4,
    borderWidth: 1,
  },
  linkText: {
    textDecorationLine: "underline",
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  linkIcon: {
    marginLeft: 8,
  },
  footerMetadata: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  footer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    alignItems: "center",
  },
  footerText: {
    fontWeight: "500",
  },
  floatingBackButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: 80,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 200,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingBackText: {
    fontWeight: "600",
    marginLeft: 4,
  },
});