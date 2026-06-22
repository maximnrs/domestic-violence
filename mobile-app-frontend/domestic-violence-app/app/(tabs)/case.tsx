import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  getCases,
  listIncidents,
  type CaseResponse,
  type IncidentResponse,
  type IncidentType,
} from '@/services/api';
import { incidentTypes, normalizeOptional, normalizeTime, todayIsoDate } from '@/utils/incidents';

function formatIncidentType(type: IncidentResponse['incident_type']) {
  if (!type) {
    return 'Incident';
  }

  return `${type.charAt(0).toUpperCase()}${type.slice(1)} incident`;
}

function formatIncidentMeta(incident: IncidentResponse) {
  const date = incident.incident_date ?? incident.creation_date;
  const time = incident.incident_time ? ` · ${incident.incident_time.slice(0, 5)}` : '';
  return `${date}${time}`;
}

function getIncidentDetail(incident: IncidentResponse) {
  if (incident.location) {
    return incident.location;
  }

  if (incident.description) {
    return incident.description;
  }

  return 'No additional details recorded.';
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

export default function CaseScreen() {
  const [caseInfo, setCaseInfo] = useState<CaseResponse | null>(null);
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [caseError, setCaseError] = useState<string | null>(null);
  const [incidentError, setIncidentError] = useState<string | null>(null);
  const [isCaseLoading, setIsCaseLoading] = useState(true);
  const [isIncidentLoading, setIsIncidentLoading] = useState(false);
  const [isCreatingIncident, setIsCreatingIncident] = useState(false);
  const [showCreateIncident, setShowCreateIncident] = useState(false);
  const [newIncidentDate, setNewIncidentDate] = useState(todayIsoDate);
  const [newIncidentTime, setNewIncidentTime] = useState('');
  const [newIncidentLocation, setNewIncidentLocation] = useState('');
  const [newIncidentDescription, setNewIncidentDescription] = useState('');
  const [newIncidentType, setNewIncidentType] = useState<IncidentType>('other');

  const loadCaseAndIncidents = useCallback(async () => {
    setIsCaseLoading(true);
    setIsIncidentLoading(false);
    setCaseError(null);
    setIncidentError(null);
    setCaseInfo(null);
    setIncidents([]);

    try {
      const cases = await getCases();
    
      console.log('Retrieved cases:', cases);

      if (cases.length === 0) {
        setCaseInfo(null);
        setIsCaseLoading(false);
        return;
      }
    
      const currentCase = cases[0];
    
      setCaseInfo(currentCase);
      setIsCaseLoading(false);
      setIsIncidentLoading(true);
    
      try {
        const nextIncidents = await listIncidents(currentCase.case_id);
        setIncidents(nextIncidents);
      } catch (error) {
        setIncidentError(
          error instanceof Error ? error.message : 'Unable to load incidents.'
        );
      } finally {
        setIsIncidentLoading(false);
      }
    } catch (error) {
      setCaseError(
        error instanceof Error
          ? error.message
          : 'Unable to load your case.'
      );
      setIsCaseLoading(false);
    }
  }, []);

  const reloadIncidents = useCallback(async () => {
    if (!caseInfo) {
      return;
    }

    setIsIncidentLoading(true);
    setIncidentError(null);

    try {
      const nextIncidents = await listIncidents(caseInfo.case_id);
      setIncidents(nextIncidents);
    } catch (error) {
      setIncidentError(error instanceof Error ? error.message : 'Unable to load incidents.');
    } finally {
      setIsIncidentLoading(false);
    }
  }, [caseInfo]);

  useEffect(() => {
    loadCaseAndIncidents();
  }, [loadCaseAndIncidents]);

  function openIncident(incident: IncidentResponse) {
    router.push(`/incidents/${incident.incident_id}` as Href);
  }

  function toggleCreateIncident() {
    setShowCreateIncident((current) => !current);
    setIncidentError(null);
  }

  async function handleCreateIncident() {
    if (!caseInfo) {
      setIncidentError('Your case must load before an incident can be created.');
      return;
    }

    if (newIncidentDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(newIncidentDate.trim())) {
      setIncidentError('Use YYYY-MM-DD for incident date.');
      return;
    }

    setIncidentError(null);

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
      setShowCreateIncident(false);
      setNewIncidentDate(todayIsoDate());
      setNewIncidentTime('');
      setNewIncidentLocation('');
      setNewIncidentDescription('');
      setNewIncidentType('other');
    } catch (error) {
      setIncidentError(error instanceof Error ? error.message : 'Unable to create incident.');
    } finally {
      setIsCreatingIncident(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>CASE</Text>
            <Text style={styles.title}>My Case</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="folder-open-outline" size={25} color="#1F5857" />
          </View>
        </View>

        {isCaseLoading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color="#1F5857" />
            <Text style={styles.loadingText}>Loading your case...</Text>
          </View>
        ) : null}

        {!isCaseLoading && caseError ? (
          <StatusPanel
            actionLabel="Try again"
            icon="alert-circle-outline"
            message={caseError}
            onAction={loadCaseAndIncidents}
            title="Case unavailable"
          />
        ) : null}

        {!isCaseLoading && !caseError && !caseInfo ? (
          <StatusPanel
            actionLabel="Try again"
            icon="folder-outline"
            message="Your account does not have a retrievable case yet."
            onAction={loadCaseAndIncidents}
            title="No case found"
          />
        ) : null}

        {caseInfo ? (
          <>
            <View style={styles.caseSummary}>
              <Text style={styles.caseTitle}>{caseInfo.case_title}</Text>
              <Text style={styles.caseMeta}>Created {caseInfo.creation_date}</Text>
              {caseInfo.description ? (
                <Text style={styles.caseDescription}>{caseInfo.description}</Text>
              ) : null}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>INCIDENTS</Text>
              <View style={styles.sectionActions}>
                <Pressable
                  accessibilityLabel="Refresh incidents"
                  accessibilityRole="button"
                  onPress={reloadIncidents}
                  style={styles.iconButton}>
                  <Ionicons name="refresh" size={19} color="#79908E" />
                </Pressable>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={toggleCreateIncident}
              style={styles.newIncidentToggle}>
              <Ionicons
                name={showCreateIncident ? 'remove-circle-outline' : 'add-circle-outline'}
                size={19}
                color="#1F5857"
              />
              <Text style={styles.newIncidentToggleText}>
                {showCreateIncident ? 'Hide new incident' : 'Create new incident'}
              </Text>
            </Pressable>

            {showCreateIncident ? (
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

            {isIncidentLoading ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator color="#1F5857" />
                <Text style={styles.loadingText}>Loading incidents...</Text>
              </View>
            ) : null}

            {!isIncidentLoading && incidentError ? (
              <StatusPanel
                actionLabel="Retry"
                icon="warning-outline"
                message={incidentError}
                onAction={reloadIncidents}
                title="Incidents unavailable"
              />
            ) : null}

            {!isIncidentLoading && !incidentError && incidents.length === 0 ? (
              <StatusPanel
                icon="folder-open-outline"
                message="No incidents have been recorded for this case."
                title="Nothing here yet"
              />
            ) : null}

            {!isIncidentLoading && !incidentError && incidents.length > 0 ? (
              <View style={styles.incidentList}>
                {incidents.map((incident) => (
                  <Pressable
                    accessibilityRole="button"
                    key={incident.incident_id}
                    onPress={() => openIncident(incident)}
                    style={styles.incidentCard}>
                    <View style={styles.folderIcon}>
                      <Ionicons name="folder-outline" size={23} color="#1F5857" />
                    </View>
                    <View style={styles.incidentText}>
                      <Text style={styles.incidentMeta}>{formatIncidentMeta(incident)}</Text>
                      <Text style={styles.incidentTitle}>{formatIncidentType(incident.incident_type)}</Text>
                      <Text numberOfLines={2} style={styles.incidentDetail}>
                        {getIncidentDetail(incident)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={19} color="#CAD3D1" />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
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
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: '#8D9998',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1,
  },
  title: {
    color: '#102120',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 30,
    marginTop: 4,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: '#EAF3F1',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  loadingBlock: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 28,
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
  caseSummary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 24,
    padding: 18,
  },
  caseTitle: {
    color: '#081615',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 20,
  },
  caseMeta: {
    color: '#8D9998',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    marginTop: 6,
  },
  caseDescription: {
    color: '#71807E',
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 26,
  },
  sectionActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  sectionTitle: {
    color: '#A7ADAF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1,
  },
  newIncidentToggle: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
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
  buttonDisabled: {
    opacity: 0.64,
  },
  incidentList: {
    gap: 12,
    marginTop: 14,
  },
  incidentCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7ECEA',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    minHeight: 94,
    padding: 16,
    shadowColor: '#16312F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  folderIcon: {
    alignItems: 'center',
    backgroundColor: '#EAF3F1',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  incidentText: {
    flex: 1,
    marginLeft: 14,
  },
  incidentMeta: {
    color: '#8D9998',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  incidentTitle: {
    color: '#081615',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    marginTop: 3,
  },
  incidentDetail: {
    color: '#8D9998',
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
});
