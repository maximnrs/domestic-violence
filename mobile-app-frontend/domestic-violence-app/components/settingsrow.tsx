import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
}

export default function SettingsRow({
  icon,
  label,
  value,
  onPress,
}: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 74,
        paddingHorizontal: 16,
        paddingVertical: 16,
      }}
    >
      {/* Icon Circle */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "#EAF3F1",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {icon}
      </View>

      {/* Label */}
      <Text
        style={{
          flex: 1,
          marginLeft: 14,
          color: "#102120",
          fontSize: 16,
          fontFamily: "Manrope_700Bold",
        }}
      >
        {label}
      </Text>

      {/* Optional Value */}
      {value && (
        <Text
          style={{
            color: "#71807E",
            fontSize: 14,
            fontFamily: "Manrope_500Medium",
            marginRight: 8,
          }}
        >
          {value}
        </Text>
      )}

      <Ionicons name="chevron-forward" size={18} color="#B5C0BE" />
    </Pressable>
  );
}
