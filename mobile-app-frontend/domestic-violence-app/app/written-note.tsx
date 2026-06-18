import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
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
import { uploadEvidence } from '@/services/api';
import { useEvidenceCaptureContext } from '@/hooks/use-evidence-capture-context';

const WRITTEN_NOTE_TYPE_NAME = 'written_note';

export default function WrittenNoteScreen() {
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
    setTypeError,
    showCreateIncident,
    toggleCreateIncident,
    typeError,
  } = useEvidenceCaptureContext();
  const [noteText, setNoteText] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const hasUnsavedText = noteText.trim().length > 0;

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const handleExit = useCallback(() => {
    if (hasUnsavedText) {
      setShowDiscardConfirm(true);
      return;
    }

    router.back();
  }, [hasUnsavedText]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleExit();
      return true;
    });

    return () => subscription.remove();
  }, [handleExit]);

  async function resolveWrittenNoteTypeId() {
    return resolveEvidenceTypeId(WRITTEN_NOTE_TYPE_NAME, 'Written note');
  }

  async function handleCreateIncident() {
    setSuccessMessage(null);
    const createdIncident = await createIncidentForEvidence();
    if (createdIncident) {
      setSuccessMessage('Incident ready. Your note is still here.');
    }
  }

  async function handleSubmit() {
    const trimmedNote = noteText.trim();
    let temporaryFileUri: string | null = null;

    setSubmitError(null);
    setSuccessMessage(null);

    if (!trimmedNote) {
      setSubmitError('Write a note before saving.');
      return;
    }

    if (!selectedIncidentId) {
      setSubmitError('Select or create an incident before saving the note.');
      return;
    }

    try {
      setIsSubmitting(true);
      const evidenceTypeId = await resolveWrittenNoteTypeId();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `written-note-${timestamp}.txt`;
      const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;

      if (!baseDirectory) {
        throw new Error('Unable to prepare note file storage.');
      }

      const fileUri = `${baseDirectory}${fileName}`;
      temporaryFileUri = fileUri;
      await FileSystem.writeAsStringAsync(fileUri, noteText, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await uploadEvidence({
        incident_id: selectedIncidentId,
        evidence_type_id: evidenceTypeId,
        file: {
          uri: fileUri,
          name: fileName,
          type: 'text/plain',
        },
      });

      setNoteText('');
      setSuccessMessage('Written note saved.');
      setTimeout(() => {
        router.replace(`/incidents/${selectedIncidentId}?refresh=${Date.now()}` as Href);
      }, 550);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save written note.';
      if (message.includes('configuration')) {
        setTypeError(message);
      }
      setSubmitError(message);
    } finally {
      if (temporaryFileUri) {
        try {
          await FileSystem.deleteAsync(temporaryFileUri, { idempotent: true });
        } catch {
          // The note text remains in memory, so cleanup failure should not block retry.
        }
      }
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Pressable
              accessibilityLabel="Close written note"
              accessibilityRole="button"
              onPress={handleExit}
              style={styles.backButton}>
              <Ionicons name="chevron-back" size={22} color="#1F5857" />
            </Pressable>
            <Text style={styles.topTitle}>Written Note</Text>
            <View style={styles.topSpacer} />
          </View>

          {showDiscardConfirm ? (
            <View style={styles.discardPanel}>
              <Text style={styles.discardTitle}>Discard this note?</Text>
              <Text style={styles.discardMessage}>
                Your current text has not been saved as evidence.
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
                  onPress={() => router.back()}
                  style={styles.dangerButton}>
                  <Text style={styles.dangerButtonText}>Discard</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.noteCard}>
            <Text style={styles.eyebrow}>NOTE</Text>
            <TextInput
              multiline
              onChangeText={(value) => {
                setNoteText(value);
                setShowDiscardConfirm(false);
              }}
              placeholder="Write what happened..."
              placeholderTextColor="#9BA6A4"
              style={styles.noteInput}
              textAlignVertical="top"
              value={noteText}
            />
          </View>

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
                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save written note</Text>
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
  noteCard: {
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
  noteInput: {
    color: '#102120',
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    minHeight: 190,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 26,
  },
  sectionTitle: {
    color: '#A7ADAF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1,
  },
  inlineLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  loadingText: {
    color: '#71807E',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
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
  incidentList: {
    gap: 10,
    marginTop: 14,
  },
  incidentCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 82,
    padding: 14,
  },
  incidentCardSelected: {
    borderColor: '#1F5857',
    borderWidth: 2,
  },
  incidentIcon: {
    alignItems: 'center',
    backgroundColor: '#EAF3F1',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  incidentText: {
    flex: 1,
    marginLeft: 13,
  },
  incidentMeta: {
    color: '#8D9998',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  incidentTitle: {
    color: '#081615',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    marginTop: 3,
  },
  incidentDetail: {
    color: '#8D9998',
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    marginTop: 3,
  },
  newIncidentToggle: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    paddingVertical: 8,
  },
  newIncidentToggleText: {
    color: '#1F5857',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
  },
  createCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    padding: 16,
  },
  createTitle: {
    color: '#102120',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
  },
  inputLabel: {
    color: '#8D9998',
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#F8FAF9',
    borderColor: '#E0E7E5',
    borderRadius: 12,
    borderWidth: 1,
    color: '#102120',
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    marginTop: 7,
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  descriptionInput: {
    minHeight: 86,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  typeChip: {
    backgroundColor: '#F8FAF9',
    borderColor: '#E0E7E5',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typeChipSelected: {
    backgroundColor: '#1F5857',
    borderColor: '#1F5857',
  },
  typeChipText: {
    color: '#52615F',
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
  },
  typeChipTextSelected: {
    color: '#FFFFFF',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1F5857',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 48,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
  },
  selectedPanel: {
    alignItems: 'center',
    backgroundColor: '#EAF3F1',
    borderRadius: 14,
    flexDirection: 'row',
    marginTop: 18,
    padding: 14,
  },
  selectedText: {
    flex: 1,
    marginLeft: 10,
  },
  selectedLabel: {
    color: '#71807E',
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
  },
  selectedTitle: {
    color: '#102120',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    marginTop: 2,
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
