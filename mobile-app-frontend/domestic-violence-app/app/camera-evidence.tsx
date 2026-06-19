import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { VideoView, useVideoPlayer } from 'expo-video';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

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

import { IncidentPicker } from '@/components/evidence/IncidentPicker';
import { useEvidenceCaptureContext } from '@/hooks/use-evidence-capture-context';
import { uploadEvidence } from '@/services/api';

const CAMERA_EVIDENCE_TYPE_NAME = 'video';

function fileNameFromTimestamp(kind: 'photo' | 'video', timestamp: string, uri: string) {
  const fallbackExtension = kind === 'photo' ? 'jpg' : 'mp4';
  const uriPath = uri.split('?')[0] ?? '';
  const lastSegment = uriPath.split('/').pop() ?? '';
  const extension = lastSegment.includes('.') ? lastSegment.split('.').pop()?.toLowerCase() : null;
  return `camera-${kind}-${timestamp.replace(/[:.]/g, '-')}.${extension || fallbackExtension}`;
}

function mediaMimeType(kind: 'photo' | 'video', uri: string) {
  const lowerUri = uri.toLowerCase().split('?')[0];

  if (kind === 'photo') {
    if (lowerUri.endsWith('.png')) {
      return 'image/png';
    }

    if (lowerUri.endsWith('.heic') || lowerUri.endsWith('.heif')) {
      return 'image/heic';
    }

    return 'image/jpeg';
  }

  if (lowerUri.endsWith('.mov')) {
    return 'video/quicktime';
  }

  if (lowerUri.endsWith('.webm')) {
    return 'video/webm';
  }

  return 'video/mp4';
}

