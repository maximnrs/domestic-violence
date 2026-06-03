import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

type AuthInputProps = TextInputProps & {
  error?: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

export function AuthInput({ error, icon, label, secureTextEntry, style, ...props }: AuthInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const shouldHideValue = secureTextEntry && !isPasswordVisible;

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          isFocused && styles.inputShellFocused,
          error ? styles.inputShellError : null,
        ]}>
        <Ionicons name={icon} size={20} color={isFocused ? '#1F5857' : '#9AA3A3'} />
        <TextInput
          autoCapitalize="none"
          placeholderTextColor="#A9B2B0"
          secureTextEntry={shouldHideValue}
          style={[styles.input, style]}
          onBlur={(event) => {
            setIsFocused(false);
            props.onBlur?.(event);
          }}
          onFocus={(event) => {
            setIsFocused(true);
            props.onFocus?.(event);
          }}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setIsPasswordVisible((current) => !current)}
            style={styles.visibilityButton}>
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#9AA3A3"
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 7,
  },
  label: {
    color: '#374243',
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: '#F7F8F7',
    borderColor: '#E1E7E5',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: 16,
  },
  inputShellFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#7FA89C',
  },
  inputShellError: {
    borderColor: '#C9666B',
  },
  input: {
    color: '#102120',
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    marginLeft: 12,
    paddingVertical: 0,
  },
  visibilityButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    marginLeft: 8,
    width: 36,
  },
  errorText: {
    color: '#C9666B',
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
});
