import { View, Text, Pressable } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { Colors } from "../constants/theme";

export default function SettingsRow({
  icon,
  label,
  value,
  onPress,
}: any) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: Colors.border,
      }}
    >
      {icon}

      <Text
        style={{
          flex: 1,
          marginLeft: 12,
          color: Colors.text,
        }}
      >
        {label}
      </Text>

      {value && (
        <Text
          style={{
            color: Colors.muted,
            marginRight: 8,
          }}
        >
          {value}
        </Text>
      )}

      <ChevronRight
        size={16}
        color={Colors.muted}
      />
    </Pressable>
  );
}