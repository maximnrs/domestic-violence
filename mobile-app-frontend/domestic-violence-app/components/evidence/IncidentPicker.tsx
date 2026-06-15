import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { IncidentResponse, IncidentType } from '@/services/api';
import { formatIncidentMeta, formatIncidentType, incidentTypes } from '@/utils/incidents';
import { StatusPanel } from './StatusPanel';

type IncidentPickerProps = {
  contextError: string | null;
  incidentError: string | null;
  incidents: IncidentResponse[];
  isContextLoading: boolean;
  isCreatingIncident: boolean;
  isIncidentLoading: boolean;
  loadContext: () => void;
  newIncidentDate: string;
  newIncidentDescription: string;
  newIncidentLocation: string;
  newIncidentTime: string;
  newIncidentType: IncidentType;
  onCreateIncident: () => void;
  onIncidentSelected?: () => void;
  refreshEvidenceTypes: () => void;
  selectedIncident: IncidentResponse | null;
  selectedIncidentId: number | null;
  selectIncident: (incidentId: number) => void;
  setIncidentError: (message: string | null) => void;
  setNewIncidentDate: (value: string) => void;
  setNewIncidentDescription: (value: string) => void;
  setNewIncidentLocation: (value: string) => void;
  setNewIncidentTime: (value: string) => void;
  setNewIncidentType: (value: IncidentType) => void;
  showCreateIncident: boolean;
  toggleCreateIncident: () => void;
  typeError: string | null;
};

export function IncidentPicker({
  contextError,
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
  onCreateIncident,
  onIncidentSelected,
  refreshEvidenceTypes,
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
}: IncidentPickerProps) {
  return (
    <>
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
                  selectIncident(incident.incident_id);
                  onIncidentSelected?.();
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
            toggleCreateIncident();
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
                style={[styles.typeChip, newIncidentType === type ? styles.typeChipSelected : null]}>
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
            onPress={onCreateIncident}
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
    </>
  );
}

const styles = StyleSheet.create({
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
  buttonDisabled: {
    opacity: 0.64,
  },
});
