import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type StatusPanelProps = {
  actionLabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  onAction?: () => void;
  title: string;
};

export function StatusPanel({ actionLabel, icon, message, onAction, title }: StatusPanelProps) {
  return (
    <View style={styles.statusPanel}>
      <View style={styles.statusIcon}>
        <Ionicons name={icon} size={23} color="#1F5857" />
      </View>
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.statusMessage}>{message}</Text>
      {onAction && actionLabel ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  statusPanel: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
    padding: 20,
  },
  statusIcon: {
    alignItems: 'center',
    backgroundColor: '#EAF3F1',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  statusTitle: {
    color: '#102120',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    marginTop: 11,
    textAlign: 'center',
  },
  statusMessage: {
    color: '#71807E',
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#EAF3F1',
    borderRadius: 13,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#1F5857',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
  },
});
