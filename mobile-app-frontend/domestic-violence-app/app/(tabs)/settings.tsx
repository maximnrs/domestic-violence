import { ScrollView, View, Text, } from "react-native";
import { User, Settings, Bell, Star, Lock, Globe, Info, Heart, } from "lucide-react-native";
import SettingsRow from "../../components/settingsrow";
import { Colors } from "../../constants/theme";

export default function SettingsScreen() {
  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: Colors.background,
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
          padding: 20,
          color: Colors.light.text,
        }}
      >
        Settings
      </Text>

      {/* Profile */}

      <View
        style={{
          backgroundColor: "white",
          marginHorizontal: 16,
          padding: 16,
          borderRadius: 20,
        }}
      >
        <Text
          style={{
            fontWeight: "700",
            fontSize: 16,
          }}
        >
          Sarah M.
        </Text>

        <Text
          style={{
            color: Colors.muted,
          }}
        >
          sarah@email.com
        </Text>
      </View>

      {/* Preferences */}

      <View
        style={{
          backgroundColor: "white",
          margin: 16,
          paddingHorizontal: 16,
          borderRadius: 20,
        }}
      >
        <SettingsRow
          label="General"
          icon={<Settings size={18} color={Colors.secondary} />}
        />

        <SettingsRow
          label="Notifications"
          icon={<Bell size={18} color={Colors.info} />}
        />

        <SettingsRow
          label="Appearance"
          icon={<Star size={18} color={Colors.warning} />}
        />
      </View>

      {/* Privacy */}

      <View
        style={{
          backgroundColor: "white",
          marginHorizontal: 16,
          paddingHorizontal: 16,
          borderRadius: 20,
        }}
      >
        <SettingsRow
          label="Privacy"
          icon={<Lock size={18} color={Colors.muted} />}
        />

        <SettingsRow
          label="Data & Storage"
          icon={<Globe size={18} color={Colors.muted} />}
        />
      </View>

      {/* About */}

      <View
        style={{
          backgroundColor: "white",
          margin: 16,
          paddingHorizontal: 16,
          borderRadius: 20,
        }}
      >
        <SettingsRow
          label="App Info"
          value="v1.0"
          icon={<Info size={18} color={Colors.muted} />}
        />

        <SettingsRow
          label="Help Center"
          icon={<Heart size={18} color={Colors.error} />}
        />
      </View>
    </ScrollView>
  );
}