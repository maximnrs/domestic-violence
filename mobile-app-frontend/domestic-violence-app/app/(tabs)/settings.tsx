import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { User, Settings, Bell, Star, Lock, Globe, Info, Heart, } from "lucide-react-native";
import { router } from "expo-router";
import { Colors } from "../../constants/theme";

import SettingsRow from "../../components/settingsrow";
import { getCurrentUser } from "../../services/api";

export default function SettingsScreen() {
  const [profileName, setProfileName] = useState("Loading...");
  const [profileEmail, setProfileEmail] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUser();
        setProfileName(`${user.first_name} ${user.last_name}`.trim());
        setProfileEmail(user.email);
      } catch (error) {
        console.error("Failed to load user:", error);
        setProfileName("Profile unavailable");
        setProfileEmail("");
      }
    }

    loadUser();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}

        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          Manage your experience.
        </Text>

        {/* Profile */}

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person-outline" size={22} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>
              {profileName}
            </Text>

            {profileEmail ? (
              <Text style={styles.profileEmail}>
                {profileEmail}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Preferences */}

        <Text style={styles.sectionTitle}>
          Preferences
        </Text>

        <View style={styles.section}>
          <SettingsRow
            label="General"
            icon={<Ionicons name="settings-outline" size={18} color="#7FA89C" />}
          />

          <SettingsRow
            label="Notifications"
            icon={<Ionicons name="notifications-outline" size={18} color="#5E8BBF" />}
          />

          <SettingsRow
            label="Appearance"
            icon={<Star size={18} color={Colors.warning} />}
            onPress={() => router.push("/appearance")}
          />
        </View>

        {/* Privacy */}

        <Text style={styles.sectionTitle}>
          Privacy
        </Text>

        <View style={styles.section}>
          <SettingsRow
            label="Privacy Settings"
            icon={<Ionicons name="lock-closed-outline" size={18} color="#9AA3A3" />}
          />

          <SettingsRow
            label="Data & Storage"
            icon={<Ionicons name="globe-outline" size={18} color="#9AA3A3" />}
          />
        </View>

        {/* About */}

        <Text style={styles.sectionTitle}>
          About
        </Text>

        <View style={styles.section}>
          <SettingsRow
            label="App Info"
            value="v1.0"
            icon={<Ionicons name="information-circle-outline" size={18} color="#9AA3A3" />}
          />

          <SettingsRow
            label="Help Center"
            icon={<Ionicons name="heart-outline" size={18} color="#C9666B" />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F7F5",
  },

  content: {
    padding: 24,
    paddingBottom: 110,
  },

  title: {
    color: "#102120",
    fontFamily: "Manrope_800ExtraBold",
    fontSize: 30,
  },

  subtitle: {
    color: "#71807E",
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    marginTop: 6,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#FFFFFF",

    borderColor: "#E7ECEA",
    borderWidth: 1,

    borderRadius: 14,

    padding: 16,

    marginTop: 26,
  },

  avatar: {
    width: 52,
    height: 52,

    borderRadius: 26,

    backgroundColor: "#7FA89C",

    justifyContent: "center",
    alignItems: "center",

    marginRight: 14,
  },

  profileName: {
    color: "#102120",
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
  },

  profileEmail: {
    color: "#71807E",
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    marginTop: 2,
  },

  sectionTitle: {
    color: "#71807E",

    fontFamily: "Manrope_700Bold",

    fontSize: 12,

    letterSpacing: 1,

    textTransform: "uppercase",

    marginTop: 28,
    marginBottom: 10,
  },

  section: {
    backgroundColor: "#FFFFFF",

    borderColor: "#E7ECEA",
    borderWidth: 1,

    borderRadius: 14,

    overflow: "hidden",
  },
});
