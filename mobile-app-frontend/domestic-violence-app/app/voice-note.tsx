import { Ionicons } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
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
import { StatusPanel } from '@/components/evidence/StatusPanel';
import { useEvidenceCaptureContext } from '@/hooks/use-evidence-capture-context';
import { uploadEvidence } from '@/services/api';

const VOICE_AUDIO_TYPE_NAME = 'audio';
const recordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  directory: 'document' as const,
  isMeteringEnabled: true,
};

function formatDuration(durationMillis: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMillis / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function fileNameFromTimestamp(timestamp: string) {
  return `voice-note-${timestamp.replace(/[:.]/g, '-')}.m4a`;
}

function audioMimeType(uri: string) {
  if (uri.toLowerCase().endsWith('.webm')) {
    return 'audio/webm';
  }

  if (uri.toLowerCase().endsWith('.3gp')) {
    return 'audio/3gpp';
  }

  return 'audio/mp4';
}

export default function VoiceNoteScreen() {
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

  const audioRecorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(audioRecorder, 250);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingStartedAt, setRecordingStartedAt] = useState<string | null>(null);
  const [recordingStoppedAt, setRecordingStoppedAt] = useState<string | null>(null);
  const [recordingDurationMillis, setRecordingDurationMillis] = useState(0);
  const [contextText, setContextText] = useState('');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPreparingRecording, setIsPreparingRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const hasUnsavedAudio = recorderState.isRecording || recordingUri !== null;
  const hasUnsavedContext = contextText.trim().length > 0;
  const visibleDuration = recorderState.isRecording
    ? recorderState.durationMillis
    : recordingDurationMillis;

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const stopRecording = useCallback(async () => {
    if (!recorderState.isRecording) {
      return;
    }

    setRecordingError(null);

    try {
      await audioRecorder.stop();
      setRecordingUri(audioRecorder.uri ?? recorderState.url ?? null);
      setRecordingDurationMillis(recorderState.durationMillis);
      setRecordingStoppedAt(new Date().toISOString());
    } catch (error) {
      setRecordingError(error instanceof Error ? error.message : 'Unable to stop recording.');
    }
  }, [audioRecorder, recorderState.durationMillis, recorderState.isRecording, recorderState.url]);

  const handleExit = useCallback(() => {
    if (hasUnsavedAudio || hasUnsavedContext) {
      setShowDiscardConfirm(true);
      return;
    }

    router.back();
  }, [hasUnsavedAudio, hasUnsavedContext]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleExit();
      return true;
    });

    return () => subscription.remove();
  }, [handleExit]);

  async function startRecording() {
    setPermissionError(null);
    setRecordingError(null);
    setSubmitError(null);
    setSuccessMessage(null);
    setShowDiscardConfirm(false);

    try {
      setIsPreparingRecording(true);
      const permission = await AudioModule.requestRecordingPermissionsAsync();

      if (!permission.granted) {
        setPermissionError('Microphone permission is required to record a voice note.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      setRecordingUri(null);
      setRecordingDurationMillis(0);
      setRecordingStartedAt(new Date().toISOString());
      setRecordingStoppedAt(null);
      await audioRecorder.prepareToRecordAsync(recordingOptions);
      audioRecorder.record();
    } catch (error) {
      setRecordingError(error instanceof Error ? error.message : 'Unable to start recording.');
    } finally {
      setIsPreparingRecording(false);
    }
  }

  async function handleCreateIncident() {
    setSuccessMessage(null);
    const createdIncident = await createIncidentForEvidence();
    if (createdIncident) {
      setSuccessMessage('Incident ready. Your recording is still here.');
    }
  }

  async function resolveVoiceAudioTypeId() {
    return resolveEvidenceTypeId(VOICE_AUDIO_TYPE_NAME, 'Voice note');
  }

  async function handleSubmit() {
    setSubmitError(null);
    setSuccessMessage(null);

    if (recorderState.isRecording) {
      setSubmitError('Stop the recording before saving it.');
      return;
    }

    if (!recordingUri) {
      setSubmitError('Record a voice note before saving.');
      return;
    }

    if (!selectedIncidentId) {
      setSubmitError('Select or create an incident before saving the recording.');
      return;
    }

    try {
      setIsSubmitting(true);

      console.log("Before resolving evidence type ID for voice audio"); // todo remove later

      const evidenceTypeId = await resolveVoiceAudioTypeId();

      console.log("it works because it is:", evidenceTypeId); // todo remove later
      const capturedAt = recordingStartedAt ?? new Date().toISOString();
      const fileName = fileNameFromTimestamp(capturedAt);
      const trimmedContext = contextText.trim();

      await uploadEvidence({
        incident_id: selectedIncidentId,
        evidence_type_id: evidenceTypeId,
        file: {
          uri: recordingUri,
          name: fileName,
          type: audioMimeType(recordingUri),
        },
        description: trimmedContext.length > 0 ? trimmedContext : null,
        evidence_activation: 'in_app_recording',
        evidence_device: `${Platform.OS} voice recorder`,
      });

      setSuccessMessage('Voice note saved.');
      setContextText('');
      setRecordingUri(null);
      setRecordingStartedAt(null);
      setRecordingStoppedAt(null);
      setRecordingDurationMillis(0);
      setTimeout(() => {
        router.replace(`/incidents/${selectedIncidentId}?refresh=${Date.now()}` as Href);
      }, 550);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save voice note.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function discardAndExit() {
    if (recorderState.isRecording) {
      await stopRecording();
    }

    router.back();
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Pressable
              accessibilityLabel="Close voice note"
              accessibilityRole="button"
              onPress={handleExit}
              style={styles.backButton}>
              <Ionicons name="chevron-back" size={22} color="#1F5857" />
            </Pressable>
            <Text style={styles.topTitle}>Voice Note</Text>
            <View style={styles.topSpacer} />
          </View>

          {showDiscardConfirm ? (
            <View style={styles.discardPanel}>
              <Text style={styles.discardTitle}>Discard this recording?</Text>
              <Text style={styles.discardMessage}>
                Your current audio and context have not been saved as evidence.
              </Text>
              <View style={styles.discardActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowDiscardConfirm(false)}
                  style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Keep editing</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={discardAndExit}
                  style={styles.dangerButton}>
                  <Text style={styles.dangerButtonText}>Discard</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.recordingCard}>
            <Text style={styles.eyebrow}>AUDIO EVIDENCE</Text>
            <View style={styles.recorderCenter}>
              <View style={[styles.micCircle, recorderState.isRecording ? styles.micCircleActive : null]}>
                <Ionicons
                  name={recorderState.isRecording ? 'mic' : 'mic-outline'}
                  size={38}
                  color={recorderState.isRecording ? '#FFFFFF' : '#1F5857'}
                />
              </View>
              <Text style={styles.timerText}>{formatDuration(visibleDuration)}</Text>
              <Text style={styles.recorderStatus}>
                {recorderState.isRecording
                  ? 'Recording'
                  : recordingUri
                    ? 'Recording ready to save'
                    : 'Ready to record'}
              </Text>
            </View>

            <View style={styles.recordingActions}>
              <Pressable
                accessibilityRole="button"
                disabled={isPreparingRecording || recorderState.isRecording}
                onPress={startRecording}
                style={[
                  styles.recordButton,
                  recorderState.isRecording || isPreparingRecording ? styles.buttonDisabled : null,
                ]}>
                {isPreparingRecording ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="radio-button-on-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.recordButtonText}>{recordingUri ? 'Record again' : 'Start'}</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={!recorderState.isRecording}
                onPress={stopRecording}
                style={[
                  styles.stopButton,
                  !recorderState.isRecording ? styles.buttonDisabled : null,
                ]}>
                <Ionicons name="stop" size={17} color="#1F5857" />
                <Text style={styles.stopButtonText}>Stop</Text>
              </Pressable>
            </View>

            {recordingStartedAt ? (
              <View style={styles.metadataPanel}>
                <Text style={styles.metadataLabel}>Captured automatically</Text>
                <Text style={styles.metadataValue}>Started {recordingStartedAt}</Text>
                {recordingStoppedAt ? (
                  <Text style={styles.metadataValue}>Stopped {recordingStoppedAt}</Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.contextCard}>
            <Text style={styles.eyebrow}>CONTEXT</Text>
            <TextInput
              multiline
              onChangeText={(value) => {
                setContextText(value);
                setShowDiscardConfirm(false);
              }}
              placeholder="Add optional context for this recording..."
              placeholderTextColor="#9BA6A4"
              style={styles.contextInput}
              textAlignVertical="top"
              value={contextText}
            />
          </View>

          {permissionError ? (
            <StatusPanel
              actionLabel="Try again"
              icon="mic-off-outline"
              message={permissionError}
              onAction={startRecording}
              title="Microphone unavailable"
            />
          ) : null}

          {recordingError ? (
            <Text accessibilityLiveRegion="polite" style={styles.errorText}>
              {recordingError}
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
            style={[styles.saveButton, isSubmitting ? styles.buttonDisabled : null]}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save voice note</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5F7F5',
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 110,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#EAF3F1',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  topTitle: {
    color: '#102120',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 17,
  },
  topSpacer: {
    width: 38,
  },
  recordingCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 24,
    padding: 18,
  },
  eyebrow: {
    color: '#8D9998',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1,
  },
  recorderCenter: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  micCircle: {
    alignItems: 'center',
    backgroundColor: '#EAF3F1',
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  micCircleActive: {
    backgroundColor: '#B84E58',
  },
  timerText: {
    color: '#081615',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 34,
    marginTop: 18,
  },
  recorderStatus: {
    color: '#71807E',
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    marginTop: 4,
  },
  recordingActions: {
    flexDirection: 'row',
    gap: 10,
  },
  recordButton: {
    alignItems: 'center',
    backgroundColor: '#1F5857',
    borderRadius: 14,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
  },
  stopButton: {
    alignItems: 'center',
    backgroundColor: '#EAF3F1',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  stopButtonText: {
    color: '#1F5857',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
  },
  metadataPanel: {
    backgroundColor: '#F8FAF9',
    borderColor: '#E0E7E5',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 15,
    padding: 12,
  },
  metadataLabel: {
    color: '#8D9998',
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
  },
  metadataValue: {
    color: '#102120',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  contextCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
    padding: 18,
  },
  contextInput: {
    color: '#102120',
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    minHeight: 110,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#1F5857',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 54,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.64,
  },
  errorText: {
    color: '#B84E58',
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
  },
  successText: {
    color: '#1F5857',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
  },
  discardPanel: {
    backgroundColor: '#FFF6F6',
    borderColor: '#F1CDCF',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  discardTitle: {
    color: '#102120',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
  },
  discardMessage: {
    color: '#71807E',
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  discardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  secondaryButton: {
    backgroundColor: '#EAF3F1',
    borderRadius: 13,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#1F5857',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
  },
  dangerButton: {
    backgroundColor: '#B84E58',
    borderRadius: 13,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
  },
});