export default function CameraEvidenceScreen() {
  const cameraRef = useRef<CameraView>(null);
  const {
    contextError,
    handleCreateIncident: createIncidentForEvidence,
    incidentError,
    incidents,
    isContextLoading,
    isCreatingIncident,
    isIncidentLoading,
    loadContext,
    newIncidentDate,
    newIncidentDescription,
    newIncidentLocation,
    newIncidentTime,
    newIncidentType,
    refreshEvidenceTypes,
    resolveEvidenceTypeId,
    selectedIncident,
    selectedIncidentId,
    selectIncident,
    setIncidentError,
    setNewIncidentDate,
    setNewIncidentDescription,
    setNewIncidentLocation,
    setNewIncidentTime,
    setNewIncidentType,
    showCreateIncident,
    toggleCreateIncident,
    typeError,
  } = useEvidenceCaptureContext();

  const [permission, requestPermission] = useCameraPermissions();

  const [mode, setMode] = useState<'photo' | 'video'>('photo');

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const [contextText, setContextText] = useState('');
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [cameraReady, setCameraReady] = useState(false);

  const player = useVideoPlayer(videoUri ?? '', (player) => {
    player.loop = false;
  });

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  async function handleCapture() {
    if (!cameraRef.current || !cameraReady) {
      return;
    }

    setCaptureError(null);
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      if (mode === 'photo') {
        setIsCapturing(true);

        const photo = await cameraRef.current.takePictureAsync();

        if (photo?.uri) {
          setPhotoUri(photo.uri);
          setVideoUri(null);
          setCapturedAt(new Date().toISOString());
        }
      } else {
        await startRecording();
      }
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : 'Unable to capture evidence.');
    } finally {
      setIsCapturing(false);
    }
  }

  async function startRecording() {
    if (!cameraRef.current || !cameraReady) {
      return;
    }

    try {
      setIsRecording(true);
      setCaptureError(null);
      setSubmitError(null);
      setSuccessMessage(null);

      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
      });

      if (video?.uri) {
        setVideoUri(video.uri);
        setPhotoUri(null);
        setCapturedAt(new Date().toISOString());
      }
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : 'Unable to record video.');
    } finally {
      setIsRecording(false);
    }
  }

  function stopRecording() {
    if (!cameraRef.current) return;

    cameraRef.current.stopRecording();
  }

  function retake() {
    setPhotoUri(null);
    setVideoUri(null);
    setCapturedAt(null);
    setSubmitError(null);
    setSuccessMessage(null);
  }

  async function handleCreateIncident() {
    setSuccessMessage(null);
    const createdIncident = await createIncidentForEvidence();
    if (createdIncident) {
      setSuccessMessage('Incident ready. Your camera evidence is still here.');
    }
  }

  async function resolveCameraEvidenceTypeId() {
    return resolveEvidenceTypeId(CAMERA_EVIDENCE_TYPE_NAME, 'Camera');
  }

  async function handleSubmit() {
    setSubmitError(null);
    setSuccessMessage(null);

    if (isRecording) {
      setSubmitError('Stop the recording before saving it.');
      return;
    }

    const fileUri = photoUri ?? videoUri;
    const fileKind = photoUri ? 'photo' : videoUri ? 'video' : null;

    if (!fileUri || !fileKind) {
      setSubmitError('Capture a photo or video before saving.');
      return;
    }

    if (!selectedIncidentId) {
      setSubmitError('Select or create an incident before saving the evidence.');
      return;
    }

    try {
      setIsSubmitting(true);

      const evidenceTypeId = await resolveCameraEvidenceTypeId();
      const captureTimestamp = capturedAt ?? new Date().toISOString();
      const trimmedContext = contextText.trim();

      await uploadEvidence({
        incident_id: selectedIncidentId,
        evidence_type_id: evidenceTypeId,
        file: {
          uri: fileUri,
          name: fileNameFromTimestamp(fileKind, captureTimestamp, fileUri),
          type: mediaMimeType(fileKind, fileUri),
        },
        description: trimmedContext.length > 0 ? trimmedContext : null,
        evidence_activation: 'in_app_camera',
        evidence_device: `${Platform.OS} camera`,
      });

      setSuccessMessage('Camera evidence saved.');
      setContextText('');
      setPhotoUri(null);
      setVideoUri(null);
      setCapturedAt(null);
      setTimeout(() => {
        router.replace(`/incidents/${selectedIncidentId}?refresh=${Date.now()}` as Href);
      }, 550);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save camera evidence.');
    } finally {
      setIsSubmitting(false);
    }
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

  const hasMedia = !!photoUri || !!videoUri;

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

          {!hasMedia ? (
            <View style={styles.cameraCard}>

              <Text style={styles.eyebrow}>
                CAMERA
              </Text>

              <View style={styles.modeSwitcher}>

                <Pressable
                  onPress={() => setMode('photo')}
                  style={[
                    styles.modeButton,
                    mode === 'photo' && styles.modeButtonActive,
                  ]}
                >
                  <Ionicons
                    name="camera"
                    size={16}
                    color={mode === 'photo' ? '#FFFFFF' : '#1F5857'}
                  />

                  <Text
                    style={[
                      styles.modeText,
                      mode === 'photo' && styles.modeTextActive,
                    ]}
                  >
                    Photo
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setMode('video')}
                  style={[
                    styles.modeButton,
                    mode === 'video' && styles.modeButtonActive,
                  ]}
                >
                  <Ionicons
                    name="videocam"
                    size={16}
                    color={mode === 'video' ? '#FFFFFF' : '#1F5857'}
                  />

                  <Text
                    style={[
                      styles.modeText,
                      mode === 'video' && styles.modeTextActive,
                    ]}
                  >
                    Video
                  </Text>
                </Pressable>

              </View>

              <View style={styles.cameraWrapper}>
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing="back"
                  mode={mode === 'photo' ? 'picture' : 'video'}
                  onCameraReady={() => {
                    setCameraReady(true);
                  }}
                />
              </View>

              {!isRecording ? (
                <Pressable
                  disabled={isCapturing || !cameraReady}
                  onPress={handleCapture}
                  style={styles.captureButton}
                >
                  {isCapturing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name={mode === 'photo' ? 'camera' : 'videocam'}
                        size={18}
                        color="#FFFFFF"
                      />

                      <Text style={styles.captureButtonText}>
                        {!cameraReady
                          ? 'Preparing Camera...'
                          : mode === 'photo'
                          ? 'Capture Photo'
                          : 'Start Recording'}
                      </Text>
                    </>
                  )}
                </Pressable>
              ) : (
                <Pressable
                  onPress={stopRecording}
                  style={styles.stopButton}
                >
                  <Ionicons
                    name="stop"
                    size={18}
                    color="#FFFFFF"
                  />

                  <Text style={styles.captureButtonText}>
                    Stop Recording
                  </Text>
                </Pressable>
              )}

            </View>
          ) : (

            <View style={styles.previewCard}>

              <Text style={styles.eyebrow}>
                {photoUri ? 'PHOTO PREVIEW' : 'VIDEO PREVIEW'}
              </Text>


              {photoUri && (
                <Image
                  source={{ uri: photoUri }}
                  style={styles.previewImage}
                />
              )}

              {videoUri && (
                <VideoView
                  player={player}
                  style={styles.previewImage}
                  nativeControls
                />
              )}

              <Pressable
                onPress={retake}
                style={styles.secondaryButton}
              >
                <Ionicons
                  name="refresh"
                  size={18}
                  color="#1F5857"
                />

                <Text style={styles.secondaryButtonText}>
                  Retake
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
              placeholder="Add optional context..."
              placeholderTextColor="#9BA6A4"
              style={styles.contextInput}
            />
          </View>

          {captureError ? (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              {captureError}
            </Text>
          ) : null}

          <IncidentPicker
            contextError={contextError}
            incidentError={incidentError}
            incidents={incidents}
            isContextLoading={isContextLoading}
            isCreatingIncident={isCreatingIncident}
            isIncidentLoading={isIncidentLoading}
            loadContext={loadContext}
            newIncidentDate={newIncidentDate}
            newIncidentDescription={newIncidentDescription}
            newIncidentLocation={newIncidentLocation}
            newIncidentTime={newIncidentTime}
            newIncidentType={newIncidentType}
            onCreateIncident={handleCreateIncident}
            onIncidentSelected={() => setSubmitError(null)}
            refreshEvidenceTypes={refreshEvidenceTypes}
            selectedIncident={selectedIncident}
            selectedIncidentId={selectedIncidentId}
            selectIncident={selectIncident}
            setIncidentError={setIncidentError}
            setNewIncidentDate={setNewIncidentDate}
            setNewIncidentDescription={setNewIncidentDescription}
            setNewIncidentLocation={setNewIncidentLocation}
            setNewIncidentTime={setNewIncidentTime}
            setNewIncidentType={setNewIncidentType}
            showCreateIncident={showCreateIncident}
            toggleCreateIncident={toggleCreateIncident}
            typeError={typeError}
          />

          {submitError ? (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              {submitError}
            </Text>
          ) : null}

          {successMessage ? (
            <Text accessibilityLiveRegion="polite" style={styles.successText}>
              {successMessage}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={handleSubmit}
            style={[styles.saveButton, isSubmitting ? styles.buttonDisabled : null]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="cloud-upload-outline"
                  size={18}
                  color="#FFFFFF"
                />

                <Text style={styles.saveButtonText}>
                  Save Evidence
                </Text>
              </>
            )}
          </Pressable>

          {capturedAt ? (
            <View style={styles.metadataPanel}>
              <Text style={styles.metadataLabel}>
                Captured automatically
              </Text>

              <Text style={styles.metadataValue}>
                {capturedAt}
              </Text>
            </View>
          ) : null}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  screen:{
    flex:1,
    backgroundColor:'#F5F7F5'
  },

  keyboardView:{
    flex:1
  },

  content:{
    padding:24,
    paddingBottom:110
  },

  topRow:{
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between'
  },

  backButton:{
    width:38,
    height:38,
    borderRadius:19,
    backgroundColor:'#EAF3F1',
    alignItems:'center',
    justifyContent:'center'
  },

  topTitle:{
    color:'#102120',
    fontFamily:'Manrope_800ExtraBold',
    fontSize:17
  },

  topSpacer:{
    width:38
  },

  cameraCard:{
    marginTop:24,
    padding:18,
    borderRadius:14,
    borderWidth:1,
    borderColor:'#E7ECEA',
    backgroundColor:'#FFFFFF'
  },

  eyebrow:{
    color:'#8D9998',
    fontFamily:'Manrope_800ExtraBold',
    fontSize:12,
    letterSpacing:1
  },

  modeSwitcher:{
    flexDirection:'row',
    gap:10,
    marginTop:14
  },

  modeButton:{
    flexDirection:'row',
    gap:6,
    paddingHorizontal:14,
    paddingVertical:8,
    borderRadius:12,
    backgroundColor:'#EAF3F1'
  },

  modeButtonActive:{
    backgroundColor:'#1F5857'
  },

  modeText:{
    color:'#1F5857',
    fontFamily:'Manrope_800ExtraBold'
  },

  modeTextActive:{
    color:'#FFFFFF'
  },

  cameraWrapper:{
    overflow:'hidden',
    borderRadius:12,
    marginTop:12,
    height:380
  },

  camera:{
    flex:1
  },

  captureButton:{
    marginTop:16,
    height:50,
    borderRadius:14,
    backgroundColor:'#1F5857',
    alignItems:'center',
    justifyContent:'center',
    flexDirection:'row',
    gap:8
  },

  stopButton:{
    marginTop:16,
    height:50,
    borderRadius:14,
    backgroundColor:'#B3261E',
    alignItems:'center',
    justifyContent:'center',
    flexDirection:'row',
    gap:8
  },

  captureButtonText:{
    color:'#FFFFFF',
    fontFamily:'Manrope_800ExtraBold'
  },

  previewCard:{
    marginTop:24,
    padding:18,
    borderRadius:14,
    backgroundColor:'#FFFFFF'
  },

  previewImage:{
    width:'100%',
    height:380,
    borderRadius:12,
    marginTop:12
  },

  secondaryButton:{
    marginTop:14,
    height:48,
    borderRadius:14,
    backgroundColor:'#EAF3F1',
    alignItems:'center',
    justifyContent:'center',
    flexDirection:'row',
    gap:8
  },

  secondaryButtonText:{
    color:'#1F5857',
    fontFamily:'Manrope_800ExtraBold'
  },

  contextCard:{
    marginTop:16,
    padding:18,
    borderRadius:14,
    backgroundColor:'#FFFFFF'
  },

  contextInput:{
    marginTop:12,
    minHeight:120,
    fontFamily:'Manrope_500Medium',
    color:'#102120'
  },

  saveButton:{
    marginTop:18,
    height:54,
    borderRadius:16,
    backgroundColor:'#1F5857',
    alignItems:'center',
    justifyContent:'center',
    flexDirection:'row',
    gap:8
  },

  saveButtonText:{
    color:'#FFFFFF',
    fontFamily:'Manrope_800ExtraBold'
  },

  buttonDisabled:{
    opacity:0.64
  },

  errorText:{
    color:'#B84E58',
    fontFamily:'Manrope_700Bold',
    fontSize:13,
    lineHeight:19,
    marginTop:14
  },

  successText:{
    color:'#1F5857',
    fontFamily:'Manrope_800ExtraBold',
    fontSize:13,
    lineHeight:19,
    marginTop:14
  },

  metadataPanel:{
    backgroundColor:'#F8FAF9',
    borderColor:'#E0E7E5',
    borderRadius:12,
    borderWidth:1,
    marginTop:15,
    padding:12
  },

  metadataLabel:{
    color:'#8D9998',
    fontFamily:'Manrope_700Bold',
    fontSize:12
  },

  metadataValue:{
    color:'#102120',
    fontFamily:'Manrope_600SemiBold',
    fontSize:13,
    lineHeight:19,
    marginTop:4
  },

  permissionContainer:{
    flex:1,
    justifyContent:'center',
    alignItems:'center',
    padding:24
  },

  permissionTitle:{
    marginTop:16,
    fontSize:22,
    fontFamily:'Manrope_800ExtraBold',
    color:'#102120'
  },

  permissionText:{
    marginTop:8,
    textAlign:'center',
    color:'#71807E'
  },

  permissionButton:{
    marginTop:24,
    backgroundColor:'#1F5857',
    paddingHorizontal:24,
    paddingVertical:14,
    borderRadius:14
  },

  permissionButtonText:{
    color:'#FFFFFF',
    fontFamily:'Manrope_800ExtraBold'
  }

});
