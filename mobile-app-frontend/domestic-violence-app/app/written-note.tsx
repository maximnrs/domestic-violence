import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

import {
  createIncident,
  getEvidenceTypes,
  getCases,
  listIncidents,
  uploadEvidence,
  type CaseResponse,
  type EvidenceTypeResponse,
  type IncidentResponse,
  type IncidentType,
} from '@/services/api';

const WRITTEN_NOTE_TYPE_NAME = 'written_note';

const incidentTypes: IncidentType[] = [
  'other',
  'verbal',
  'physical',
  'psychological',
  'financial',
  'sexual',
  'stalking',
];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatIncidentType(type: IncidentResponse['incident_type']) {
  if (!type) {
    return 'Incident';
  }

  return `${type.charAt(0).toUpperCase()}${type.slice(1)} incident`;
}

function formatIncidentMeta(incident: IncidentResponse) {
  const date = incident.incident_date ?? incident.creation_date;
  const time = incident.incident_time ? ` - ${incident.incident_time.slice(0, 5)}` : '';
  return `${date}${time}`;
}

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeTime(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  throw new Error('Use HH:mm for incident time.');
}

type StatusPanelProps = {
  actionLabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  onAction?: () => void;
  title: string;
};

function StatusPanel({ actionLabel, icon, message, onAction, title }: StatusPanelProps) {
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

export default function WrittenNoteScreen() {
  const [caseInfo, setCaseInfo] = useState<CaseResponse | null>(null);
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [evidenceTypes, setEvidenceTypes] = useState<EvidenceTypeResponse[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');
  const [contextError, setContextError] = useState<string | null>(null);
  const [incidentError, setIncidentError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isContextLoading, setIsContextLoading] = useState(true);
  const [isIncidentLoading, setIsIncidentLoading] = useState(false);
  const [isCreatingIncident, setIsCreatingIncident] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateIncident, setShowCreateIncident] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [newIncidentDate, setNewIncidentDate] = useState(todayIsoDate);
  const [newIncidentTime, setNewIncidentTime] = useState('');
  const [newIncidentLocation, setNewIncidentLocation] = useState('');
  const [newIncidentDescription, setNewIncidentDescription] = useState('');
  const [newIncidentType, setNewIncidentType] = useState<IncidentType>('other');

  const selectedIncident = useMemo(
    () => incidents.find((incident) => incident.incident_id === selectedIncidentId) ?? null,
    [incidents, selectedIncidentId]
  );

  const hasUnsavedText = noteText.trim().length > 0;

  const loadContext = useCallback(async () => {
    setIsContextLoading(true);
    setContextError(null);
    setIncidentError(null);
    setTypeError(null);
    setCaseInfo(null);
    setIncidents([]);
    setSelectedIncidentId(null);

    const [caseResult, typeResult] = await Promise.allSettled([getCases(), getEvidenceTypes()]);

    if (typeResult.status === 'fulfilled') {
      setEvidenceTypes(typeResult.value);
    } else {
      setEvidenceTypes([]);
      setTypeError(
        typeResult.reason instanceof Error
          ? typeResult.reason.message
          : 'Unable to load evidence types.'
      );
    }

    if (caseResult.status === 'rejected') {
      setContextError(
        caseResult.reason instanceof Error ? caseResult.reason.message : 'Unable to load your case.'
      );
      setIsContextLoading(false);
      return;
    }

    const currentCase = caseResult.value[0];
    setCaseInfo(currentCase);
    setIsContextLoading(false);
    setIsIncidentLoading(true);

    try {
      const nextIncidents = await listIncidents(currentCase.case_id);
      setIncidents(nextIncidents);
      setSelectedIncidentId(nextIncidents[0]?.incident_id ?? null);
      setShowCreateIncident(nextIncidents.length === 0);
    } catch (error) {
      setIncidentError(error instanceof Error ? error.message : 'Unable to load incidents.');
    } finally {
      setIsIncidentLoading(false);
    }
  }, []);

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

  async function refreshEvidenceTypes() {
    const nextTypes = await getEvidenceTypes();
    setEvidenceTypes(nextTypes);
    setTypeError(null);
    return nextTypes;
  }

  async function resolveWrittenNoteTypeId() {
    const types = evidenceTypes.length > 0 ? evidenceTypes : await refreshEvidenceTypes();
    const writtenNoteType = types.find((type) => type.type_name === WRITTEN_NOTE_TYPE_NAME);

    if (!writtenNoteType) {
      throw new Error('Written note evidence configuration is missing on the server.');
    }

    return writtenNoteType.evidence_type_id;
  }

  async function handleCreateIncident() {
    if (!caseInfo) {
      setIncidentError('Your case must load before an incident can be created.');
      return;
    }

    setIncidentError(null);
    setSuccessMessage(null);

    if (newIncidentDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(newIncidentDate.trim())) {
      setIncidentError('Use YYYY-MM-DD for incident date.');
      return;
    }

    try {
      setIsCreatingIncident(true);
      const createdIncident = await createIncident({
        case_id: caseInfo.case_id,
        incident_date: normalizeOptional(newIncidentDate),
        incident_time: normalizeTime(newIncidentTime),
        location: normalizeOptional(newIncidentLocation),
        incident_type: newIncidentType,
        description: normalizeOptional(newIncidentDescription),
      });

      setIncidents((current) => [createdIncident, ...current]);
      setSelectedIncidentId(createdIncident.incident_id);
      setShowCreateIncident(false);
      setNewIncidentDate(todayIsoDate());
      setNewIncidentTime('');
      setNewIncidentLocation('');
      setNewIncidentDescription('');
      setNewIncidentType('other');
      setSuccessMessage('Incident ready. Your note is still here.');
    } catch (error) {
      setIncidentError(error instanceof Error ? error.message : 'Unable to create incident.');
    } finally {
      setIsCreatingIncident(false);
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

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>INCIDENT</Text>
            <Pressable accessibilityRole="button" onPress={loadContext}>
              <Ionicons name="refresh" size={19} color="#79908E" />
            </Pressable>
          </View>

          {isContextLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color="#1F5857" />
              <Text style={styles.loadingText}>Loading your case...</Text>
            </View>
          ) : null}

          {!isContextLoading && contextError ? (
            <StatusPanel
              actionLabel="Try again"
              icon="alert-circle-outline"
              message={contextError}
              onAction={loadContext}
              title="Case unavailable"
            />
          ) : null}

          {typeError ? (
            <StatusPanel
              actionLabel="Retry"
              icon="warning-outline"
              message={typeError}
              onAction={refreshEvidenceTypes}
              title="Evidence setup unavailable"
            />
          ) : null}

          {isIncidentLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color="#1F5857" />
              <Text style={styles.loadingText}>Loading incidents...</Text>
            </View>
          ) : null}

          {incidentError ? (
            <StatusPanel
              actionLabel="Try again"
              icon="warning-outline"
              message={incidentError}
              onAction={loadContext}
              title="Incident unavailable"
            />
          ) : null}

          {!isContextLoading && !contextError && incidents.length > 0 ? (
            <View style={styles.incidentList}>
              {incidents.map((incident) => {
                const selected = incident.incident_id === selectedIncidentId;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={incident.incident_id}
                    onPress={() => {
                      setSelectedIncidentId(incident.incident_id);
                      setShowCreateIncident(false);
                      setSubmitError(null);
                    }}
                    style={[styles.incidentCard, selected ? styles.incidentCardSelected : null]}>
                    <View style={styles.incidentIcon}>
                      <Ionicons
                        name={selected ? 'checkmark-circle' : 'folder-outline'}
                        size={22}
                        color="#1F5857"
                      />
                    </View>
                    <View style={styles.incidentText}>
                      <Text style={styles.incidentMeta}>{formatIncidentMeta(incident)}</Text>
                      <Text style={styles.incidentTitle}>
                        {formatIncidentType(incident.incident_type)}
                      </Text>
                      {incident.location ? (
                        <Text style={styles.incidentDetail}>{incident.location}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {!isContextLoading && !contextError ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setShowCreateIncident((current) => !current);
                setIncidentError(null);
              }}
              style={styles.newIncidentToggle}>
              <Ionicons name="add-circle-outline" size={19} color="#1F5857" />
              <Text style={styles.newIncidentToggleText}>
                {showCreateIncident ? 'Hide new incident' : 'Create new incident'}
              </Text>
            </Pressable>
          ) : null}

          {showCreateIncident && !contextError ? (
            <View style={styles.createCard}>
              <Text style={styles.createTitle}>New incident</Text>
              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                onChangeText={setNewIncidentDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9BA6A4"
                style={styles.input}
                value={newIncidentDate}
              />
              <Text style={styles.inputLabel}>Time</Text>
              <TextInput
                onChangeText={setNewIncidentTime}
                placeholder="HH:mm"
                placeholderTextColor="#9BA6A4"
                style={styles.input}
                value={newIncidentTime}
              />
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeGrid}>
                {incidentTypes.map((type) => (
                  <Pressable
                    accessibilityRole="button"
                    key={type}
                    onPress={() => setNewIncidentType(type)}
                    style={[
                      styles.typeChip,
                      newIncidentType === type ? styles.typeChipSelected : null,
                    ]}>
                    <Text
                      style={[
                        styles.typeChipText,
                        newIncidentType === type ? styles.typeChipTextSelected : null,
                      ]}>
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                onChangeText={setNewIncidentLocation}
                placeholder="Optional"
                placeholderTextColor="#9BA6A4"
                style={styles.input}
                value={newIncidentLocation}
              />
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                multiline
                onChangeText={setNewIncidentDescription}
                placeholder="Optional"
                placeholderTextColor="#9BA6A4"
                style={[styles.input, styles.descriptionInput]}
                textAlignVertical="top"
                value={newIncidentDescription}
              />
              <Pressable
                accessibilityRole="button"
                disabled={isCreatingIncident}
                onPress={handleCreateIncident}
                style={[styles.primaryButton, isCreatingIncident ? styles.buttonDisabled : null]}>
                {isCreatingIncident ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Create incident</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          {selectedIncident ? (
            <View style={styles.selectedPanel}>
              <Ionicons name="checkmark-circle" size={20} color="#1F5857" />
              <View style={styles.selectedText}>
                <Text style={styles.selectedLabel}>Selected incident</Text>
                <Text style={styles.selectedTitle}>{formatIncidentType(selectedIncident.incident_type)}</Text>
              </View>
            </View>
          ) : null}

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
