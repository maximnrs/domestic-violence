import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, } from "react-native";
import { router } from "expo-router";

import { Activity, BookOpen, Coffee, Dumbbell, Check, ArrowLeft } from "lucide-react-native";

const iconOptions = [
  {
    id: "bloom",
    name: "Bloom",
    icon: Activity,
    color: "#7FA89C",
  },
  {
    id: "journal",
    name: "Journal",
    icon: BookOpen,
    color: "#5E8BBF",
  },
  {
    id: "coffee",
    name: "Coffee Tracker",
    icon: Coffee,
    color: "#C78A52",
  },
  {
    id: "fitness",
    name: "Fitness",
    icon: Dumbbell,
    color: "#8B6CBF",
  },
];

export default function AppearanceScreen() {
  const [selectedIcon, setSelectedIcon] =
    useState("bloom");

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#E7ECEA",
            marginRight: 12,
          }}
        >
          <ArrowLeft
            size={20}
            color="#102120"
          />
        </Pressable>

        <Text
          style={{
            fontSize: 30,
            color: "#102120",
            fontFamily: "Manrope_800ExtraBold",
          }}
        >
        </Text>
      </View>
      <Text style={styles.title}>
        Appearance
      </Text>

      <Text style={styles.subtitle}>
        Discreet App Icon
      </Text>

      <Text style={styles.description}>
        Choose how the app appears on your
        device. This preview simulates the
        selected icon.
      </Text>

      {iconOptions.map((option) => {
        const Icon = option.icon;

        const active =
          selectedIcon === option.id;

        return (
          <Pressable
            key={option.id}
            onPress={() =>
              setSelectedIcon(option.id)
            }
            style={[
              styles.card,
              active && styles.activeCard,
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor:
                    option.color,
                },
              ]}
            >
              <Icon
                size={22}
                color="white"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {option.name}
              </Text>

              <Text style={styles.cardSubtitle}>
                Discreet app icon
              </Text>
            </View>

            {active && (
              <Check
                size={20}
                color="#1F5857"
              />
            )}
          </Pressable>
        );
      })}

      {/* Preview */}

      <View style={styles.previewSection}>
        <Text style={styles.previewTitle}>
          Preview
        </Text>

        {iconOptions
          .filter(
            (x) => x.id === selectedIcon
          )
          .map((option) => {
            const Icon = option.icon;

            return (
              <View
                key={option.id}
                style={styles.previewContainer}
              >
                <View
                  style={[
                    styles.previewIcon,
                    {
                      backgroundColor:
                        option.color,
                    },
                  ]}
                >
                  <Icon
                    size={36}
                    color="white"
                  />
                </View>

                <Text
                  style={styles.previewLabel}
                >
                  {option.name}
                </Text>
              </View>
            );
          })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F7F5",
  },

  content: {
    padding: 24,
    paddingBottom: 120,
  },

  title: {
    fontSize: 30,
    fontFamily: "Manrope_800ExtraBold",
    color: "#102120",
  },

  subtitle: {
    fontSize: 18,
    fontFamily: "Manrope_700Bold",
    color: "#102120",
    marginTop: 24,
  },

  description: {
    fontSize: 14,
    color: "#71807E",
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
  },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7ECEA",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  activeCard: {
    borderColor: "#1F5857",
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  cardTitle: {
    fontSize: 16,
    color: "#102120",
    fontFamily: "Manrope_700Bold",
  },

  cardSubtitle: {
    fontSize: 13,
    color: "#71807E",
    marginTop: 2,
  },

  previewSection: {
    marginTop: 30,
  },

  previewTitle: {
    fontSize: 18,
    fontFamily: "Manrope_700Bold",
    color: "#102120",
    marginBottom: 16,
  },

  previewContainer: {
    alignItems: "center",
  },

  previewIcon: {
    width: 90,
    height: 90,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  previewLabel: {
    marginTop: 10,
    fontSize: 15,
    fontFamily: "Manrope_700Bold",
    color: "#102120",
  },
});