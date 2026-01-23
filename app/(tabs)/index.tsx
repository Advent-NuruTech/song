import { MaterialIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const languages = [
    { 
      label: "English", 
      code: "en",
      icon: "translate" as const,  // Using valid MaterialIcons names
      color: "#3B82F6",
    },
    { 
      label: "Kiswahili", 
      code: "sw",
      icon: "translate" as const,
      color: "#10B981",
    },
    { 
      label: "Luo", 
      code: "luo",
      icon: "translate" as const,
      color: "#8B5CF6",
    }
  ];

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={[styles.headerGradient, { backgroundColor: "#4F46E5" }]}>
          <View style={styles.headerContent}>
            <MaterialIcons name="library-music" size={50} color="white" />
            <Text style={styles.appTitle}> Advent Pro</Text>
            <Text style={styles.appSubtitle}>Multilingual Hymns & Worship Songs</Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome to Advent Pro</Text>
          <Text style={styles.welcomeText}>
            Select a language to choose the path you want to take. By clicking any of the tab      </Text>
        </View>

      
       

      
       

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
          
            <Link href="/categories" style={styles.actionLink}>
              <View style={styles.actionCard}>
                <MaterialIcons name="category" size={24} color="#3B82F6" />
                <Text style={styles.actionText}>Languages</Text>
              </View>
            </Link>
            <Link href="/search" style={styles.actionLink}>
              <View style={styles.actionCard}>
                <MaterialIcons name="search" size={24} color="#10B981" />
                <Text style={styles.actionText}>Search</Text>
              </View>
            </Link>

              <View style={styles.actionCard}>
                 <MaterialIcons name="bookmark" size={30} color="#f70f0f" />
             <Text style={styles.actionText}>Studies</Text>
              </View>
         

          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    height: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerGradient: {
    flex: 1,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    justifyContent: "center",
  },
  headerContent: {
    alignItems: "center",
    paddingTop: 30,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginTop: 10,
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginTop: 5,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  welcomeSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    color: "#111827",
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "justify",
    lineHeight: 22,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
  },
  languageGrid: {
    gap: 16,
  },
  link: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  languageCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  cardContent: {
    padding: 20,
  },
  cardIcon: {
    marginBottom: 12,
  },
 
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  actionsContainer: {
    paddingHorizontal: 50,
    marginTop: 28,
  },
  actionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
 
   actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginTop: 8,
  },
  


 
 
  actionLink: {
    flex: 1,
  },


});