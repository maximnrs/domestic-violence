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
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [contextText, setContextText] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);

  async function capturePhoto() {
    if (!cameraRef.current) return;

    try {
      setIsCapturing(true);

      const photo = await cameraRef.current.takePictureAsync();

      if (photo?.uri) {
        setPhotoUri(photo.uri);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsCapturing(false);
    }
  }

  function retakePhoto() {
    setPhotoUri(null);
  }

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

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color="#1F5857"
              />
            </Pressable>

            <Text style={styles.topTitle}>
              Camera Evidence
            </Text>

            <View style={styles.topSpacer} />
          </View>

          {!photoUri ? (
            <View style={styles.cameraCard}>
              <Text style={styles.eyebrow}>
                CAMERA
              </Text>

              <View style={styles.cameraWrapper}>
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing="back"
                />
              </View>

              <Pressable
                disabled={isCapturing}
                onPress={capturePhoto}
                style={styles.captureButton}
              >
                {isCapturing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="camera"
                      size={18}
                      color="#FFFFFF"
                    />

                    <Text style={styles.captureButtonText}>
                      Capture Photo
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.previewCard}>
              <Text style={styles.eyebrow}>
                PHOTO PREVIEW
              </Text>

              <Image
                source={{ uri: photoUri }}
                style={styles.previewImage}
              />

              <Pressable
                onPress={retakePhoto}
                style={styles.secondaryButton}
              >
                <Ionicons
                  name="refresh"
                  size={18}
                  color="#1F5857"
                />

                <Text style={styles.secondaryButtonText}>
                  Retake Photo
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.contextCard}>
            <Text style={styles.eyebrow}>
              CONTEXT
            </Text>

            <TextInput
              multiline
              value={contextText}
              onChangeText={setContextText}
              placeholder="Add optional context for this photo..."
              placeholderTextColor="#9BA6A4"
              style={styles.contextInput}
            />
          </View>

          <Pressable
            style={styles.saveButton}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={18}
              color="#FFFFFF"
            />

            <Text style={styles.saveButtonText}>
              Save Photo
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
