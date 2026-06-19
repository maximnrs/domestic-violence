import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';

import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
export default function CameraEvidenceScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.permissionContainer}>
          <Ionicons
            name="camera-outline"
            size={64}
            color="#1F5857"
          />

          <Text style={styles.permissionTitle}>
            Camera Permission Required
          </Text>

          <Text style={styles.permissionText}>
            Allow access to your camera to capture evidence.
          </Text>

          <Pressable
            onPress={requestPermission}
            style={styles.permissionButton}
          >
            <Text style={styles.permissionButtonText}>
              Grant Permission
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
