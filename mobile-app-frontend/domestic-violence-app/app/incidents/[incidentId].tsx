import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  downloadEvidence,
  getEvidenceTypes,
  getIncident,
  listIncidentEvidence,
  type EvidenceResponse,
  type EvidenceTypeResponse,
  type IncidentResponse,
} from '@/services/api';

const WRITTEN_NOTE_TYPE_NAME = 'written_note';
const VOICE_AUDIO_TYPE_NAME = 'audio';
const CAMERA_EVIDENCE_TYPE_NAME = 'video';

function formatIncidentType(type: IncidentResponse['incident_type']) {
  if (!type) {
    return 'Incident';
  }

  return `${type.charAt(0).toUpperCase()}${type.slice(1)} incident`;
}

function formatDateTime(date: string | null, time?: string | null) {
  if (!date) {
    return 'Date not recorded';
  }

  return time ? `${date} · ${time.slice(0, 5)}` : date;
}

function formatReadableTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  const numericValue = Number(trimmedValue);
  const date =
    /^\d{10}$/.test(trimmedValue) || /^\d{13}$/.test(trimmedValue)
      ? new Date(/^\d{10}$/.test(trimmedValue) ? numericValue * 1000 : numericValue)
      : new Date(trimmedValue.replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1'));

  if (Number.isNaN(date.getTime())) {
    return trimmedValue;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getEvidenceTitle(typeName: string | undefined, fileName: string) {
  if (typeName === WRITTEN_NOTE_TYPE_NAME) {
    return 'Written note';
  }

  if (typeName === VOICE_AUDIO_TYPE_NAME) {
    return 'Voice note';
  }

  if (typeName === CAMERA_EVIDENCE_TYPE_NAME) {
    return fileName.toLowerCase().includes('photo') ? 'Photo evidence' : 'Video evidence';
  }

  return fileName || 'Evidence item';
}

function getEvidenceIconName(typeName: string | undefined): keyof typeof Ionicons.glyphMap {
  if (typeName === WRITTEN_NOTE_TYPE_NAME) {
    return 'document-text-outline';
  }

  if (typeName === VOICE_AUDIO_TYPE_NAME) {
    return 'mic-outline';
  }

  if (typeName === CAMERA_EVIDENCE_TYPE_NAME) {
    return 'camera-outline';
  }

  return 'document-outline';
}

function formatEvidenceType(typeName: string | undefined) {
  if (!typeName) {
    return null;
  }

  return typeName
    .split('_')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function formatTrustedTimestamp(item: EvidenceResponse) {
  if (!item.timestamp_time) {
    return null;
  }

  return formatReadableTimestamp(item.timestamp_time);
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
        <Ionicons name={icon} size={24} color="#1F5857" />
      </View>
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.statusMessage}>{message}</Text>
      {onAction && actionLabel ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MetadataRow({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return null;
  }

  return (
    <View style={styles.metadataRow}>
      <Text style={styles.metadataLabel}>{label}</Text>
      <Text style={styles.metadataValue}>{value}</Text>
    </View>
  );
}

function decodeHexUtf8(hex: string) {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) {
    throw new Error('Downloaded note data is not valid hex.');
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(bytes);
  }

  let output = '';

  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];

    if (byte < 0x80) {
      output += String.fromCharCode(byte);
    } else if (byte >= 0xc0 && byte < 0xe0) {
      const next = bytes[index + 1];
      output += String.fromCharCode(((byte & 0x1f) << 6) | (next & 0x3f));
      index += 1;
    } else if (byte >= 0xe0 && byte < 0xf0) {
      const next = bytes[index + 1];
      const third = bytes[index + 2];
      output += String.fromCharCode(
        ((byte & 0x0f) << 12) | ((next & 0x3f) << 6) | (third & 0x3f)
      );
      index += 2;
    } else {
      const next = bytes[index + 1];
      const third = bytes[index + 2];
      const fourth = bytes[index + 3];
      let codePoint =
        ((byte & 0x07) << 18) |
        ((next & 0x3f) << 12) |
        ((third & 0x3f) << 6) |
        (fourth & 0x3f);
      codePoint -= 0x10000;
      output += String.fromCharCode(
        0xd800 + ((codePoint >> 10) & 0x3ff),
        0xdc00 + (codePoint & 0x3ff)
      );
      index += 3;
    }
  }

  return output;
}

export default function IncidentDetailScreen() {
  const { evidenceId, incidentId, refresh } = useLocalSearchParams<{
    evidenceId?: string;
    incidentId?: string;
    refresh?: string;
  }>();
  const scrollViewRef = useRef<ScrollView>(null);
  const parsedIncidentId = useMemo(() => Number(incidentId), [incidentId]);
  const targetedEvidenceId = useMemo(() => {
    const parsedEvidenceId = Number(evidenceId);
    return Number.isFinite(parsedEvidenceId) && parsedEvidenceId > 0 ? parsedEvidenceId : null;
  }, [evidenceId]);
  const hasValidIncidentId = Number.isFinite(parsedIncidentId) && parsedIncidentId > 0;

  const [incident, setIncident] = useState<IncidentResponse | null>(null);
  const [evidence, setEvidence] = useState<EvidenceResponse[]>([]);
  const [evidenceTypes, setEvidenceTypes] = useState<EvidenceTypeResponse[]>([]);
  const [incidentError, setIncidentError] = useState<string | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [evidenceTypeError, setEvidenceTypeError] = useState<string | null>(null);
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<number | null>(null);
  const [loadingNoteId, setLoadingNoteId] = useState<number | null>(null);
  const [noteContentById, setNoteContentById] = useState<Record<number, string>>({});
  const [noteErrorById, setNoteErrorById] = useState<Record<number, string>>({});
  const [isIncidentLoading, setIsIncidentLoading] = useState(true);
  const [isEvidenceLoading, setIsEvidenceLoading] = useState(false);

  const evidenceTypeNameById = useMemo(() => {
    return evidenceTypes.reduce<Record<number, string>>((typesById, evidenceType) => {
      typesById[evidenceType.evidence_type_id] = evidenceType.type_name;
      return typesById;
    }, {});
  }, [evidenceTypes]);

  const loadIncident = useCallback(async () => {
    if (!hasValidIncidentId) {
      setIncidentError('Incident ID is missing or invalid.');
      setIsIncidentLoading(false);
      return;
    }

    setIsIncidentLoading(true);
    setIncidentError(null);

    try {
      const nextIncident = await getIncident(parsedIncidentId);
      setIncident(nextIncident);
    } catch (error) {
      setIncidentError(error instanceof Error ? error.message : 'Unable to load incident.');
    } finally {
      setIsIncidentLoading(false);
    }
  }, [hasValidIncidentId, parsedIncidentId]);

  const loadEvidence = useCallback(async () => {
    if (!hasValidIncidentId) {
      return;
    }

    setIsEvidenceLoading(true);
    setEvidenceError(null);

    try {
      const nextEvidence = await listIncidentEvidence(parsedIncidentId);
      setEvidence(nextEvidence);
    } catch (error) {
      setEvidenceError(error instanceof Error ? error.message : 'Unable to load evidence.');
    } finally {
      setIsEvidenceLoading(false);
    }
  }, [hasValidIncidentId, parsedIncidentId]);

  const loadEvidenceTypes = useCallback(async () => {
    setEvidenceTypeError(null);

    try {
      const nextEvidenceTypes = await getEvidenceTypes();
      setEvidenceTypes(nextEvidenceTypes);
    } catch (error) {
      setEvidenceTypes([]);
      setEvidenceTypeError(
        error instanceof Error ? error.message : 'Unable to load evidence types.'
      );
    }
  }, []);

  useEffect(() => {
    loadIncident();
    loadEvidence();
    loadEvidenceTypes();
  }, [loadEvidence, loadEvidenceTypes, loadIncident, refresh]);

  const loadWrittenNoteContent = useCallback(async (item: EvidenceResponse) => {
    if (noteContentById[item.evidence_id]) {
      return;
    }

    setLoadingNoteId(item.evidence_id);
    setNoteErrorById((current) => ({ ...current, [item.evidence_id]: '' }));

    try {
      const downloadedEvidence = await downloadEvidence(item.evidence_id);
      const decodedText = decodeHexUtf8(downloadedEvidence.data);
      setNoteContentById((current) => ({
        ...current,
        [item.evidence_id]: decodedText,
      }));
    } catch (error) {
      setNoteErrorById((current) => ({
        ...current,
        [item.evidence_id]:
          error instanceof Error ? error.message : 'Unable to load written note content.',
      }));
    } finally {
      setLoadingNoteId(null);
    }
  }, [noteContentById]);

  async function openWrittenNote(item: EvidenceResponse) {
    if (expandedEvidenceId === item.evidence_id) {
      setExpandedEvidenceId(null);
      return;
    }

    setExpandedEvidenceId(item.evidence_id);
    await loadWrittenNoteContent(item);
  }

  useEffect(() => {
    if (!targetedEvidenceId || evidence.length === 0) {
      return;
    }

    const targetedEvidence = evidence.find((item) => item.evidence_id === targetedEvidenceId);

    if (!targetedEvidence) {
      return;
    }

    setExpandedEvidenceId(targetedEvidenceId);

    if (evidenceTypeNameById[targetedEvidence.evidence_type_id] === WRITTEN_NOTE_TYPE_NAME) {
      void loadWrittenNoteContent(targetedEvidence);
    }
  }, [evidence, evidenceTypeNameById, loadWrittenNoteContent, targetedEvidenceId]);

  function handleEvidenceCardLayout(evidenceId: number, y: number) {
    if (targetedEvidenceId !== evidenceId) {
      return;
    }

    scrollViewRef.current?.scrollTo({
      animated: true,
      y: Math.max(0, y - 18),
    });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityLabel="Back to case"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}>
            <Ionicons name="chevron-back" size={22} color="#1F5857" />
          </Pressable>
          <Text style={styles.topTitle}>Incident</Text>
          <View style={styles.topSpacer} />
        </View>

        {isIncidentLoading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color="#1F5857" />
            <Text style={styles.loadingText}>Loading incident...</Text>
          </View>
        ) : null}

        {!isIncidentLoading && incidentError ? (
          <StatusPanel
            actionLabel="Try again"
            icon="alert-circle-outline"
            message={incidentError}
            onAction={loadIncident}
            title="Incident unavailable"
          />
        ) : null}

        {incident ? (
          <View style={styles.incidentSummary}>
            <Text style={styles.eyebrow}>INCIDENT DETAILS</Text>
            <Text style={styles.title}>{formatIncidentType(incident.incident_type)}</Text>
            <MetadataRow
              label="Occurred"
              value={formatDateTime(incident.incident_date, incident.incident_time)}
            />
            <MetadataRow label="Location" value={incident.location} />
            <MetadataRow label="Created" value={formatReadableTimestamp(incident.creation_date)} />
            {incident.description ? (
              <Text style={styles.description}>{incident.description}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>EVIDENCE METADATA</Text>
          <Pressable accessibilityRole="button" onPress={loadEvidence}>
            <Ionicons name="refresh" size={19} color="#79908E" />
          </Pressable>
        </View>

        {isEvidenceLoading ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color="#1F5857" />
            <Text style={styles.loadingText}>Loading evidence...</Text>
          </View>
        ) : null}

        {!isEvidenceLoading && evidenceError ? (
          <StatusPanel
            actionLabel="Retry"
            icon="warning-outline"
            message={evidenceError}
            onAction={loadEvidence}
            title="Evidence unavailable"
          />
        ) : null}

        {!isEvidenceLoading && !evidenceError && evidenceTypeError ? (
          <StatusPanel
            actionLabel="Retry"
            icon="warning-outline"
            message={evidenceTypeError}
            onAction={loadEvidenceTypes}
            title="Evidence types unavailable"
          />
        ) : null}

        {!isEvidenceLoading && !evidenceError && evidence.length === 0 ? (
          <StatusPanel
            icon="documents-outline"
            message="No evidence metadata is attached to this incident."
            title="No evidence yet"
          />
        ) : null}

        {!isEvidenceLoading && !evidenceError && evidence.length > 0 ? (
          <View style={styles.evidenceList}>
            {evidence.map((item) => {
              const typeName = evidenceTypeNameById[item.evidence_type_id];
              const isWrittenNote = typeName === WRITTEN_NOTE_TYPE_NAME;
              const isVoiceNote = typeName === VOICE_AUDIO_TYPE_NAME;
              const isTargetedEvidence = targetedEvidenceId === item.evidence_id;
              const expanded = expandedEvidenceId === item.evidence_id;
              const noteContent = noteContentById[item.evidence_id];
              const noteError = noteErrorById[item.evidence_id];
              const evidenceTitle = getEvidenceTitle(typeName, item.file_name);
              const trustedTimestamp = formatTrustedTimestamp(item);
              const evidenceTypeLabel = formatEvidenceType(typeName);

              return (
                <Pressable
                  accessibilityRole={isWrittenNote ? 'button' : undefined}
                  key={item.evidence_id}
                  onLayout={(event) =>
                    handleEvidenceCardLayout(item.evidence_id, event.nativeEvent.layout.y)
                  }
                  onPress={isWrittenNote ? () => openWrittenNote(item) : undefined}
                  style={[styles.evidenceCard, isTargetedEvidence ? styles.evidenceCardActive : null]}>
                  <View style={styles.evidenceIcon}>
                    <Ionicons
                      name={getEvidenceIconName(typeName)}
                      size={22}
                      color="#1F5857"
                    />
                  </View>
                  <View style={styles.evidenceText}>
                    <View style={styles.evidenceTitleRow}>
                      <Text style={styles.evidenceTitle}>{evidenceTitle}</Text>
                      {isWrittenNote ? (
                        <Ionicons
                          name={expanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color="#79908E"
                        />
                      ) : null}
                    </View>
                    <Text style={styles.evidenceMeta}>
                      Created {trustedTimestamp ?? formatReadableTimestamp(item.created_at)}
                    </Text>
                    <Text style={styles.evidenceMeta}>
                      {evidenceTypeLabel
                        ? `Type ${evidenceTypeLabel}`
                        : `Type ID #${item.evidence_type_id}`}
                    </Text>
                    {(isWrittenNote || isVoiceNote) && item.file_name ? (
                      <Text style={styles.evidenceMeta}>File {item.file_name}</Text>
                    ) : null}
                    {item.description ? (
                      <Text style={styles.evidenceDescription}>{item.description}</Text>
                    ) : null}
                    <MetadataRow label="Location" value={item.evidence_location} />
                    <MetadataRow label="Device" value={item.evidence_device} />
                    <MetadataRow label="IMEI" value={item.evidence_imei} />
                    <MetadataRow label="Activation" value={item.evidence_activation} />
                    {isWrittenNote && expanded ? (
                      <View style={styles.noteContentPanel}>
                        {loadingNoteId === item.evidence_id ? (
                          <View style={styles.inlineLoading}>
                            <ActivityIndicator color="#1F5857" />
                            <Text style={styles.loadingText}>Loading note...</Text>
                          </View>
                        ) : null}
                        {noteContent ? <Text style={styles.noteContent}>{noteContent}</Text> : null}
                        {noteError ? (
                          <>
                            <Text style={styles.noteError}>{noteError}</Text>
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => loadWrittenNoteContent(item)}
                              style={styles.retryButton}>
                              <Text style={styles.retryButtonText}>Retry</Text>
                            </Pressable>
                          </>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5F7F5',
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
  loadingBlock: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 24,
    padding: 22,
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
    padding: 22,
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
    fontSize: 17,
    marginTop: 12,
    textAlign: 'center',
  },
  statusMessage: {
    color: '#71807E',
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1F5857',
    borderRadius: 14,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
  },
  incidentSummary: {
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
  title: {
    color: '#081615',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 24,
    lineHeight: 31,
    marginTop: 7,
  },
  description: {
    color: '#102120',
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
  },
  metadataRow: {
    marginTop: 10,
  },
  metadataLabel: {
    color: '#8D9998',
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
  },
  metadataValue: {
    color: '#102120',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
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
  evidenceList: {
    gap: 12,
    marginTop: 14,
  },
  evidenceCard: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 16,
  },
  evidenceCardActive: {
    backgroundColor: '#F7FBFA',
    borderColor: '#75AFA4',
    borderWidth: 2,
  },
  evidenceIcon: {
    alignItems: 'center',
    backgroundColor: '#EAF3F1',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  evidenceText: {
    flex: 1,
    marginLeft: 14,
  },
  evidenceTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  evidenceTitle: {
    color: '#081615',
    flex: 1,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
  },
  evidenceMeta: {
    color: '#8D9998',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    marginTop: 4,
  },
  evidenceDescription: {
    color: '#71807E',
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  noteContentPanel: {
    backgroundColor: '#F8FAF9',
    borderColor: '#E0E7E5',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    padding: 13,
  },
  noteContent: {
    color: '#102120',
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 21,
  },
  noteError: {
    color: '#B84E58',
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    lineHeight: 19,
  },
});
