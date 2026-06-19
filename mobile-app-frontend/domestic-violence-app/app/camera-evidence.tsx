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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F7F5',
  },

  keyboardView: {
    flex: 1,
  },

  content: {
    padding: 24,
    paddingBottom: 110,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF3F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  topTitle: {
    color: '#102120',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 17,
  },

  topSpacer: {
    width: 38,
  },

  cameraCard: {
    marginTop: 24,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7ECEA',
    backgroundColor: '#FFFFFF',
  },

  eyebrow: {
    color: '#8D9998',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1,
  },

  cameraWrapper: {
    overflow: 'hidden',
    borderRadius: 12,
    marginTop: 12,
    height: 380,
  },

  camera: {
    flex: 1,
  },

  captureButton: {
    marginTop: 16,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#1F5857',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  captureButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
  },

  previewCard: {
    marginTop: 24,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7ECEA',
    backgroundColor: '#FFFFFF',
  },

  previewImage: {
    width: '100%',
    height: 380,
    borderRadius: 12,
    marginTop: 12,
  },

  secondaryButton: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#EAF3F1',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  secondaryButtonText: {
    color: '#1F5857',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
  },

  contextCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7ECEA',
    backgroundColor: '#FFFFFF',
  },

  contextInput: {
    marginTop: 12,
    minHeight: 120,
    color: '#102120',
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
  },

  saveButton: {
    marginTop: 18,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#1F5857',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
  },

  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  permissionTitle: {
    marginTop: 16,
    fontSize: 22,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#102120',
  },

  permissionText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#71807E',
    fontFamily: 'Manrope_500Medium',
  },

  permissionButton: {
    marginTop: 24,
    backgroundColor: '#1F5857',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },

  permissionButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
  },
});